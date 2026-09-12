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

export function renderizarAnexo(url, label="Anexo") {
    const href=String(url||"").trim();
    if (!href) return "";
    const safe=escapar(href);
    const lower=href.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(lower) || lower.startsWith("data:image/")) {
        return `<div class="view-attachment"><a href="${safe}" target="_blank" rel="noopener"><img src="${safe}" alt="${escapar(label)}"></a><span>${escapar(label)}</span></div>`;
    }
    return `<div class="view-document"><div class="view-document-icon">PDF</div><div><strong>${escapar(label)}</strong><a href="${safe}" target="_blank" rel="noopener">Abrir documento</a></div></div>`;
}

export function renderizarCampos(registro, schema, opcoes={}) {
    const labels=montarMapaLabels(schema);
    const excluir=new Set(opcoes.excluir || ["id"]);
    const campos=(schema?.fields||[]).filter(c => c?.name && !excluir.has(c.name));
    const nomes=new Set(campos.map(c=>c.name));
    const extras=Object.keys(registro||{}).filter(k=>!nomes.has(k) && !excluir.has(k));
    const todos=[...campos.map(c=>c.name), ...extras];
    let html="";
    for (const nome of todos) {
        const valor=registro?.[nome];
        if (valor===undefined || valor===null || valor==="") continue;
        const label=labels[nome] || nome.replaceAll("_"," ").replace(/\b\w/g,m=>m.toUpperCase());
        if (/^(foto|imagem|crlv|tag_foto|foto_neo|pontos_abastecimento|manual_digital|vista_frontal|vista_traseira|vista_lateral_direita|vista_lateral_esquerda|vista_teto)$/i.test(nome)) {
            html += renderizarAnexo(valor,label); continue;
        }
        html += `<div class="view-field"><dt>${escapar(label)}</dt><dd>${escapar(formatarValor(valor,nome))}</dd></div>`;
    }
    return `<dl class="view-fields">${html}</dl>`;
}

export function renderizarLista(titulo, registros, schema, campos=[]) {
    const labels=montarMapaLabels(schema);
    const lista=Array.isArray(registros)?registros:[];
    if (!lista.length) return `<section class="view-section"><h2>${escapar(titulo)}</h2><div class="view-empty">Nenhum registro relacionado.</div></section>`;
    const colunas=campos.length ? campos : (schema?.fields||[]).filter(c=>c?.name && !c.hidden).slice(0,6).map(c=>c.name);
    let head=colunas.map(c=>`<th>${escapar(labels[c]||c)}</th>`).join("");
    let rows=lista.map(r=>`<tr>${colunas.map(c=>`<td>${escapar(formatarValor(r?.[c],c))}</td>`).join("")}</tr>`).join("");
    return `<section class="view-section"><h2>${escapar(titulo)}</h2><div class="view-table-wrap"><table class="view-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
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
