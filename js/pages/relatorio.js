/**
 * RELATÓRIO DE OCORRÊNCIAS — LANÇAMENTOS
 * Baseado diretamente no serviço CRUD já utilizado pelo módulo funcional.
 */
import { listar } from "../services/crudService.js";

let registros = [];
let filtrados = [];
let veiculos = [];
let empregados = [];

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
    document.querySelector("#filtroTexto").addEventListener("keydown", e => {
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

        preencherFiltros();
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

function preencherFiltros() {
    const veiculoMap = new Map();
    registros.forEach(r => {
        const id = String(r.id_veiculo ?? "").trim();
        const nome = String(r.veiculo ?? "").trim();
        if (id || nome) veiculoMap.set(id || nome, nome || id);
    });
    veiculos.forEach(v => {
        const id = String(v.id ?? "").trim();
        const nome = [v.placa, v.modelo || v.marca_modelo_versao].filter(Boolean).join(" - ");
        if (id || nome) veiculoMap.set(id || nome, nome || id);
    });

    const empregadoMap = new Map();
    registros.forEach(r => {
        const id = String(r.id_empregado ?? "").trim();
        const nome = String(r.empregado_matricula ?? "").trim();
        if (id || nome) empregadoMap.set(id || nome, nome || id);
    });
    empregados.forEach(e => {
        const id = String(e.id ?? "").trim();
        const nome = [e.empregado, e.matricula].filter(Boolean).join(" / ");
        if (id || nome) empregadoMap.set(id || nome, nome || id);
    });

    preencherSelect("#filtroVeiculo", veiculoMap, "Todos os veículos");
    preencherSelect("#filtroEmpregado", empregadoMap, "Todos os empregados");

    const statuses = [...new Set(registros.map(r => String(r.status ?? "").trim()).filter(Boolean))]
        .sort((a,b) => a.localeCompare(b, "pt-BR"));
    const statusSelect = document.querySelector("#filtroStatus");
    statusSelect.innerHTML = `<option value="">Todos</option>` + statuses.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}

function preencherSelect(selector, map, primeiro) {
    const select = document.querySelector(selector);
    const anterior = select.value;
    select.innerHTML = `<option value="">${primeiro}</option>`;
    [...map.entries()]
        .sort((a,b) => a[1].localeCompare(b[1], "pt-BR"))
        .forEach(([value,label]) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = label;
            select.appendChild(opt);
        });
    if ([...select.options].some(o => o.value === anterior)) select.value = anterior;
}

function aplicarFiltros() {
    const inicio = document.querySelector("#filtroDataInicial").value;
    const fim = document.querySelector("#filtroDataFinal").value;
    const veiculo = document.querySelector("#filtroVeiculo").value.trim();
    const empregado = document.querySelector("#filtroEmpregado").value.trim();
    const status = document.querySelector("#filtroStatus").value.trim().toUpperCase();
    const texto = document.querySelector("#filtroTexto").value.trim().toLowerCase();

    filtrados = registros.filter(r => {
        const data = String(r.data ?? "").slice(0, 10);
        if (inicio && (!data || data < inicio)) return false;
        if (fim && (!data || data > fim)) return false;

        if (veiculo && !correspondeFiltro(veiculo, r.id_veiculo, r.veiculo)) return false;
        if (empregado && !correspondeFiltro(empregado, r.id_empregado, r.empregado_matricula)) return false;
        if (status && String(r.status ?? "").trim().toUpperCase() !== status) return false;

        if (texto) {
            const haystack = CAMPOS.map(([campo]) => String(r[campo] ?? "")).join(" ").toLowerCase();
            if (!haystack.includes(texto)) return false;
        }
        return true;
    }).sort((a,b) => `${b.data ?? ""} ${b.hora ?? ""}`.localeCompare(`${a.data ?? ""} ${a.hora ?? ""}`));

    renderizarTabela();
    document.querySelector("#totalRegistros").textContent = filtrados.length;
    document.querySelector("#periodoResumo").textContent = inicio || fim ? `${formatarData(inicio) || "..."} até ${formatarData(fim) || "..."}` : "Todos";
}

function correspondeFiltro(valor, id, texto) {
    const v = String(valor ?? "").trim();
    return valor === v || v === String(id ?? "").trim() || v === String(texto ?? "").trim();
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
