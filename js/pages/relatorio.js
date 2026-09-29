/**
 * RELATÓRIO DE OCORRÊNCIAS — LANÇAMENTOS
 * Baseado diretamente no serviço CRUD já utilizado pelo módulo funcional.
 */
import { listar } from "../services/crudService.js";

let registros = [];
let filtrados = [];
let veiculos = [];
let empregados = [];
let opcoesVeiculos = new Map();
let opcoesEmpregados = new Map();

const CAMPOS = [
    ["data", "Data"],
    ["hora", "Hora"],
    ["empregado_matricula", "Empregado / Matrícula"],
    ["veiculo", "Veículo / Modelo"],
    ["passageiro_setor_motivo", "Passageiro / Setor / Motivo"],
    ["itinerario", "Itinerário"],
    ["horario_inicial", "Horário Inicial"],
    ["horario_final", "Horário Final"],
    ["km_inicial", "Km Inicial"],
    ["km_final", "Km Final"],
    ["distancia_percorrida", "Distância Percorrida"],
    ["duracao_atendimento", "Duração do Atendimento"],
    ["combustivel", "Combustível"],
    ["media_consumo_combustivel", "Média de Consumo"],
    ["avaliacao_visual", "Avaliação Visual"],
    ["avarias_registradas", "Avarias Registradas"],
    ["lava_car", "Lava-Car"],
    ["valor_higienizacao", "Valor Higienização"],
    ["notas_abastecimento", "Notas Abastecimento"],
    ["notas_manutencao", "Notas Manutenção"],
    ["checklist", "Checklist"],
    ["horas_extras", "Horas Extras"],
    ["revisao", "Revisão"],
    ["classificacao", "Classificação"],
    ["status", "Status"]
];

export async function iniciar() {
    console.log("RELATÓRIO → INICIANDO");
    const app = document.querySelector("#app");
    if (!app) throw new Error("#app não encontrado.");

    montarInterface(app);
    configurarEventos();
    await carregarDados();
}

function montarInterface(app) {
    app.innerHTML = `
        <section class="relatorio-page">
            <div class="relatorio-cabecalho">
                <div>
                    <h1>Relatório de Ocorrências</h1>
                    <p>Relatório baseado nos registros salvos em <strong>lancamentos</strong>.</p>
                </div>
                <div class="relatorio-acoes">
                    <button type="button" id="btnGerar" class="btn-primary">Gerar relatório</button>
                    <button type="button" id="btnLimpar" class="btn-secondary">Limpar filtros</button>
                    <button type="button" id="btnCSV" class="btn-secondary">Exportar CSV</button>
                    <button type="button" id="btnImprimir" class="btn-secondary">Imprimir / PDF</button>
                </div>
            </div>

            <section class="relatorio-filtros">
                <div class="campo-relatorio">
                    <label for="filtroDataInicial">Data inicial</label>
                    <input id="filtroDataInicial" type="date">
                </div>
                <div class="campo-relatorio">
                    <label for="filtroDataFinal">Data final</label>
                    <input id="filtroDataFinal" type="date">
                </div>
                <div class="campo-relatorio campo-largo">
                    <label for="filtroVeiculo">Veículo</label>
                    <select id="filtroVeiculo"><option value="">Todos os veículos</option></select>
                </div>
                <div class="campo-relatorio campo-largo">
                    <label for="filtroEmpregado">Empregado / Matrícula</label>
                    <select id="filtroEmpregado"><option value="">Todos os empregados</option></select>
                </div>
                <div class="campo-relatorio">
                    <label for="filtroStatus">Status</label>
                    <select id="filtroStatus"><option value="">Todos</option></select>
                </div>
                <div class="campo-relatorio campo-largo">
                    <label for="filtroTexto">Texto</label>
                    <input id="filtroTexto" type="search" placeholder="Passageiro, setor, motivo, itinerário...">
                </div>
            </section>

            <div id="relatorioMensagem" class="relatorio-mensagem" role="status"></div>

            <section class="relatorio-resumo" aria-label="Resumo">
                <div><span>Total encontrados</span><strong id="totalRegistros">0</strong></div>
                <div><span>Período</span><strong id="periodoResumo">Todos</strong></div>
            </section>

            <div class="relatorio-tabela-wrap">
                <table id="tabelaRelatorio" class="relatorio-tabela">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
        </section>
    `;
}

function configurarEventos() {
    document.querySelector("#btnGerar").addEventListener("click", aplicarFiltros);
    document.querySelector("#btnLimpar").addEventListener("click", limparFiltros);
    document.querySelector("#btnCSV").addEventListener("click", exportarCSV);
    document.querySelector("#btnImprimir").addEventListener("click", () => window.print());
    ["#filtroDataInicial", "#filtroDataFinal", "#filtroVeiculo", "#filtroEmpregado", "#filtroStatus"].forEach(selector => {
        document.querySelector(selector).addEventListener("change", aplicarFiltros);
    });
    const campoTexto = document.querySelector("#filtroTexto");
    campoTexto.addEventListener("input", aplicarFiltros);
    campoTexto.addEventListener("keydown", e => {
        if (e.key === "Enter") aplicarFiltros();
    });
}

async function carregarDados() {
    mensagem("Carregando ocorrências...", "info");
    try {
        const [lancamentos, listaVeiculos, listaEmpregados] = await Promise.allSettled([
            listar("lancamentos"),
            listar("veiculos"),
            listar("empregados")
        ]);

        if (lancamentos.status === "rejected") {
            throw lancamentos.reason;
        }

        registros = normalizarLista(lancamentos.value);
        veiculos = normalizarLista(listaVeiculos.status === "fulfilled" ? listaVeiculos.value : []);
        empregados = normalizarLista(listaEmpregados.status === "fulfilled" ? listaEmpregados.value : []);

        console.log(`RELATÓRIO → OCORRÊNCIAS CARREGADAS: ${registros.length}`);
        console.log(`RELATÓRIO → VEÍCULOS CARREGADOS: ${veiculos.length}`);
        console.log(`RELATÓRIO → EMPREGADOS CARREGADOS: ${empregados.length}`);
        preencherFiltros();
        console.log(`RELATÓRIO → OPÇÕES DE VEÍCULOS: ${opcoesVeiculos.size}`);
        console.log(`RELATÓRIO → OPÇÕES DE EMPREGADOS: ${opcoesEmpregados.size}`);
        aplicarFiltros();
        mensagem(`${registros.length} ocorrência(s) carregada(s).`, "sucesso");
    } catch (erro) {
        registros = [];
        filtrados = [];
        renderizarTabela();
        mensagem(`Não foi possível carregar o relatório: ${erro?.message || erro}`, "erro");
        console.error("RELATÓRIO → ERRO:", erro);
    }
}

function normalizarLista(valor) {
    if (Array.isArray(valor)) return valor;
    if (Array.isArray(valor?.data)) return valor.data;
    if (Array.isArray(valor?.dados)) return valor.dados;
    return [];
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function obterId(valor) {
    return String(valor ?? "").trim();
}

function mesmaChave(a, b) {
    const x = obterId(a);
    const y = obterId(b);
    return !!x && !!y && x.toLowerCase() === y.toLowerCase();
}

/*
 * Retorna o cadastro relacionado ao lançamento.
 *
 * IMPORTANTE:
 * O filtro deve usar primeiro o ID salvo em lancamentos.
 * Os campos "veiculo"/"empregado_matricula" são snapshots
 * históricos e servem somente como fallback.
 */
function obterVeiculoDoRegistro(r) {
    const idVeiculo = obterId(r?.id_veiculo);
    if (!idVeiculo) return null;

    return veiculos.find(v => mesmaChave(v?.id, idVeiculo)) || null;
}

function obterEmpregadoDoRegistro(r) {
    const idEmpregado = obterId(r?.id_empregado);
    if (!idEmpregado) return null;

    return empregados.find(e => mesmaChave(e?.id, idEmpregado)) || null;
}

function candidatosVeiculo(r) {
    const v = obterVeiculoDoRegistro(r);

    return [
        r?.id_veiculo,
        r?.veiculo,
        r?.placa,
        v?.id,
        v?.placa,
        v?.modelo,
        v?.marca_modelo_versao,
        v ? [v.placa, v.modelo || v.marca_modelo_versao]
            .filter(Boolean).join(" - ") : ""
    ].filter(x => obterId(x));
}

function candidatosEmpregado(r) {
    const e = obterEmpregadoDoRegistro(r);

    return [
        r?.id_empregado,
        r?.empregado_matricula,
        e?.id,
        e?.empregado,
        e?.nome,
        e?.nome_completo,
        e?.matricula,
        e ? [e.empregado || e.nome || e.nome_completo, e.matricula]
            .filter(Boolean).join(" / ") : ""
    ].filter(x => obterId(x));
}

/*
 * As opções do filtro representam CADASTROS, não snapshots
 * individuais de lançamentos.
 *
 * Isso evita situações como:
 *   reg:TXJ6F19
 *   cad:VEI000001
 *
 * para o mesmo veículo aparecer como duas opções diferentes.
 *
 * O valor do select passa a ser sempre:
 *   cad:<id do cadastro>
 */
function montarOpcoesEntidade(lista, registros, tipo) {
    const mapa = new Map();

    const adicionar = (id, label, candidatos = []) => {
        const chaveId = obterId(id);
        if (!chaveId) return;

        const chave = `cad:${chaveId}`;

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                id: chaveId,
                label: String(label || chaveId),
                candidatos: new Set()
            });
        }

        const item = mapa.get(chave);

        [
            chaveId,
            label,
            ...candidatos
        ].forEach(valor => {
            const normalizado = normalizarTexto(valor);
            if (normalizado) item.candidatos.add(normalizado);
        });
    };

    if (tipo === "veiculo") {
        lista.forEach(v => {
            const id = obterId(v?.id);
            if (!id) return;

            const label =
                [v?.placa, v?.modelo || v?.marca_modelo_versao]
                    .filter(Boolean)
                    .join(" - ") || id;

            adicionar(id, label, [
                v?.placa,
                v?.modelo,
                v?.marca_modelo_versao,
                label
            ]);
        });

        /*
         * Compatibilidade: se houver lançamento cujo veículo não
         * exista mais no cadastro, ainda exibimos a opção do próprio
         * lançamento para permitir localizar esse registro.
         */
        registros.forEach(r => {
            const id = obterId(r?.id_veiculo);
            if (!id) return;

            if (!mapa.has(`cad:${id}`)) {
                const label =
                    obterId(r?.veiculo) ||
                    obterId(r?.placa) ||
                    id;

                adicionar(id, label, candidatosVeiculo(r));
            } else {
                const item = mapa.get(`cad:${id}`);
                candidatosVeiculo(r).forEach(valor => {
                    const normalizado = normalizarTexto(valor);
                    if (normalizado) item.candidatos.add(normalizado);
                });
            }
        });
    } else {
        lista.forEach(e => {
            const id = obterId(e?.id);
            if (!id) return;

            const nome =
                e?.empregado ||
                e?.nome ||
                e?.nome_completo ||
                "";

            const label =
                [nome, e?.matricula]
                    .filter(Boolean)
                    .join(" / ") || id;

            adicionar(id, label, [
                e?.empregado,
                e?.nome,
                e?.nome_completo,
                e?.matricula,
                label
            ]);
        });

        /*
         * Mesmo tratamento para empregados: o ID é a referência
         * principal; o snapshot empregado_matricula é complementar.
         */
        registros.forEach(r => {
            const id = obterId(r?.id_empregado);
            if (!id) return;

            if (!mapa.has(`cad:${id}`)) {
                const label =
                    obterId(r?.empregado_matricula) ||
                    id;

                adicionar(id, label, candidatosEmpregado(r));
            } else {
                const item = mapa.get(`cad:${id}`);
                candidatosEmpregado(r).forEach(valor => {
                    const normalizado = normalizarTexto(valor);
                    if (normalizado) item.candidatos.add(normalizado);
                });
            }
        });
    }

    return mapa;
}

function preencherFiltros() {
    opcoesVeiculos = montarOpcoesEntidade(veiculos, registros, "veiculo");
    opcoesEmpregados = montarOpcoesEntidade(empregados, registros, "empregado");

    preencherSelectComMapa("#filtroVeiculo", opcoesVeiculos, "Todos os veículos");
    preencherSelectComMapa("#filtroEmpregado", opcoesEmpregados, "Todos os empregados");

    const statuses = [...new Set(registros.map(r => String(r.status ?? "").trim()).filter(Boolean))]
        .sort((a,b) => a.localeCompare(b, "pt-BR"));
    const statusSelect = document.querySelector("#filtroStatus");
    statusSelect.innerHTML = `<option value="">Todos</option>` + statuses
        .map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}

function preencherSelectComMapa(selector, mapa, primeiro) {
    const select = document.querySelector(selector);
    select.innerHTML = `<option value="">${primeiro}</option>`;
    [...mapa.entries()]
        .sort((a,b) => a[1].label.localeCompare(b[1].label, "pt-BR"))
        .forEach(([value, item]) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = item.label;
            select.appendChild(opt);
        });
}

function registroCorresponde(entidade, chaveSelecionada, registro) {
    if (!chaveSelecionada) return true;

    const mapa =
        entidade === "veiculo"
            ? opcoesVeiculos
            : opcoesEmpregados;

    const item = mapa.get(chaveSelecionada);

    if (!item) {
        console.warn(
            `RELATÓRIO → OPÇÃO ${entidade} NÃO ENCONTRADA:`,
            chaveSelecionada
        );
        return false;
    }

    /*
     * REGRA PRINCIPAL:
     * seleção "cad:<id>" deve comparar diretamente com o
     * campo relacional salvo no lançamento.
     */
    const idSelecionado = obterId(item.id);

    const idRegistro =
        entidade === "veiculo"
            ? obterId(registro?.id_veiculo)
            : obterId(registro?.id_empregado);

    if (
        idSelecionado &&
        idRegistro &&
        mesmaChave(idSelecionado, idRegistro)
    ) {
        return true;
    }

    /*
     * Fallback para dados antigos/importados que possam não ter
     * o ID relacional preenchido corretamente.
     */
    const candidatos =
        entidade === "veiculo"
            ? candidatosVeiculo(registro)
            : candidatosEmpregado(registro);

    const normalizados =
        candidatos
            .map(normalizarTexto)
            .filter(Boolean);

    const correspondePorCandidato =
        normalizados.some(c => item.candidatos.has(c));

    if (correspondePorCandidato) return true;

    /*
     * Último fallback: comparação textual controlada.
     * Evita considerar qualquer substring curta como correspondência.
     */
    const labelNormalizado =
        normalizarTexto(item.label);

    if (!labelNormalizado) return false;

    return normalizados.some(c =>
        c === labelNormalizado
    );
}

function textoDoRegistro(r) {
    const partes = [];
    for (const [campo] of CAMPOS) partes.push(r[campo]);
    partes.push(r.id, r.id_lancamento, r.id_veiculo, r.id_empregado);
    partes.push(...candidatosVeiculo(r));
    partes.push(...candidatosEmpregado(r));
    // Inclui qualquer campo adicional existente no registro, mesmo que não esteja na tabela.
    try { partes.push(JSON.stringify(r)); } catch (_) {}
    return partes.map(normalizarTexto).filter(Boolean).join(" ");
}

function aplicarFiltros() {
    const inicio = document.querySelector("#filtroDataInicial").value;
    const fim = document.querySelector("#filtroDataFinal").value;
    const veiculo = document.querySelector("#filtroVeiculo").value.trim();
    const empregado = document.querySelector("#filtroEmpregado").value.trim();
    const status = document.querySelector("#filtroStatus").value.trim().toUpperCase();
    const texto = normalizarTexto(document.querySelector("#filtroTexto").value);

    console.log("RELATÓRIO → FILTROS:", { inicio, fim, veiculo, empregado, status, texto });

    filtrados = registros.filter(r => {
        const data = String(r.data ?? "").slice(0, 10);
        if (inicio && (!data || data < inicio)) return false;
        if (fim && (!data || data > fim)) return false;
        if (veiculo && !registroCorresponde("veiculo", veiculo, r)) return false;
        if (empregado && !registroCorresponde("empregado", empregado, r)) return false;
        if (status && String(r.status ?? "").trim().toUpperCase() !== status) return false;
        if (texto && !textoDoRegistro(r).includes(texto)) return false;
        return true;
    }).sort((a,b) => `${b.data ?? ""} ${b.hora ?? ""}`.localeCompare(`${a.data ?? ""} ${a.hora ?? ""}`));

    renderizarTabela();
    console.log(`RELATÓRIO → RESULTADO: ${filtrados.length} de ${registros.length}`);
    document.querySelector("#totalRegistros").textContent = filtrados.length;
    document.querySelector("#periodoResumo").textContent = inicio || fim ? `${formatarData(inicio) || "..."} até ${formatarData(fim) || "..."}` : "Todos";
}

function renderizarTabela() {
    const thead = document.querySelector("#tabelaRelatorio thead");
    const tbody = document.querySelector("#tabelaRelatorio tbody");
    if (!thead || !tbody) return;

    thead.innerHTML = `<tr>${CAMPOS.map(([,label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>`;

    if (!filtrados.length) {
        tbody.innerHTML = `<tr><td colspan="${CAMPOS.length}" class="relatorio-vazio">Nenhuma ocorrência encontrada com os filtros informados.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(r => `<tr>${CAMPOS.map(([campo]) => `<td>${escapeHtml(formatarValor(campo, r[campo]))}</td>`).join("")}</tr>`).join("");
}

function formatarValor(campo, valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    if (campo === "data") return formatarData(String(valor).slice(0,10));
    if (["km_inicial","km_final","distancia_percorrida","media_consumo_combustivel","valor_higienizacao"].includes(campo)) return String(valor);
    return String(valor);
}

function formatarData(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return valor || "";
    const [a,m,d] = valor.split("-");
    return `${d}/${m}/${a}`;
}

function limparFiltros() {
    ["#filtroDataInicial","#filtroDataFinal","#filtroVeiculo","#filtroEmpregado","#filtroStatus","#filtroTexto"].forEach(s => {
        const el = document.querySelector(s);
        if (el) el.value = "";
    });
    aplicarFiltros();
}

function exportarCSV() {
    if (!filtrados.length) {
        alert("Não há registros para exportar.");
        return;
    }
    const linhas = [CAMPOS.map(([,label]) => csv(label))];
    filtrados.forEach(r => linhas.push(CAMPOS.map(([campo]) => csv(formatarValor(campo, r[campo])))));
    const blob = new Blob(["\ufeff" + linhas.map(l => l.join(";")).join("\r\n")], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-ocorrencias-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function csv(v) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function mensagem(texto, tipo="info") {
    const el = document.querySelector("#relatorioMensagem");
    if (!el) return;
    el.className = `relatorio-mensagem ${tipo}`;
    el.textContent = texto;
}

function escapeHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
