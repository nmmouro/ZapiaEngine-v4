/**
 * RELATÓRIO DE OCORRÊNCIAS — LANÇAMENTOS
 * Baseado diretamente no serviço CRUD já utilizado pelo módulo funcional.
 */
import { listar, listarTodos } from "../services/crudService.js";
import { SCHEMA_RELATORIO_OCORRENCIAS } from "../schemas/relatorio.js";
import { ordenarRegistros } from "../engine/order.js";

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
    ["placa_modelo", "Placa / Modelo"],
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

let colunasSelecionadas = CAMPOS.map(([campo]) => campo);

const CAMPOS_TOTAIS = new Set([
    "distancia_percorrida",
    "media_consumo_combustivel",
    "valor_higienizacao",
    "notas_abastecimento",
    "notas_manutencao"
]);

export async function iniciar() {
    console.log("RELATÓRIO → INICIANDO");
    const app = document.querySelector("#app");
    if (!app) throw new Error("#app não encontrado.");

    montarInterface(app);
    configurarEventos();
    renderizarSeletorColunas();
    await carregarDados();
}

function montarInterface(app) {
    app.innerHTML = `
        <section class="relatorio-page">
            <section class="relatorio-documento-cabecalho" aria-label="Cabeçalho do relatório">
                <div class="relatorio-documento-marca">
                    <img src="./assets/logo.png" alt="Painel Frota" class="relatorio-documento-logo">
                </div>
                <div class="relatorio-documento-titulo">
                    <span class="relatorio-documento-kicker">PAINEL FROTA</span>
                    <h1>Relatório de Ocorrências</h1>
                    <div id="relatorioCabecalhoMetadados" class="relatorio-documento-metadados" aria-live="polite"></div>
                </div>
            </section>

            <div class="relatorio-cabecalho">
                <div>
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

            <section class="relatorio-colunas" aria-label="Colunas do relatório">
                <div class="relatorio-colunas-cabecalho">
                    <div>
                        <div class="relatorio-section-title">Colunas do relatório</div>
                        <div class="relatorio-colunas-ajuda">Selecione as colunas que deverão constar no relatório. Todas vêm selecionadas inicialmente.</div>
                    </div>
                    <div class="relatorio-colunas-acoes">
                        <button type="button" id="btnSelecionarTodasColunas" class="btn-secondary">Selecionar todas</button>
                        <button type="button" id="btnLimparColunas" class="btn-secondary">Limpar seleção</button>
                    </div>
                </div>
                <div id="seletorColunas" class="relatorio-colunas-grid"></div>
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
    document.querySelector("#btnSelecionarTodasColunas").addEventListener("click", selecionarTodasColunas);
    document.querySelector("#btnLimparColunas").addEventListener("click", limparSelecaoColunas);
    document.querySelector("#seletorColunas").addEventListener("change", evento => {
        if (!evento.target.matches("input[data-coluna]")) return;
        atualizarColunasSelecionadas();
        renderizarTabela();
    });
    ["#filtroDataInicial", "#filtroDataFinal", "#filtroVeiculo", "#filtroEmpregado", "#filtroStatus"].forEach(selector => {
        document.querySelector(selector).addEventListener("change", aplicarFiltros);
    });
    const campoTexto = document.querySelector("#filtroTexto");
    campoTexto.addEventListener("input", aplicarFiltros);
    campoTexto.addEventListener("keydown", e => {
        if (e.key === "Enter") aplicarFiltros();
    });
}

function renderizarSeletorColunas() {
    const container = document.querySelector("#seletorColunas");
    if (!container) return;

    container.innerHTML = CAMPOS.map(([campo, label]) => `
        <label class="relatorio-coluna-opcao">
            <input type="checkbox" data-coluna="${escapeHtml(campo)}" ${colunasSelecionadas.includes(campo) ? "checked" : ""}>
            <span>${escapeHtml(label)}</span>
        </label>
    `).join("");
}

function atualizarColunasSelecionadas() {
    colunasSelecionadas = [...document.querySelectorAll("#seletorColunas input[data-coluna]:checked")]
        .map(input => input.dataset.coluna)
        .filter(Boolean);
}

function selecionarTodasColunas() {
    colunasSelecionadas = CAMPOS.map(([campo]) => campo);
    renderizarSeletorColunas();
    renderizarTabela();
}

function limparSelecaoColunas() {
    colunasSelecionadas = [];
    renderizarSeletorColunas();
    renderizarTabela();
}

function camposAtivos() {
    return CAMPOS.filter(([campo]) => colunasSelecionadas.includes(campo));
}

function obterTotais() {
    const totais = {};
    CAMPOS_TOTAIS.forEach(campo => {
        totais[campo] = filtrados.reduce((total, registro) => total + numeroRelatorio(registro?.[campo]), 0);
    });
    return totais;
}

function numeroRelatorio(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const texto = String(valor).trim().replace(/\s/g, "");
    if (!texto) return 0;
    const normalizado = texto.includes(",")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto;
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
}

function formatarTotal(campo, valor) {
    const numero = Number(valor || 0);
    if (campo === "valor_higienizacao") {
        return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function carregarDados() {
    mensagem("Carregando ocorrências...", "info");
    try {
        const [lancamentos, listaVeiculos, listaEmpregados] = await Promise.allSettled([
            listarTodos("lancamentos"),
            listarTodos("veiculos"),
            listarTodos("empregados")
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

function candidatosVeiculo(r) {
    const v = veiculos.find(x =>
        String(x.id ?? "").trim() === String(r.id_veiculo ?? "").trim()
    ) || veiculos.find(x => {
        const alvo = normalizarTexto(r.placa_modelo || r.veiculo);
        const label = [x.placa, x.modelo].filter(Boolean).join(" / ");
        return alvo && [x.placa, x.modelo, label].map(normalizarTexto).includes(alvo);
    });
    return [
        r.id_veiculo, r.veiculo, r.placa_modelo,
        v?.id, v?.placa, v?.modelo,
        v ? [v.placa, v.modelo].filter(Boolean).join(" / ") : ""
    ].filter(x => String(x ?? "").trim() !== "");
}

function candidatosEmpregado(r) {
    const e = empregados.find(x =>
        String(x.id ?? "").trim() === String(r.id_empregado ?? "").trim()
    ) || empregados.find(x => {
        const alvo = normalizarTexto(r.empregado_matricula);
        return alvo && [x.matricula, x.nome, x.empregado, [x.nome || x.empregado, x.matricula].filter(Boolean).join(" / ")]
            .map(normalizarTexto).includes(alvo);
    });
    return [
        r.id_empregado, r.empregado_matricula,
        e?.id, e?.nome, e?.empregado, e?.matricula,
        e ? [e.nome || e.empregado, e.matricula].filter(Boolean).join(" / ") : ""
    ].filter(x => String(x ?? "").trim() !== "");
}

function montarOpcoesEntidade(lista, registros, tipo) {
    // Os filtros representam entidades que realmente aparecem no relatório.
    // A tabela cadastral é usada somente para enriquecer/relacionar o registro,
    // nunca para acrescentar opções que não possuem ocorrência no relatório.
    const mapa = new Map();

    const adicionar = (chave, label, candidatos) => {
        const k = String(chave ?? "").trim();
        if (!k) return;

        if (!mapa.has(k)) {
            mapa.set(k, {
                label: String(label || k).trim(),
                candidatos: new Set()
            });
        } else if (!mapa.get(k).label && label) {
            mapa.get(k).label = String(label).trim();
        }

        candidatos.forEach(c => {
            const n = normalizarTexto(c);
            if (n) mapa.get(k).candidatos.add(n);
        });
    };

    registros.forEach(r => {
        if (tipo === "veiculo") {
            const id = String(r.id_veiculo ?? "").trim();
            const snapshot = String(r.placa_modelo ?? r.veiculo ?? "").trim();
            const label = snapshot || id;
            if (!label) return;

            // Um mesmo veículo pode aparecer em várias ocorrências.
            // Quando há ID, ele é a chave canônica; sem ID, usa-se o snapshot normalizado.
            const chave = id
                ? `id:${id}`
                : `valor:${normalizarTexto(label)}`;

            adicionar(chave, label, candidatosVeiculo(r));
        } else {
            const id = String(r.id_empregado ?? "").trim();
            const snapshot = String(r.empregado_matricula ?? "").trim();
            const label = snapshot || id;
            if (!label) return;

            const chave = id
                ? `id:${id}`
                : `valor:${normalizarTexto(label)}`;

            adicionar(chave, label, candidatosEmpregado(r));
        }
    });

    return mapa;
}

function preencherFiltros() {
    opcoesVeiculos = montarOpcoesEntidade(veiculos, registros, "veiculo");
    opcoesEmpregados = montarOpcoesEntidade(empregados, registros, "empregado");

    preencherSelectComMapa("#filtroVeiculo", opcoesVeiculos, "Todos os veículos");
    preencherSelectComMapa("#filtroEmpregado", opcoesEmpregados, "Todos os empregados");

    const statuses = ordenarRegistros(
        [...new Set(registros.map(r => String(r.status ?? "").trim()).filter(Boolean))]
            .map(value => ({ value })),
        [{ field: "value", direction: "asc" }]
    ).map(item => item.value);
    const statusSelect = document.querySelector("#filtroStatus");
    statusSelect.innerHTML = `<option value="">Todos</option>` + statuses
        .map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}

function preencherSelectComMapa(selector, mapa, primeiro) {
    const select = document.querySelector(selector);
    select.innerHTML = `<option value="">${primeiro}</option>`;
    ordenarRegistros(
        [...mapa.entries()].map(([value, item]) => ({ value, item, _label: item.label })),
        [{ field: "_label", direction: "asc" }]
    )
        .forEach(({ value, item }) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = item.label;
            select.appendChild(opt);
        });
}

function registroCorresponde(entidade, chaveSelecionada, registro) {
    if (!chaveSelecionada) return true;

    const mapa = entidade === "veiculo" ? opcoesVeiculos : opcoesEmpregados;
    const item = mapa.get(chaveSelecionada);
    if (!item) return false;

    if (entidade === "veiculo") {
        // Quando a opção foi criada com ID, o ID é a identidade do veículo.
        // Não comparar modelo isoladamente: vários veículos podem ter o mesmo modelo.
        if (chaveSelecionada.startsWith("id:")) {
            const idSelecionado = normalizarTexto(chaveSelecionada.slice(3));
            const idRegistro = normalizarTexto(registro?.id_veiculo);
            if (idRegistro) return idRegistro === idSelecionado;

            // Registros antigos podem não ter id_veiculo. Nesse caso, compara-se
            // o snapshot completo placa + modelo, nunca somente o modelo.
            const alvo = normalizarTexto(item.label);
            const snapshots = [registro?.placa_modelo, registro?.veiculo]
                .map(normalizarTexto)
                .filter(Boolean);
            return !!alvo && snapshots.some(v => v === alvo);
        }

        // Sem ID, a chave é o snapshot completo normalizado.
        const alvo = normalizarTexto(item.label);
        const snapshots = [registro?.placa_modelo, registro?.veiculo]
            .map(normalizarTexto)
            .filter(Boolean);
        return !!alvo && snapshots.some(v => v === alvo);
    }

    // Empregado: ID também é a identidade principal.
    if (chaveSelecionada.startsWith("id:")) {
        const idSelecionado = normalizarTexto(chaveSelecionada.slice(3));
        const idRegistro = normalizarTexto(registro?.id_empregado);
        if (idRegistro) return idRegistro === idSelecionado;

        const alvo = normalizarTexto(item.label);
        const snapshots = [registro?.empregado_matricula]
            .map(normalizarTexto)
            .filter(Boolean);
        return !!alvo && snapshots.some(v => v === alvo);
    }

    const alvo = normalizarTexto(item.label);
    return normalizarTexto(registro?.empregado_matricula) === alvo;
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
    const inicio = document.querySelector("#filtroDataInicial")?.value || "";
    const fim = document.querySelector("#filtroDataFinal")?.value || "";
    const veiculo = document.querySelector("#filtroVeiculo")?.value.trim() || "";
    const empregado = document.querySelector("#filtroEmpregado")?.value.trim() || "";
    const status = normalizarTexto(document.querySelector("#filtroStatus")?.value || "");
    const texto = normalizarTexto(document.querySelector("#filtroTexto")?.value || "");

    if (inicio && fim && inicio > fim) {
        filtrados = [];
        renderizarTabela();
        document.querySelector("#totalRegistros").textContent = "0";
        document.querySelector("#periodoResumo").textContent = "Período inválido";
        atualizarCabecalhoRelatorio(inicio, fim, veiculo);
        mensagem("A data inicial não pode ser posterior à data final.", "erro");
        return;
    }

    const filtradosBase = registros.filter(r => {
        const data = extrairDataISO(r?.data ?? r?.created_at);
        if (inicio && (!data || data < inicio)) return false;
        if (fim && (!data || data > fim)) return false;
        if (veiculo && !registroCorresponde("veiculo", veiculo, r)) return false;
        if (empregado && !registroCorresponde("empregado", empregado, r)) return false;
        if (status && normalizarTexto(r?.status) !== status) return false;
        if (texto && !textoDoRegistro(r).includes(texto)) return false;
        return true;
    });

    // A ordenação é responsabilidade global do Engine e declarada no schema.
    // O relatório não implementa mais uma regra local de sort().
    filtrados = ordenarRegistros(
        filtradosBase,
        SCHEMA_RELATORIO_OCORRENCIAS.orderBy
    );

    renderizarTabela();
    document.querySelector("#totalRegistros").textContent = filtrados.length;
    const periodo = inicio || fim
        ? `${formatarData(inicio) || "..."} até ${formatarData(fim) || "..."}`
        : "Todos";
    document.querySelector("#periodoResumo").textContent = periodo;
    atualizarCabecalhoRelatorio(inicio, fim, veiculo);
}


function compararOcorrencias(a, b) {
    // Regra oficial da listagem: data descendente e, dentro da mesma data,
    // ID da ocorrência descendente (mais recente primeiro). A hora é usada
    // apenas como critério terciário quando disponível.
    const dataA = extrairDataISO(a?.data ?? a?.created_at) || "0000-00-00";
    const dataB = extrairDataISO(b?.data ?? b?.created_at) || "0000-00-00";
    if (dataA !== dataB) return dataB.localeCompare(dataA);

    const idComparacao = compararIdsOcorrencia(a?.id, b?.id);
    if (idComparacao !== 0) return -idComparacao;

    const horaA = normalizarHoraOrdenacao(a?.hora);
    const horaB = normalizarHoraOrdenacao(b?.hora);
    return horaB.localeCompare(horaA);
}

function compararIdsOcorrencia(a, b) {
    const sa = String(a ?? "").trim();
    const sb = String(b ?? "").trim();
    if (sa === sb) return 0;

    // IDs numéricos devem respeitar ordem numérica, inclusive quando vêm
    // do Supabase como texto.
    if (/^\d+$/.test(sa) && /^\d+$/.test(sb)) {
        const na = BigInt(sa);
        const nb = BigInt(sb);
        return na < nb ? -1 : 1;
    }

    return sa.localeCompare(sb, "pt-BR", { numeric: true, sensitivity: "base" });
}

function normalizarHoraOrdenacao(valor) {
    const texto = String(valor ?? "").trim();
    const m = texto.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return "00:00:00";
    return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] || "00"}`;
}

function extrairDataISO(valor) {
    const texto = String(valor ?? "").trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
}

function renderizarTabela() {
    const thead = document.querySelector("#tabelaRelatorio thead");
    const tbody = document.querySelector("#tabelaRelatorio tbody");
    if (!thead || !tbody) return;

    const campos = camposAtivos();

    if (!campos.length) {
        thead.innerHTML = "";
        tbody.innerHTML = `<tr><td class="relatorio-vazio" colspan="1">Nenhuma coluna selecionada. Use “Selecionar todas” ou marque as colunas desejadas.</td></tr>`;
        return;
    }

    thead.innerHTML = `<tr>${campos.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>`;

    if (!filtrados.length) {
        tbody.innerHTML = `<tr><td colspan="${campos.length}" class="relatorio-vazio">Nenhuma ocorrência encontrada com os filtros informados.</td></tr>`;
        return;
    }

    const linhas = filtrados.map(r =>
        `<tr>${campos.map(([campo]) => `<td>${escapeHtml(formatarValor(campo, r[campo]))}</td>`).join("")}</tr>`
    );

    const totais = obterTotais();
    const indicePrimeiraColuna = 0;
    const linhaTotal = campos.map(([campo], indice) => {
        if (indice === indicePrimeiraColuna) {
            const primeiroTemTotal = CAMPOS_TOTAIS.has(campo);
            return `<td class="relatorio-total-label">TOTAL${primeiroTemTotal ? " / " + escapeHtml(formatarTotal(campo, totais[campo])) : ""}</td>`;
        }
        if (CAMPOS_TOTAIS.has(campo)) {
            return `<td class="relatorio-total-valor">${escapeHtml(formatarTotal(campo, totais[campo]))}</td>`;
        }
        return `<td class="relatorio-total-vazio">—</td>`;
    }).join("");

    tbody.innerHTML = linhas.join("") + `<tr class="relatorio-linha-total">${linhaTotal}</tr>`;
}

function formatarValor(campo, valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    if (campo === "data") return formatarData(String(valor).slice(0,10));
    if (["hora", "horario_inicial", "horario_final", "duracao_atendimento", "horas_extras"].includes(campo)) {
        return formatarHora(valor);
    }
    if (campo === "placa_modelo") {
        const texto = String(valor ?? "").trim();
        if (texto) return texto;
    }
    if (["km_inicial","km_final","distancia_percorrida","media_consumo_combustivel","valor_higienizacao"].includes(campo)) return String(valor);
    return String(valor);
}

function formatarData(valor) {
    const texto = String(valor ?? "").trim();
    const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return texto;
    return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatarHora(valor) {
    const texto = String(valor ?? "").trim();
    const match = texto.match(/(?:^|T)(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : texto;
}

function atualizarCabecalhoRelatorio(inicio = "", fim = "", chaveVeiculo = "") {
    const container = document.querySelector("#relatorioCabecalhoMetadados");
    if (!container) return;

    const itens = [];
    if (inicio || fim) {
        const periodo = `${formatarData(inicio) || "..."} até ${formatarData(fim) || "..."}`;
        itens.push(`<span><strong>Período:</strong> ${escapeHtml(periodo)}</span>`);
    }

    if (chaveVeiculo) {
        const item = opcoesVeiculos.get(chaveVeiculo);
        const label = item?.label || chaveVeiculo.replace(/^id:/, "");
        itens.push(`<span><strong>Veículo:</strong> ${escapeHtml(label)}</span>`);
    }

    container.innerHTML = itens.join(`<span class="relatorio-documento-separador">•</span>`);
    container.hidden = itens.length === 0;
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
    const campos = camposAtivos();
    if (!campos.length) {
        alert("Selecione pelo menos uma coluna para exportar.");
        return;
    }

    const linhas = [campos.map(([, label]) => csv(label))];
    filtrados.forEach(r => linhas.push(campos.map(([campo]) => csv(formatarValor(campo, r[campo])))));

    const totais = obterTotais();
    linhas.push(campos.map(([campo], indice) => {
        if (indice === 0) {
            return csv(CAMPOS_TOTAIS.has(campo)
                ? `TOTAL / ${formatarTotal(campo, totais[campo])}`
                : "TOTAL");
        }
        return csv(CAMPOS_TOTAIS.has(campo) ? formatarTotal(campo, totais[campo]) : "");
    }));

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
