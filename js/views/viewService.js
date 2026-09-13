import { obter, listar } from "../services/crudService.js";

export async function carregarRegistro(entity, id) {
    const identificador = String(id ?? "").trim();
    if (!identificador) throw new Error("ID não informado para visualização.");

    console.log("VIEW → CARREGAR REGISTRO:", entity, identificador);

    // A visualização usa o mesmo caminho de LISTAR já validado pelo Engine.
    // Isso evita diferenças entre a consulta individual e a consulta da tabela.
    const lista = await listar(entity, { id: identificador });
    if (Array.isArray(lista) && lista.length) {
        const encontrado = lista.find(r => String(r?.id ?? "").trim() === identificador);
        if (encontrado) return encontrado;
        return lista[0] || null;
    }

    // Fallback para compatibilidade com APIs que implementem OBTER de forma diferente.
    try {
        const resultado = await obter(entity, identificador);
        if (Array.isArray(resultado)) return resultado[0] || null;
        return resultado?.data?.[0] || resultado?.dados?.[0] || resultado || null;
    } catch (erro) {
        console.error("VIEW → ERRO AO OBTER REGISTRO:", entity, identificador, erro);
        throw erro;
    }
}

export async function carregarRelacionados(entity, campo, valor) {
    if (!valor) return [];
    try {
        const dados = await listar(entity, { [campo]: valor });
        return Array.isArray(dados) ? dados : [];
    } catch (erro) {
        console.warn(`VIEW → relacionamento ${entity}.${campo}:`, erro);
        return [];
    }
}

export function escapar(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function formatarValor(valor, campo="") {
    if (valor === null || valor === undefined || valor === "") return "—";
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
        const [y,m,d]=String(valor).split("-"); return `${d}/${m}/${y}`;
    }
    if (campo.toLowerCase().includes("valor") || campo.toLowerCase().includes("preco")) {
        const n=Number(valor); if (Number.isFinite(n)) return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
    }
    if (typeof valor === "number") return valor.toLocaleString("pt-BR");
    return String(valor);
}

export function montarMapaLabels(schema) {
    const mapa={};
    for (const campo of schema?.fields || []) {
        if (!campo?.name) continue;
        mapa[campo.name]=campo.label || campo.name;
    }
    return mapa;
}

export function identificarAnexo(valor) {
    const texto = String(valor ?? "").trim();
    if (!texto) return null;

    const lower = texto.toLowerCase();

    // Data URLs de imagem/documento.
    if (lower.startsWith("data:image/")) {
        return { tipo: "imagem", href: texto };
    }

    if (lower.startsWith("data:application/pdf")) {
        return { tipo: "pdf", href: texto };
    }

    // URLs HTTP/HTTPS, inclusive URLs do Supabase Storage.
    const ehUrl = /^https?:\/\//i.test(texto);

    // Caminhos/URLs que indicam explicitamente Storage ou arquivo.
    const ehStorage = /\/storage\/v1\/object\//i.test(texto)
        || /(^|\/)veiculos\/(?:[^/]+\/){1,3}[^/]+$/i.test(texto)
        || /(^|\/)\w+\/(?:VEI|EMP|ABA|AVA|MAN|LAN)\d{3,}/i.test(texto);

    // Extensões de imagens e documentos.
    const ehImagem = /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)(\?|#|$)/i.test(lower);
    const ehPdf = /\.pdf(\?|#|$)/i.test(lower);
    const ehDocumento = /\.(doc|docx|xls|xlsx|csv|txt|rtf|odt|ods|zip|rar)(\?|#|$)/i.test(lower);

    if (ehImagem) return { tipo: "imagem", href: texto };
    if (ehPdf) return { tipo: "pdf", href: texto };
    if (ehDocumento) return { tipo: "documento", href: texto };

    // URLs que não possuem extensão continuam sendo tratadas como links,
    // mas sem ocupar toda a largura da coluna.
    if (ehUrl || ehStorage) return { tipo: "link", href: texto };

    return null;
}

export function nomeArquivo(valor) {
    const texto = String(valor ?? "").trim();
    if (!texto) return "Arquivo";

    try {
        const url = new URL(texto, window.location.href);
        const partes = decodeURIComponent(url.pathname).split("/").filter(Boolean);
        const nome = partes.at(-1);
        if (nome && nome.length <= 120) return nome;
    } catch (_) {
        // Caminho relativo ou valor não-URL.
    }

    const partes = texto.split(/[\\/]/).filter(Boolean);
    return partes.at(-1) || "Arquivo";
}

export function rotuloAnexo(valor, label = "Arquivo") {
    const nome = nomeArquivo(valor);
    if (!nome || nome === "Arquivo") return label;
    return `${label} — ${nome}`;
}

export function renderizarAnexo(url, label = "Anexo") {
    const href = String(url ?? "").trim();
    if (!href) return "";

    const info = identificarAnexo(href);
    if (!info) return `<span class="view-file-text">${escapar(formatarValor(href))}</span>`;

    const safe = escapar(href);
    const nome = escapar(nomeArquivo(href));
    const titulo = escapar(label);

    if (info.tipo === "imagem") {
        return `
            <div class="view-attachment">
                <a href="${safe}" target="_blank" rel="noopener" title="${titulo}">
                    <img src="${safe}" alt="${titulo}" loading="lazy">
                </a>
                <span title="${nome}">${titulo}</span>
            </div>
        `;
    }

    const tipo = info.tipo === "pdf" ? "PDF" : info.tipo === "documento" ? "DOC" : "LINK";

    return `
        <div class="view-document" title="${nome}">
            <div class="view-document-icon">${tipo}</div>
            <div class="view-document-info">
                <strong>${titulo}</strong>
                <span class="view-document-name" title="${nome}">${nome}</span>
                <a href="${safe}" target="_blank" rel="noopener">Abrir arquivo</a>
            </div>
        </div>
    `;
}

export function renderizarValorVisual(valor, campo = "", label = "") {
    if (valor === null || valor === undefined || valor === "") return "—";

    const info = identificarAnexo(valor);
    if (info) return renderizarAnexo(valor, label || campo);

    return escapar(formatarValor(valor, campo));
}

export function renderizarCampos(registro, schema, opcoes = {}) {
    const labels = montarMapaLabels(schema);
    const excluir = new Set(opcoes.excluir || ["id"]);
    const campos = (schema?.fields || []).filter(c => c?.name && !excluir.has(c.name));
    const nomes = new Set(campos.map(c => c.name));
    const extras = Object.keys(registro || {}).filter(k => !nomes.has(k) && !excluir.has(k));
    const todos = [...campos.map(c => c.name), ...extras];

    let html = "";

    for (const nome of todos) {
        const valor = registro?.[nome];
        if (valor === undefined || valor === null || valor === "") continue;

        const label = labels[nome]
            || nome.replaceAll("_", " ").replace(/\b\w/g, m => m.toUpperCase());

        const info = identificarAnexo(valor);

        if (info) {
            html += `
                <div class="view-field view-field-file">
                    <dt>${escapar(label)}</dt>
                    <dd>${renderizarAnexo(valor, label)}</dd>
                </div>
            `;
            continue;
        }

        html += `
            <div class="view-field">
                <dt>${escapar(label)}</dt>
                <dd>${escapar(formatarValor(valor, nome))}</dd>
            </div>
        `;
    }

    return `<dl class="view-fields">${html}</dl>`;
}

export function renderizarLista(titulo, registros, schema, campos = []) {
    const labels = montarMapaLabels(schema);
    const lista = Array.isArray(registros) ? registros : [];

    if (!lista.length) {
        return `
            <section class="view-section">
                <h2>${escapar(titulo)}</h2>
                <div class="view-empty">Nenhum registro relacionado.</div>
            </section>
        `;
    }

    const colunas = campos.length
        ? campos
        : (schema?.fields || [])
            .filter(c => c?.name && !c.hidden)
            .slice(0, 6)
            .map(c => c.name);

    const head = colunas
        .map(c => `<th>${escapar(labels[c] || c)}</th>`)
        .join("");

    const rows = lista
        .map(r => `
            <tr>
                ${colunas.map(c => {
                    const valor = r?.[c];
                    const label = labels[c] || c;
                    const info = identificarAnexo(valor);

                    if (info) {
                        return `<td class="view-table-file">${renderizarAnexo(valor, label)}</td>`;
                    }

                    return `<td>${escapar(formatarValor(valor, c))}</td>`;
                }).join("")}
            </tr>
        `)
        .join("");

    return `
        <section class="view-section">
            <h2>${escapar(titulo)}</h2>
            <div class="view-table-wrap">
                <table class="view-table">
                    <thead>
                        <tr>${head}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>
    `;
}

export function calcularAlertaRevisao(registro) {
    const data=registro?.proxima_revisao;
    if (!data) return {texto:"SEM DATA", classe:"neutral"};
    const hoje=new Date(); hoje.setHours(0,0,0,0);
    const alvo=new Date(`${data}T00:00:00`);
    const dias=Math.ceil((alvo-hoje)/86400000);
    if (dias<0) return {texto:"VENCIDA", classe:"danger"};
    if (dias<=30) return {texto:"ATENÇÃO", classe:"warning"};
    return {texto:"EM DIA", classe:"ok"};
}

export function iniciarViewBase({titulo,subtitulo,container="#app"}) {
    const el=document.querySelector(container); if(!el) throw new Error("Container de visualização não encontrado.");
    el.innerHTML=`<div class="view-page"><div class="view-top"><div><div class="view-kicker">VISUALIZAÇÃO</div><h1>${escapar(titulo)}</h1><p>${escapar(subtitulo||"")}</p></div><button class="view-back" type="button" data-view-back>Voltar</button></div><div class="view-content" data-view-content><div class="view-loading">Carregando...</div></div></div>`;
    el.addEventListener("click", e=>{ if(e.target.closest("[data-view-back]")) history.length>1 ? history.back() : (window.location.href="index.html"); }, {once:false});
    return el.querySelector("[data-view-content]");
}
