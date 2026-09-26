/**
 * ============================================================
 * RELATÓRIO — LANÇAMENTOS
 * Painel Frota
 *
 * Consulta diretamente a tabela public.lancamentos através do
 * crudService e aplica os filtros no conjunto retornado.
 * Exportações disponíveis:
 * - CSV compatível com Excel
 * - Impressão do relatório / salvar como PDF pelo navegador
 * ============================================================
 */
import { listar } from "../services/crudService.js";

let registrosOriginais = [];
let registrosFiltrados = [];

const CAMPOS_BUSCA = [
    "id",
    "empregado_matricula",
    "veiculo",
    "passageiro_setor_motivo",
    "itinerario",
    "avaliacao_visual",
    "avarias_registradas",
    "combustivel",
    "checklist",
    "lava_car",
    "notas_abastecimento",
    "notas_manutencao",
    "revisao",
    "status"
];

export async function iniciarLancamentosRelatorio() {
    console.log("PÁGINA RELATÓRIO LANÇAMENTOS → INICIANDO");

    registrarEventos();
    await carregarDados();
}

export const iniciar = iniciarLancamentosRelatorio;

function registrarEventos() {
    document.querySelector("#btn-voltar-lancamentos")?.addEventListener("click", () => {
        window.location.href = "lancamentos.html";
    });

    document.querySelector("#btn-aplicar-filtros")?.addEventListener("click", renderizarRelatorio);
    document.querySelector("#btn-limpar-filtros")?.addEventListener("click", limparFiltros);
    document.querySelector("#btn-exportar-csv")?.addEventListener("click", exportarCSV);
    document.querySelector("#btn-imprimir-relatorio")?.addEventListener("click", imprimirPDF);

    ["filtro-data-inicial", "filtro-data-final", "filtro-status", "filtro-veiculo", "filtro-empregado", "filtro-busca"]
        .forEach(id => {
            document.getElementById(id)?.addEventListener("keydown", evento => {
                if (evento.key === "Enter") renderizarRelatorio();
            });
        });
}

async function carregarDados() {
    definirStatus("Consultando ocorrências no Supabase...");

    try {
        const resposta = await listar("lancamentos");
        registrosOriginais = Array.isArray(resposta) ? resposta : [];
        registrosOriginais = ordenarRegistros(registrosOriginais);
        preencherOpcoesFiltros(registrosOriginais);
        renderizarRelatorio();
        definirStatus(`${registrosOriginais.length} ocorrência(s) carregada(s).`);
    } catch (erro) {
        console.error("RELATÓRIO LANÇAMENTOS → ERRO AO CARREGAR:", erro);
        registrosOriginais = [];
        renderizarRelatorio();
        definirStatus("Não foi possível carregar as ocorrências.", true);

        const corpo = document.getElementById("corpo-relatorio");
        if (corpo) {
            corpo.innerHTML = `<tr><td colspan="18" class="relatorio-erro">${escapeHtml(erro?.message || "Erro ao consultar o Supabase.")}</td></tr>`;
        }
    }
}

function preencherOpcoesFiltros(registros) {
    preencherSelect("filtro-veiculo", valoresUnicos(registros, "veiculo"));
    preencherSelect("filtro-empregado", valoresUnicos(registros, "empregado_matricula"));
}

function preencherSelect(id, valores) {
    const select = document.getElementById(id);
    if (!select) return;

    const valorAtual = select.value;
    const primeiraOpcao = select.options[0]?.outerHTML || "<option value=\"\">Todos</option>";
    select.innerHTML = primeiraOpcao;

    valores.forEach(valor => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
    });

    if (valores.includes(valorAtual)) select.value = valorAtual;
}

function renderizarRelatorio() {
    registrosFiltrados = aplicarFiltros(registrosOriginais);
    renderizarResumo(registrosFiltrados);
    renderizarTabela(registrosFiltrados);
}

function aplicarFiltros(registros) {
    const dataInicial = document.getElementById("filtro-data-inicial")?.value || "";
    const dataFinal = document.getElementById("filtro-data-final")?.value || "";
    const status = normalizar(document.getElementById("filtro-status")?.value);
    const veiculo = normalizar(document.getElementById("filtro-veiculo")?.value);
    const empregado = normalizar(document.getElementById("filtro-empregado")?.value);
    const busca = normalizar(document.getElementById("filtro-busca")?.value);

    return registros.filter(registro => {
        const data = extrairDataISO(registro?.data);

        if (dataInicial && (!data || data < dataInicial)) return false;
        if (dataFinal && (!data || data > dataFinal)) return false;

        if (status && normalizar(registro?.status) !== status) return false;
        if (veiculo && normalizar(registro?.veiculo) !== veiculo) return false;
        if (empregado && normalizar(registro?.empregado_matricula) !== empregado) return false;

        if (busca) {
            const texto = CAMPOS_BUSCA.map(campo => registro?.[campo] ?? "").join(" ");
            if (!normalizar(texto).includes(busca)) return false;
        }

        return true;
    });
}

function renderizarResumo(registros) {
    const total = registros.length;
    const concluidas = registros.filter(r => normalizar(r?.status) === "CONCLUIDO").length;
    const andamento = registros.filter(r => normalizar(r?.status) === "EM ANDAMENTO").length;
    const distancia = registros.reduce((soma, r) => soma + obterDistancia(r), 0);
    const duracaoMinutos = registros.reduce((soma, r) => soma + obterDuracaoMinutos(r?.duracao_atendimento), 0);

    setText("resumo-total", formatarInteiro(total));
    setText("resumo-concluidas", formatarInteiro(concluidas));
    setText("resumo-andamento", formatarInteiro(andamento));
    setText("resumo-distancia", `${formatarNumero(distancia)} km`);
    setText("resumo-duracao", formatarDuracaoTotal(duracaoMinutos));
    setText("contador-registros", `${formatarInteiro(total)} ${total === 1 ? "registro" : "registros"}`);
}

function renderizarTabela(registros) {
    const corpo = document.getElementById("corpo-relatorio");
    const vazio = document.getElementById("relatorio-vazio");
    if (!corpo) return;

    corpo.innerHTML = "";

    if (!registros.length) {
        if (vazio) vazio.hidden = false;
        return;
    }

    if (vazio) vazio.hidden = true;

    registros.forEach(registro => {
        const tr = document.createElement("tr");
        const valores = [
            formatarData(registro?.data),
            formatarHora(registro?.hora),
            registro?.empregado_matricula,
            registro?.veiculo,
            registro?.passageiro_setor_motivo,
            registro?.itinerario,
            formatarNumeroOuTraco(registro?.km_inicial),
            formatarNumeroOuTraco(registro?.km_final),
            `${formatarNumero(obterDistancia(registro))} km`,
            registro?.duracao_atendimento,
            registro?.status,
            registro?.combustivel,
            registro?.checklist,
            registro?.avaliacao_visual,
            registro?.avarias_registradas,
            registro?.lava_car,
            registro?.notas_manutencao,
            registro?.revisao
        ];

        valores.forEach((valor, indice) => {
            const td = document.createElement("td");
            td.textContent = valor == null || valor === "" ? "—" : String(valor);
            if (indice === 10) td.classList.add("relatorio-status", classeStatus(registro?.status));
            tr.appendChild(td);
        });

        tr.addEventListener("dblclick", () => {
            if (registro?.id) {
                window.location.href = `lancamentos_view.html?id=${encodeURIComponent(registro.id)}`;
            }
        });

        tr.title = registro?.id ? "Duplo clique para visualizar a ocorrência" : "";
        corpo.appendChild(tr);
    });
}

function limparFiltros() {
    ["filtro-data-inicial", "filtro-data-final", "filtro-busca"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });

    ["filtro-status", "filtro-veiculo", "filtro-empregado"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });

    renderizarRelatorio();
    definirStatus(`${registrosOriginais.length} ocorrência(s) carregada(s).`);
}

function exportarCSV() {
    if (!registrosFiltrados.length) {
        alert("Não há ocorrências para exportar com os filtros atuais.");
        return;
    }

    const cabecalho = [
        "ID", "Data", "Hora", "Empregado / Matrícula", "Veículo / Modelo",
        "Passageiro / Setor / Motivo", "Itinerário", "Horário Inicial", "Horário Final",
        "Km Inicial", "Km Final", "Distância Percorrida", "Duração do Atendimento",
        "Status", "Combustível", "Média Consumo", "Checklist", "Avaliação Visual",
        "Avarias Registradas", "Lava-Car", "Valor Higienização", "Notas Abastecimento",
        "Notas Manutenção", "Horas Extras", "Revisão", "Usuário", "Classificação",
        "Localização Inicial", "Localização Final", "Criado em", "Atualizado em"
    ];

    const linhas = registrosFiltrados.map(r => [
        r?.id,
        formatarData(r?.data),
        formatarHora(r?.hora),
        r?.empregado_matricula,
        r?.veiculo,
        r?.passageiro_setor_motivo,
        r?.itinerario,
        formatarHora(r?.horario_inicial),
        formatarHora(r?.horario_final),
        r?.km_inicial,
        r?.km_final,
        obterDistancia(r),
        r?.duracao_atendimento,
        r?.status,
        r?.combustivel,
        r?.media_consumo_combustivel,
        r?.checklist,
        r?.avaliacao_visual,
        r?.avarias_registradas,
        r?.lava_car,
        r?.valor_higienizacao,
        r?.notas_abastecimento,
        r?.notas_manutencao,
        r?.horas_extras,
        r?.revisao,
        r?.usuario,
        r?.classificacao,
        r?.localizacao,
        r?.localizacao_final,
        r?.criado_em,
        r?.atualizado_em
    ]);

    const csv = [cabecalho, ...linhas]
        .map(linha => linha.map(valor => csvCampo(valor)).join(";"))
        .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_ocorrencias_${dataArquivo(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    definirStatus(`${registrosFiltrados.length} ocorrência(s) exportada(s) para CSV.`);
}

function imprimirPDF() {
    if (!registrosFiltrados.length) {
        alert("Não há ocorrências para imprimir com os filtros atuais.");
        return;
    }

    window.print();
}

function obterDistancia(registro) {
    const distancia = numero(registro?.distancia_percorrida);
    if (Number.isFinite(distancia)) return Math.max(0, distancia);

    const inicial = numero(registro?.km_inicial);
    const final = numero(registro?.km_final);
    if (Number.isFinite(inicial) && Number.isFinite(final) && final >= inicial) {
        return final - inicial;
    }

    return 0;
}

function obterDuracaoMinutos(valor) {
    const texto = String(valor ?? "").trim();
    if (!texto) return 0;

    const horasMinutos = texto.match(/^(\d+)\s*[:h]\s*(\d{1,2})/i);
    if (horasMinutos) return Number(horasMinutos[1]) * 60 + Number(horasMinutos[2]);

    const apenasHoras = texto.match(/^(\d+(?:[.,]\d+)?)\s*h/i);
    if (apenasHoras) return Number(apenasHoras[1].replace(",", ".")) * 60;

    const minutos = texto.match(/(\d+)\s*min/i);
    if (minutos) return Number(minutos[1]);

    return 0;
}

function ordenarRegistros(registros) {
    return [...registros].sort((a, b) => {
        const chaveA = `${extrairDataISO(a?.data) || "0000-00-00"} ${String(a?.hora || "00:00")}`;
        const chaveB = `${extrairDataISO(b?.data) || "0000-00-00"} ${String(b?.hora || "00:00")}`;
        return chaveB.localeCompare(chaveA);
    });
}

function valoresUnicos(registros, campo) {
    return [...new Set(
        registros
            .map(r => String(r?.[campo] ?? "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function extrairDataISO(valor) {
    const texto = String(valor ?? "").trim();
    const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
}

function formatarData(valor) {
    const iso = extrairDataISO(valor);
    if (!iso) return String(valor ?? "");
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatarHora(valor) {
    const texto = String(valor ?? "").trim();
    const match = texto.match(/(\d{2}:\d{2})/);
    return match ? match[1] : texto;
}

function formatarNumero(valor) {
    const n = numero(valor);
    if (!Number.isFinite(n)) return "0,00";
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarNumeroOuTraco(valor) {
    const n = numero(valor);
    return Number.isFinite(n) ? formatarNumero(n) : "—";
}

function formatarInteiro(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarDuracaoTotal(minutos) {
    const total = Math.max(0, Math.round(Number(minutos) || 0));
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    return `${horas}h ${String(mins).padStart(2, "0")}min`;
}

function numero(valor) {
    if (typeof valor === "number") return valor;
    const texto = String(valor ?? "").trim().replace(/\s/g, "");
    if (!texto) return NaN;
    const normalizado = texto.includes(",") && texto.includes(".")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto.replace(",", ".");
    const n = Number(normalizado);
    return Number.isFinite(n) ? n : NaN;
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function classeStatus(status) {
    const valor = normalizar(status);
    if (valor === "CONCLUIDO") return "status-concluido";
    if (valor === "EM ANDAMENTO") return "status-andamento";
    return "status-neutro";
}

function csvCampo(valor) {
    return `"${String(valor ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function dataArquivo(data) {
    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("");
}

function setText(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
}

function definirStatus(texto, erro = false) {
    const elemento = document.getElementById("status-carregamento");
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.classList.toggle("erro", erro);
}

function escapeHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
