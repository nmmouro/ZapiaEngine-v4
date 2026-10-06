/**
 * RUV — RELATÓRIO DE UTILIZAÇÃO DE VEÍCULO
 *
 * Relatório consolidado de utilização, custos e consumo por período e veículo.
 * Não cria regras paralelas de ordenação: utiliza SCHEMA_RUV.orderBy e o
 * recurso global do Engine.
 */
import { listarTodos } from "../services/crudService.js";
import { ordenarRegistros } from "../engine/order.js";
import { SCHEMA_RUV } from "../schemas/ruv.js";

let registros = [];
let veiculos = [];
let filtrados = [];

const COLUNAS = [
    ["data", "Data"],
    ["id", "ID"],
    ["placa_modelo", "Placa / Modelo"],
    ["horario_inicial", "Horário Inicial"],
    ["horario_final", "Horário Final"],
    ["km_inicial", "Km Inicial"],
    ["km_final", "Km Final"],
    ["distancia_percorrida", "Distância Percorrida"],
    ["media_consumo_combustivel", "Média de Consumo"],
    ["valor_higienizacao", "Valor Higienização"],
    ["notas_abastecimento", "Notas Abastecimento"],
    ["notas_manutencao", "Notas Manutenção"]
];

export async function iniciar() {
    console.log("RUV → INICIANDO");
    const app = document.querySelector("#app");
    if (!app) throw new Error("RUV: #app não encontrado.");

    montarInterface(app);
    configurarEventos();
    definirDatasPadrao();
    await carregarDados();
}

function montarInterface(app) {
    app.innerHTML = `
        <section class="ruv-page">
            <div class="ruv-topo">
                <div>
                    <div class="ruv-kicker">RUV</div>
                    <h1>Relatório de Utilização de Veículo</h1>
                    <p>Utilização, distância, consumo e valores vinculados às ocorrências.</p>
                </div>
                <div class="ruv-acoes">
                    <button type="button" id="ruvAplicar" class="btn-primary">Aplicar filtros</button>
                    <button type="button" id="ruvLimpar" class="btn-secondary">Limpar</button>
                    <button type="button" id="ruvCSV" class="btn-secondary">Exportar CSV</button>
                    <button type="button" id="ruvImprimir" class="btn-secondary">Imprimir / PDF</button>
                </div>
            </div>

            <section class="ruv-filtros">
                <div class="ruv-filtros-grid">
                    <label>
                        <span>Data inicial</span>
                        <input id="ruvDataInicial" type="date">
                    </label>
                    <label>
                        <span>Data final</span>
                        <input id="ruvDataFinal" type="date">
                    </label>
                    <label class="ruv-veiculo">
                        <span>Veículo</span>
                        <select id="ruvVeiculo">
                            <option value="">Todos os veículos</option>
                        </select>
                    </label>
                </div>
                <div id="ruvStatus" class="ruv-status" role="status"></div>
            </section>

            <section class="ruv-resumo" aria-label="Resumo do relatório">
                <div class="ruv-card"><span>Ocorrências</span><strong id="ruvTotalRegistros">0</strong></div>
                <div class="ruv-card"><span>Distância total</span><strong id="ruvTotalDistancia">0,00 km</strong></div>
                <div class="ruv-card"><span>Valor total</span><strong id="ruvTotalValor">R$ 0,00</strong></div>
                <div class="ruv-card"><span>Média geral de consumo</span><strong id="ruvMediaConsumo">—</strong></div>
            </section>

            <section class="ruv-tabela-section">
                <div class="ruv-section-title">
                    <strong>Utilização do veículo</strong>
                    <span id="ruvPeriodoResumo">Todos os registros</span>
                </div>
                <div class="ruv-tabela-wrap">
                    <table id="ruvTabela" class="ruv-tabela">
                        <thead></thead>
                        <tbody></tbody>
                        <tfoot></tfoot>
                    </table>
                </div>
            </section>
        </section>
    `;
}

function configurarEventos() {
    document.querySelector("#ruvAplicar").addEventListener("click", aplicarFiltros);
    document.querySelector("#ruvLimpar").addEventListener("click", limparFiltros);
    document.querySelector("#ruvCSV").addEventListener("click", exportarCSV);
    document.querySelector("#ruvImprimir").addEventListener("click", () => window.print());
    document.querySelector("#ruvDataInicial").addEventListener("change", aplicarFiltros);
    document.querySelector("#ruvDataFinal").addEventListener("change", aplicarFiltros);
    document.querySelector("#ruvVeiculo").addEventListener("change", aplicarFiltros);
}

function definirDatasPadrao() {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - 1);

    document.querySelector("#ruvDataInicial").value = inicio.toISOString().slice(0, 10);
    document.querySelector("#ruvDataFinal").value = hoje;
}

async function carregarDados() {
    status("Carregando dados do RUV...", "info");

    try {
        const [resultadoLancamentos, resultadoVeiculos] = await Promise.allSettled([
            listarTodos("lancamentos"),
            listarTodos("veiculos")
        ]);

        if (resultadoLancamentos.status === "rejected") {
            throw resultadoLancamentos.reason;
        }

        registros = normalizarLista(resultadoLancamentos.value);
        veiculos = normalizarLista(
            resultadoVeiculos.status === "fulfilled" ? resultadoVeiculos.value : []
        );

        preencherVeiculos();
        aplicarFiltros();
        status(`${registros.length} ocorrências carregadas.`, "sucesso");
    } catch (erro) {
        console.error("RUV → ERRO AO CARREGAR:", erro);
        status(`Não foi possível carregar o RUV: ${erro?.message || erro}`, "erro");
        renderizar([]);
    }
}

function preencherVeiculos() {
    const select = document.querySelector("#ruvVeiculo");
    const mapa = new Map();

    registros.forEach(registro => {
        const id = valorTexto(registro.id_veiculo);
        const placaModelo = obterPlacaModelo(registro);
        const chave = id || normalizarTexto(placaModelo);
        if (!chave || mapa.has(chave)) return;
        mapa.set(chave, { value: id || placaModelo, label: placaModelo || id });
    });

    veiculos.forEach(veiculo => {
        const id = valorTexto(veiculo.id);
        const placaModelo = `${valorTexto(veiculo.placa)} / ${valorTexto(veiculo.modelo)}`.replace(/^\s*\/\s*|\s*\/\s*$/g, "").trim();
        const chave = id || normalizarTexto(placaModelo);
        if (!chave || mapa.has(chave)) return;
        // A lista de filtro é deliberadamente limitada aos veículos que aparecem nas ocorrências.
    });

    const opcoes = [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base", numeric: true }));
    select.innerHTML = `<option value="">Todos os veículos</option>` + opcoes.map(opcao =>
        `<option value="${escaparAtributo(opcao.value)}">${escaparHTML(opcao.label)}</option>`
    ).join("");
}

function aplicarFiltros() {
    const dataInicial = document.querySelector("#ruvDataInicial").value;
    const dataFinal = document.querySelector("#ruvDataFinal").value;
    const veiculo = document.querySelector("#ruvVeiculo").value;

    if (dataInicial && dataFinal && dataInicial > dataFinal) {
        status("A data inicial não pode ser posterior à data final.", "erro");
        filtrados = [];
        renderizar(filtrados);
        return;
    }

    filtrados = registros.filter(registro => {
        const data = extrairData(registro.data);
        if (dataInicial && (!data || data < dataInicial)) return false;
        if (dataFinal && (!data || data > dataFinal)) return false;
        if (veiculo && !correspondeVeiculo(registro, veiculo)) return false;
        return true;
    });

    filtrados = ordenarRegistros(filtrados, SCHEMA_RUV.orderBy);
    renderizar(filtrados);
    atualizarResumo(dataInicial, dataFinal);
}

function correspondeVeiculo(registro, filtro) {
    const id = valorTexto(registro.id_veiculo);
    if (id && filtro === id) return true;

    const placaModelo = normalizarTexto(obterPlacaModelo(registro));
    return placaModelo === normalizarTexto(filtro);
}

function renderizar(lista) {
    const tabela = document.querySelector("#ruvTabela");
    const thead = tabela.querySelector("thead");
    const tbody = tabela.querySelector("tbody");
    const tfoot = tabela.querySelector("tfoot");

    thead.innerHTML = `<tr>${COLUNAS.map(([, label]) => `<th>${escaparHTML(label)}</th>`).join("")}</tr>`;

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="${COLUNAS.length}" class="ruv-vazio">Nenhuma ocorrência encontrada para os filtros selecionados.</td></tr>`;
        tfoot.innerHTML = montarRodape({});
        return;
    }

    tbody.innerHTML = lista.map(registro => `<tr>${COLUNAS.map(([campo]) => `<td>${formatarCampo(campo, registro[campo], registro)}</td>`).join("")}</tr>`).join("");

    tfoot.innerHTML = montarRodape(calcularTotais(lista));
}

function calcularTotais(lista) {
    const total = campoNumerico(lista, "distancia_percorrida");
    const higienizacao = campoNumerico(lista, "valor_higienizacao");
    const abastecimento = campoNumerico(lista, "notas_abastecimento");
    const manutencao = campoNumerico(lista, "notas_manutencao");

    const consumos = lista
        .map(registro => numero(registro.media_consumo_combustivel))
        .filter(valor => Number.isFinite(valor) && valor > 0);

    const mediaConsumo = consumos.length
        ? consumos.reduce((soma, valor) => soma + valor, 0) / consumos.length
        : null;

    return {
        distancia_percorrida: total,
        valor_higienizacao: higienizacao,
        notas_abastecimento: abastecimento,
        notas_manutencao: manutencao,
        total_valores: higienizacao + abastecimento + manutencao,
        media_consumo_combustivel: mediaConsumo
    };
}

function montarRodape(totais) {
    return `<tr class="ruv-total">
        <th colspan="7">TOTAL / MÉDIA GERAL</th>
        <th>${formatarNumero(totais.distancia_percorrida)} km</th>
        <th>${totais.media_consumo_combustivel == null ? "—" : `${formatarNumero(totais.media_consumo_combustivel)} km/L`}</th>
        <th>${formatarMoeda(totais.valor_higienizacao)}</th>
        <th>${formatarMoeda(totais.notas_abastecimento)}</th>
        <th>${formatarMoeda(totais.notas_manutencao)}</th>
    </tr>`;
}

function atualizarResumo(dataInicial, dataFinal) {
    const totais = calcularTotais(filtrados);
    const valorTotal = totais.total_valores || 0;

    document.querySelector("#ruvTotalRegistros").textContent = filtrados.length.toLocaleString("pt-BR");
    document.querySelector("#ruvTotalDistancia").textContent = `${formatarNumero(totais.distancia_percorrida)} km`;
    document.querySelector("#ruvTotalValor").textContent = formatarMoeda(valorTotal);
    document.querySelector("#ruvMediaConsumo").textContent = totais.media_consumo_combustivel == null
        ? "—"
        : `${formatarNumero(totais.media_consumo_combustivel)} km/L`;

    const periodo = dataInicial || dataFinal
        ? `${dataInicial || "..."} até ${dataFinal || "..."}`
        : "Todos os registros";
    document.querySelector("#ruvPeriodoResumo").textContent = periodo;
}

function limparFiltros() {
    document.querySelector("#ruvDataInicial").value = "";
    document.querySelector("#ruvDataFinal").value = "";
    document.querySelector("#ruvVeiculo").value = "";
    aplicarFiltros();
}

function exportarCSV() {
    if (!filtrados.length) {
        status("Não há registros para exportar.", "erro");
        return;
    }

    const linhas = [
        COLUNAS.map(([, label]) => label),
        ...filtrados.map(registro => COLUNAS.map(([campo]) => textoCSV(formatarCampo(campo, registro[campo], registro))))
    ];

    const totais = calcularTotais(filtrados);
    linhas.push([]);
    linhas.push(["TOTAL / MÉDIA GERAL", "", "", "", "", "", "", totais.distancia_percorrida, totais.media_consumo_combustivel ?? "", totais.valor_higienizacao, totais.notas_abastecimento, totais.notas_manutencao]);

    const csv = "\uFEFF" + linhas.map(linha => linha.map(textoCSV).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RUV-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function formatarCampo(campo, valor, registro) {
    if (campo === "data") return formatarData(valor);
    if (["km_inicial", "km_final", "distancia_percorrida"].includes(campo)) return valor == null || valor === "" ? "—" : formatarNumero(numero(valor));
    if (campo === "media_consumo_combustivel") return valor == null || valor === "" ? "—" : `${formatarNumero(numero(valor))} km/L`;
    if (["valor_higienizacao", "notas_abastecimento", "notas_manutencao"].includes(campo)) return formatarMoeda(numero(valor));
    if (campo === "placa_modelo") return escaparHTML(obterPlacaModelo(registro) || "—");
    return escaparHTML(valor == null || valor === "" ? "—" : valor);
}

function obterPlacaModelo(registro) {
    const snapshot = valorTexto(registro.placa_modelo || registro.veiculo);
    if (snapshot) return snapshot;
    const id = valorTexto(registro.id_veiculo);
    if (id) {
        const veiculo = veiculos.find(item => valorTexto(item.id) === id);
        if (veiculo) return `${valorTexto(veiculo.placa)} / ${valorTexto(veiculo.modelo)}`.trim();
    }
    return "";
}

function campoNumerico(lista, campo) {
    return lista.reduce((soma, registro) => soma + (numero(registro[campo]) || 0), 0);
}

function numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (valor == null || valor === "") return 0;
    const texto = String(valor).trim().replace(/R\$\s*/gi, "");
    if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(texto)) return Number(texto.replace(/\./g, "").replace(",", "."));
    if (/^-?\d+,\d+$/.test(texto)) return Number(texto.replace(",", "."));
    return Number(texto.replace(/[^0-9.-]/g, "")) || 0;
}

function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(valor) {
    const data = extrairData(valor);
    if (!data) return "—";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function extrairData(valor) {
    if (!valor) return "";
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
}

function normalizarLista(valor) {
    return Array.isArray(valor) ? valor.filter(item => item && typeof item === "object") : [];
}

function valorTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarTexto(valor) {
    return valorTexto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function textoCSV(valor) {
    return String(valor ?? "").replace(/\r?\n/g, " ");
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
    return escaparHTML(valor);
}

function texto(valor) {
    return String(valor ?? "").trim();
}

function status(mensagem, tipo = "info") {
    const elemento = document.querySelector("#ruvStatus");
    if (!elemento) return;
    elemento.textContent = mensagem || "";
    elemento.className = `ruv-status ${tipo}`;
}

export default { iniciar };
