/**
 * RELATÓRIO DE OCORRÊNCIAS — LANÇAMENTOS
 * Baseado diretamente no serviço CRUD já utilizado pelo módulo funcional.
 */
import { listar, listarTodos } from "../services/crudService.js";

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
        mensagem("A data inicial não pode ser posterior à data final.", "erro");
        return;
    }

    filtrados = registros.filter(r => {
        const data = extrairDataISO(r?.data ?? r?.created_at);
        if (inicio && (!data || data < inicio)) return false;
        if (fim && (!data || data > fim)) return false;
        if (veiculo && !registroCorresponde("veiculo", veiculo, r)) return false;
        if (empregado && !registroCorresponde("empregado", empregado, r)) return false;
        if (status && normalizarTexto(r?.status) !== status) return false;
        if (texto && !textoDoRegistro(r).includes(texto)) return false;
        return true;
    }).sort((a, b) => {
        const da = `${extrairDataISO(a?.data ?? a?.created_at) || "0000-00-00"} ${String(a?.hora ?? "00:00")}`;
        const db = `${extrairDataISO(b?.data ?? b?.created_at) || "0000-00-00"} ${String(b?.hora ?? "00:00")}`;
        return db.localeCompare(da);
    });

    renderizarTabela();
    document.querySelector("#totalRegistros").textContent = filtrados.length;
    document.querySelector("#periodoResumo").textContent = inicio || fim
        ? `${formatarData(inicio) || "..."} até ${formatarData(fim) || "..."}`
        : "Todos";
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
