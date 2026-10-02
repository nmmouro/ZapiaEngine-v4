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
import { listarTodos } from "../services/crudService.js";

let registrosOriginais = [];
let registrosFiltrados = [];
let veiculosDisponiveis = [];
let empregadosDisponiveis = [];


const CAMPOS_BUSCA = [
    "id",
    "empregado_matricula",
    "id_empregado",
    "placa_modelo",
    "id_veiculo",
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

    document.querySelector("#btn-aplicar-filtros")?.addEventListener("click", gerarRelatorio);
    document.querySelector("#btn-limpar-filtros")?.addEventListener("click", limparFiltros);
    document.querySelector("#btn-exportar-csv")?.addEventListener("click", exportarCSV);
    document.querySelector("#btn-imprimir-relatorio")?.addEventListener("click", imprimirPDF);

    ["filtro-data-inicial", "filtro-data-final", "filtro-status", "filtro-veiculo", "filtro-empregado", "filtro-busca"]
        .forEach(id => {
            document.getElementById(id)?.addEventListener("keydown", evento => {
                if (evento.key === "Enter") gerarRelatorio();
            });
        });
}

async function carregarDados() {
    definirStatus("Consultando ocorrências no Supabase...");

    // As três tabelas são independentes. Um problema em veículos ou
    // empregados não pode apagar o resultado de lancamentos.
    const resultados = await Promise.allSettled([
        listarTodos("lancamentos"),
        listarTodos("veiculos"),
        listarTodos("empregados")
    ]);

    const [lancamentosResult, veiculosResult, empregadosResult] = resultados;

    if (lancamentosResult.status === "rejected") {
        const erro = lancamentosResult.reason;
        console.error("RELATÓRIO LANÇAMENTOS → ERRO AO CONSULTAR LANCAMENTOS:", erro);
        registrosOriginais = [];
        veiculosDisponiveis = veiculosResult.status === "fulfilled" && Array.isArray(veiculosResult.value)
            ? veiculosResult.value : [];
        empregadosDisponiveis = empregadosResult.status === "fulfilled" && Array.isArray(empregadosResult.value)
            ? empregadosResult.value : [];
        preencherOpcoesFiltros();
        renderizarRelatorio();
        definirStatus(`Erro ao consultar public.lancamentos: ${erro?.message || "falha na API"}`, true);
        mostrarErroTabela(erro?.message || "Erro ao consultar a tabela lancamentos.");
        return;
    }

    registrosOriginais = ordenarRegistros(
        Array.isArray(lancamentosResult.value) ? lancamentosResult.value : []
    );
    veiculosDisponiveis = veiculosResult.status === "fulfilled" && Array.isArray(veiculosResult.value)
        ? veiculosResult.value : [];
    empregadosDisponiveis = empregadosResult.status === "fulfilled" && Array.isArray(empregadosResult.value)
        ? empregadosResult.value : [];

    preencherOpcoesFiltros();
    renderizarRelatorio();

    const avisos = [];
    if (veiculosResult.status === "rejected") avisos.push("veículos indisponíveis");
    if (empregadosResult.status === "rejected") avisos.push("empregados indisponíveis");

    definirStatus(
        `${registrosOriginais.length} ocorrência(s) carregada(s) · ` +
        `${veiculosDisponiveis.length} veículo(s) · ${empregadosDisponiveis.length} empregado(s)` +
        (avisos.length ? ` · ${avisos.join("; ")}` : ".")
    );
}

function mostrarErroTabela(mensagem) {
    const corpo = document.getElementById("corpo-relatorio");
    const vazio = document.getElementById("relatorio-vazio");
    if (vazio) vazio.hidden = true;
    if (corpo) {
        corpo.innerHTML = `<tr><td colspan="18" class="relatorio-erro">${escapeHtml(mensagem)}</td></tr>`;
    }
}

function preencherOpcoesFiltros() {
    const opcoesVeiculos = veiculosDisponiveis
        .map(v => ({
            value: String(v?.id ?? "").trim(),
            label: montarLabelVeiculo(v)
        }))
        .filter(o => o.value && o.label)
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));

    const opcoesEmpregados = empregadosDisponiveis
        .map(e => ({
            value: String(e?.id ?? "").trim(),
            label: montarLabelEmpregado(e)
        }))
        .filter(o => o.value && o.label)
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));

    preencherSelect("filtro-veiculo", opcoesVeiculos);
    preencherSelect("filtro-empregado", opcoesEmpregados);

    // Mantém o filtro de status compatível com os valores realmente
    // existentes em lancamentos, sem depender de uma lista fixa no HTML.
    const statusExistentes = [...new Set(
        registrosOriginais
            .map(r => String(r?.status ?? "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    const selectStatus = document.getElementById("filtro-status");
    if (selectStatus) {
        const atual = selectStatus.value;
        const jaExistentes = new Set([...selectStatus.options].map(o => normalizar(o.value)));
        statusExistentes.forEach(status => {
            if (jaExistentes.has(normalizar(status))) return;
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            selectStatus.appendChild(option);
        });
        if ([...selectStatus.options].some(o => o.value === atual)) selectStatus.value = atual;
    }
}

function preencherSelect(id, opcoes) {
    const select = document.getElementById(id);
    if (!select) return;

    const valorAtual = select.value;
    select.innerHTML = "";

    const todos = document.createElement("option");
    todos.value = "";
    todos.textContent = "Todos";
    select.appendChild(todos);

    opcoes.forEach(opcao => {
        const option = document.createElement("option");
        option.value = opcao.value;
        option.textContent = opcao.label;
        select.appendChild(option);
    });

    if ([...select.options].some(option => option.value === valorAtual)) {
        select.value = valorAtual;
    }
}

function montarLabelVeiculo(veiculo) {
    const placa = String(veiculo?.placa ?? "").trim();
    const modelo = String(
        veiculo?.marca_modelo_versao ?? veiculo?.modelo ?? veiculo?.marca_modelo ?? ""
    ).trim();
    return [placa, modelo].filter(Boolean).join(" / ") || String(veiculo?.id ?? "");
}

function montarLabelEmpregado(empregado) {
    const nome = String(empregado?.empregado ?? empregado?.nome ?? "").trim();
    const matricula = String(empregado?.matricula ?? "").trim();
    return [nome, matricula].filter(Boolean).join(" / ") || String(empregado?.id ?? "");
}


function gerarRelatorio() {
    const dataInicial = document.getElementById("filtro-data-inicial")?.value || "";
    const dataFinal = document.getElementById("filtro-data-final")?.value || "";

    if (dataInicial && dataFinal && dataInicial > dataFinal) {
        definirStatus("A data inicial não pode ser posterior à data final.", true);
        alert("Informe um período válido: a data inicial deve ser anterior ou igual à data final.");
        return;
    }

    renderizarRelatorio();

    const quantidade = registrosFiltrados.length;
    const periodo = dataInicial || dataFinal
        ? ` · período ${dataInicial ? formatarData(dataInicial) : "início"} a ${dataFinal ? formatarData(dataFinal) : "fim"}`
        : "";

    definirStatus(`${quantidade} ocorrência(s) no relatório${periodo}.`);
    setText(
        "periodo-relatorio",
        dataInicial || dataFinal
            ? `Período do relatório: ${dataInicial ? formatarData(dataInicial) : "início"} a ${dataFinal ? formatarData(dataFinal) : "fim"}`
            : "Todos os períodos"
    );

    document.querySelector(".relatorio-tabela-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
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
    const veiculo = String(document.getElementById("filtro-veiculo")?.value || "").trim();
    const empregado = String(document.getElementById("filtro-empregado")?.value || "").trim();
    const busca = normalizar(document.getElementById("filtro-busca")?.value);

    return registros.filter(registro => {
        const data = extrairDataISO(registro?.data || registro?.criado_em);

        if (dataInicial && (!data || data < dataInicial)) return false;
        if (dataFinal && (!data || data > dataFinal)) return false;

        if (status && normalizar(registro?.status) !== status) return false;

        if (veiculo && !registroCorrespondeVeiculo(registro, veiculo)) return false;

        if (empregado && !registroCorrespondeEmpregado(registro, empregado)) return false;

        if (busca) {
            // A busca livre deve considerar também os dados relacionados
            // (placa/modelo, nome/matrícula), além de todos os campos
            // efetivamente armazenados na ocorrência.
            const relacionadoVeiculo = obterVeiculoRelacionado(registro);
            const relacionadoEmpregado = obterEmpregadoRelacionado(registro);
            const valores = [
                ...Object.values(registro || {}),
                obterLabelVeiculo(registro),
                obterLabelEmpregado(registro),
                relacionadoVeiculo?.placa,
                relacionadoVeiculo?.marca_modelo_versao,
                relacionadoVeiculo?.modelo,
                relacionadoEmpregado?.empregado,
                relacionadoEmpregado?.nome,
                relacionadoEmpregado?.matricula
            ];
            const texto = valores.filter(v => v !== null && v !== undefined).join(" ");
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
            obterLabelEmpregado(registro),
            obterLabelVeiculo(registro),
            registro?.passageiro_setor_motivo,
            registro?.itinerario,
            formatarNumeroOuTraco(registro?.km_inicial),
            formatarNumeroOuTraco(registro?.km_final),
            `${formatarNumero(obterDistancia(registro))} km`,
            formatarHora(registro?.duracao_atendimento),
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
    setText("periodo-relatorio", "Todos os períodos");
    definirStatus(`${registrosOriginais.length} ocorrência(s) carregada(s).`);
}

function exportarCSV() {
    if (!registrosFiltrados.length) {
        alert("Não há ocorrências para exportar com os filtros atuais.");
        return;
    }

    const cabecalho = [
        "ID", "Data", "Hora", "Empregado / Matrícula", "Placa / Modelo",
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
        obterLabelEmpregado(r),
        obterLabelVeiculo(r),
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

function obterVeiculoRelacionado(registro) {
    const id = String(registro?.id_veiculo ?? "").trim();
    if (id) {
        const porId = veiculosDisponiveis.find(v => String(v?.id ?? "").trim() === id);
        if (porId) return porId;
    }

    const snapshot = normalizar(registro?.placa_modelo);
    if (!snapshot) return null;

    return veiculosDisponiveis.find(v => {
        const placa = normalizar(v?.placa);
        const label = normalizar(montarLabelVeiculo(v));
        return snapshot === placa || snapshot === label || label.includes(snapshot) || (placa && snapshot.includes(placa));
    }) || null;
}

function obterEmpregadoRelacionado(registro) {
    const id = String(registro?.id_empregado ?? "").trim();
    if (id) {
        const porId = empregadosDisponiveis.find(e => String(e?.id ?? "").trim() === id);
        if (porId) return porId;
    }

    const snapshot = normalizar(registro?.empregado_matricula);
    if (!snapshot) return null;

    return empregadosDisponiveis.find(e => {
        const matricula = normalizar(e?.matricula);
        const nome = normalizar(e?.empregado ?? e?.nome);
        const label = normalizar(montarLabelEmpregado(e));
        return snapshot === matricula || snapshot === nome || snapshot === label ||
            label.includes(snapshot) || (matricula && snapshot.includes(matricula));
    }) || null;
}

function registroCorrespondeVeiculo(registro, idSelecionado) {
    const id = String(idSelecionado ?? "").trim();
    if (!id) return true;

    // 1) Vínculo direto gravado na ocorrência.
    if (String(registro?.id_veiculo ?? "").trim() === id) return true;

    // 2) Cadastro atual relacionado pelo ID ou pela placa gravada como snapshot.
    const selecionado = veiculosDisponiveis.find(v =>
        String(v?.id ?? "").trim() === id
    );
    if (!selecionado) return false;

    const placaSelecionada = normalizar(selecionado?.placa);
    const modeloSelecionado = normalizar(
        selecionado?.marca_modelo_versao ?? selecionado?.modelo ?? selecionado?.marca_modelo
    );
    const labelSelecionado = normalizar(montarLabelVeiculo(selecionado));

    const valoresRegistro = [
        registro?.placa_modelo,
        registro?.placa,
        registro?.marca_modelo_versao,
        registro?.modelo,
        registro?.id_veiculo
    ].map(normalizar).filter(Boolean);

    return valoresRegistro.some(valor =>
        valor === placaSelecionada ||
        valor === modeloSelecionado ||
        valor === labelSelecionado ||
        (placaSelecionada && (valor.includes(placaSelecionada) || placaSelecionada.includes(valor)))
    );
}

function registroCorrespondeEmpregado(registro, idSelecionado) {
    const id = String(idSelecionado ?? "").trim();
    if (!id) return true;

    // 1) Vínculo direto gravado na ocorrência.
    if (String(registro?.id_empregado ?? "").trim() === id) return true;

    // 2) Cadastro atual relacionado pelo ID ou pelos dados do snapshot.
    const selecionado = empregadosDisponiveis.find(e =>
        String(e?.id ?? "").trim() === id
    );
    if (!selecionado) return false;

    const matriculaSelecionada = normalizar(selecionado?.matricula);
    const nomeSelecionado = normalizar(selecionado?.empregado ?? selecionado?.nome);
    const labelSelecionado = normalizar(montarLabelEmpregado(selecionado));

    const valoresRegistro = [
        registro?.empregado_matricula,
        registro?.empregado,
        registro?.nome,
        registro?.matricula,
        registro?.id_empregado
    ].map(normalizar).filter(Boolean);

    return valoresRegistro.some(valor =>
        valor === matriculaSelecionada ||
        valor === nomeSelecionado ||
        valor === labelSelecionado ||
        (matriculaSelecionada && (valor.includes(matriculaSelecionada) || matriculaSelecionada.includes(valor))) ||
        (nomeSelecionado && valor.includes(nomeSelecionado))
    );
}

function obterLabelVeiculo(registro) {
    const relacionado = obterVeiculoRelacionado(registro);
    if (relacionado) return montarLabelVeiculo(relacionado);
    return String(registro?.placa_modelo ?? "").trim();
}

function obterLabelEmpregado(registro) {
    const relacionado = obterEmpregadoRelacionado(registro);
    if (relacionado) return montarLabelEmpregado(relacionado);
    return String(registro?.empregado_matricula ?? "").trim();
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
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
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
