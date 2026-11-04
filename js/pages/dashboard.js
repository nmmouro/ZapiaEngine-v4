/**
 * ============================================================
 * PÁGINA — DASHBOARD
 * Painel Frota
 *
 * Visão geral da frota:
 * - Veículos
 * - Empregados
 * - Painel de ocorrências em andamento do dia
 * ============================================================
 */

import { listar } from "../services/crudService.js";

const INTERVALO_ATUALIZACAO = 30000;
let timerAtualizacao = null;

async function iniciarDashboard() {
    console.log("PÁGINA DASHBOARD → INICIANDO");

    const container = document.querySelector("#app");
    if (!container) {
        throw new Error("PÁGINA DASHBOARD → #app não encontrado.");
    }

    limparTimer();
    renderizarEstrutura(container);
    await atualizarDashboard();

    timerAtualizacao = window.setInterval(() => {
        atualizarDashboard().catch((erro) => {
            console.error("DASHBOARD → ERRO NA ATUALIZAÇÃO AUTOMÁTICA:", erro);
            mostrarErroAtualizacao(erro);
        });
    }, INTERVALO_ATUALIZACAO);

    console.log("PÁGINA DASHBOARD → INICIADO");
    return true;
}

function renderizarEstrutura(container) {
    container.innerHTML = `
        <section class="dashboard" aria-label="Visão geral da frota">
            <div class="dashboard-top-row">
                <section class="card dashboard-card">
                    <div class="dashboard-card-header card-title">
                        <h2>VEÍCULOS</h2>
                    </div>
                    <div class="engine-table-container dashboard-table-container">
                        <table class="engine-table dashboard-table">
                            <thead>
                                <tr>
                                    <th>PLACA</th>
                                    <th>STATUS</th>
                                    <th>ODÔMETRO</th>
                                    <th>COMBUSTÍVEL</th>
                                </tr>
                            </thead>
                            <tbody data-dashboard-table="veiculos"></tbody>
                        </table>
                    </div>
                </section>

                <section class="card dashboard-card">
                    <div class="dashboard-card-header card-title">
                        <h2>MOTORISTAS</h2>
                    </div>
                    <div class="engine-table-container dashboard-table-container">
                        <table class="engine-table dashboard-table">
                            <thead>
                                <tr>
                                    <th>MOTORISTA</th>
                                    <th>STATUS</th>
                                    <th>CONDIÇÃO</th>
                                </tr>
                            </thead>
                            <tbody data-dashboard-table="empregados"></tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section class="dashboard-card dashboard-panel-card">
                <div class="dashboard-card-header card-title">
                    <h2>PAINEL</h2>
                </div>
                <div class="engine-table-container dashboard-table-container">
                    <table class="engine-table dashboard-table dashboard-table-panel">
                        <thead>
                            <tr>
                                <th>DATA</th>
                                <th>HORA</th>
                                <th>EMPREGADO / MATRÍCULA</th>
                                <th>VEÍCULO</th>
                                <th>PASSAGEIRO / SETOR / MOTIVO</th>
                                <th>ITINERÁRIO</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody data-dashboard-table="painel"></tbody>
                    </table>
                </div>
            </section>
        </section>
    `;
}

async function atualizarDashboard() {
    const [veiculos, empregados, lancamentos] = await Promise.all([
        listar("veiculos"),
        listar("empregados"),
        listar("lancamentos")
    ]);

    const ocorrenciasAndamento = lancamentos.filter((item) =>
        normalizarStatus(item.status) === "EM ANDAMENTO"
    );

    const hoje = obterDataHoje();
    const ocorrenciasHoje = ocorrenciasAndamento
        .filter((item) => normalizarData(item.data) === hoje)
        .sort(compararDataHoraDesc);

    renderizarVeiculos(veiculos, lancamentos);
    renderizarMotoristas(empregados, ocorrenciasAndamento, ocorrenciasHoje);
    renderizarPainel(ocorrenciasHoje);

    const atualizacao = document.querySelector("[data-dashboard-atualizacao]");
    if (atualizacao) {
        atualizacao.textContent = `Atualizado em ${formatarHora(new Date())}`;
    }
}

function renderizarVeiculos(veiculos, lancamentos) {
    const tbody = document.querySelector('[data-dashboard-table="veiculos"]');
    const count = document.querySelector('[data-dashboard-count="veiculos"]');
    if (!tbody) return;

    const porVeiculo = agruparLancamentosPorCampo(lancamentos, "id_veiculo");

    const registros = [...veiculos].sort((a, b) =>
        texto(a.placa).localeCompare(texto(b.placa), "pt-BR", { numeric: true })
    );

    tbody.innerHTML = registros.length
        ? registros.map((veiculo) => {
            const relacionados = porVeiculo.get(texto(veiculo.id)) || [];
            const emAndamento = relacionados.some((item) =>
                normalizarStatus(item.status) === "EM ANDAMENTO"
            );
            const odometro = obterMaiorOdometro(veiculo, relacionados);
            const combustivel = obterUltimoCombustivel(veiculo, relacionados);

            return `
                <tr>
                    <td class="dashboard-primary">${escaparHTML(texto(veiculo.placa) || "—")}</td>
                    <td>${badgeStatus(emAndamento ? "ocupado" : "livre")}</td>
                    <td>${formatarNumero(odometro)}</td>
                    <td>${escaparHTML(formatarCombustivel(combustivel))}</td>
                </tr>
            `;
        }).join("")
        : linhaVazia(4, "Nenhum veículo cadastrado.");

    if (count) count.textContent = String(registros.length);
}

function renderizarMotoristas(empregados, ocorrenciasAndamento, ocorrenciasHoje) {
    const tbody = document.querySelector('[data-dashboard-table="empregados"]');
    const count = document.querySelector('[data-dashboard-count="empregados"]');
    if (!tbody) return;

    // A tabela do Dashboard representa os condutores operacionais fixos.
    // Um quarto condutor é incluído somente quando aparecer no Painel do dia
    // (ocorrência EM ANDAMENTO) e não fizer parte da lista fixa.
    const motoristasFixos = [
        { nome: "CACIO", matricula: "5000366" },
        { nome: "CELSO", matricula: "5000205" },
        { nome: "NEIDIVAL", matricula: "5000199" }
    ];

    const porId = new Map(empregados.map((item) => [texto(item.id), item]));
    const porMatricula = new Map(
        empregados
            .map((item) => [texto(item.matricula), item])
            .filter(([matricula]) => Boolean(matricula))
    );

    const idsOcupados = new Set(
        ocorrenciasAndamento
            .map((item) => texto(item.id_empregado))
            .filter(Boolean)
    );

    const snapshotsOcupados = new Set(
        ocorrenciasAndamento
            .map((item) => normalizarEmpregadoChave(formatarEmpregadoLancamento(item)))
            .filter(Boolean)
    );

    const registros = motoristasFixos.map((motorista) => {
        const empregado = porMatricula.get(motorista.matricula) ||
            empregados.find((item) =>
                normalizarTextoSemAcento(item.empregado) === normalizarTextoSemAcento(motorista.nome)
            );

        const ocupado = empregado
            ? idsOcupados.has(texto(empregado.id))
            : snapshotsOcupados.has(normalizarEmpregadoChave(`${motorista.nome} / ${motorista.matricula}`));

        return {
            nome: motorista.nome,
            matricula: motorista.matricula,
            ocupado,
            condicao: texto(empregado?.status) || "ATIVO",
            fixo: true
        };
    });

    const chavesFixas = new Set(
        motoristasFixos.map((item) => normalizarEmpregadoChave(`${item.nome} / ${item.matricula}`))
    );

    // Procura condutores flutuantes diretamente nas ocorrências que aparecem
    // no Painel. Se já estiver na lista fixa, não duplica.
    const flutuantes = [];
    for (const ocorrencia of ocorrenciasHoje) {
        const identificacao = formatarEmpregadoLancamento(ocorrencia);
        const chave = normalizarEmpregadoChave(identificacao);
        if (!chave || chavesFixas.has(chave)) continue;

        const matricula = extrairMatriculaEmpregado(identificacao);
        const nome = extrairNomeEmpregado(identificacao);
        const empregado = texto(ocorrencia.id_empregado)
            ? porId.get(texto(ocorrencia.id_empregado))
            : (matricula ? porMatricula.get(matricula) : null);

        const chaveEmpregado = normalizarEmpregadoChave(
            formatarEmpregado(empregado) || identificacao
        );
        if (chavesFixas.has(chaveEmpregado)) continue;
        if (flutuantes.some((item) => item.chave === chave)) continue;

        flutuantes.push({
            nome: nome || texto(empregado?.empregado) || identificacao,
            matricula: matricula || texto(empregado?.matricula),
            ocupado: true,
            // Condutor flutuante é identificado como USUÁRIO no Dashboard.
            condicao: "USUÁRIO",
            chave,
            fixo: false
        });
    }

    const todos = [...registros, ...flutuantes];

    tbody.innerHTML = todos.length
        ? todos.map((motorista) => `
            <tr>
                <td class="dashboard-primary">${escaparHTML(formatarMotorista(motorista))}</td>
                <td>${badgeStatus(motorista.ocupado ? "ocupado" : "livre")}</td>
                <td>${badgeCondicao(motorista.condicao)}</td>
            </tr>
        `).join("")
        : linhaVazia(3, "Nenhum motorista disponível.");

    if (count) count.textContent = String(todos.length);
}

function normalizarTextoSemAcento(valor) {
    return texto(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

function normalizarEmpregadoChave(valor) {
    return normalizarTextoSemAcento(valor)
        .replace(/\s+/g, " ")
        .trim();
}

function extrairMatriculaEmpregado(valor) {
    const textoValor = texto(valor);
    const match = textoValor.match(/(?:\/|-)\s*(\d{4,})\s*$/);
    return match ? match[1] : "";
}

function extrairNomeEmpregado(valor) {
    const textoValor = texto(valor);
    const match = textoValor.match(/^(.*?)\s*(?:\/|-)\s*\d{4,}\s*$/);
    return match ? match[1].trim() : textoValor;
}

function formatarMotorista(motorista) {
    const nome = texto(motorista?.nome);
    const matricula = texto(motorista?.matricula);
    if (nome && matricula) return `${nome} / ${matricula}`;
    return nome || matricula || "—";
}

function renderizarPainel(ocorrencias) {
    const tbody = document.querySelector('[data-dashboard-table="painel"]');
    const count = document.querySelector('[data-dashboard-count="painel"]');
    if (!tbody) return;

    tbody.innerHTML = ocorrencias.length
        ? ocorrencias.map((item) => `
            <tr>
                <td>${escaparHTML(formatarDataPainel(item.data) || "—")}</td>
                <td>${escaparHTML(formatarHoraValor(item.hora) || "—")}</td>
                <td>${escaparHTML(formatarEmpregadoLancamento(item))}</td>
                <td>${escaparHTML(texto(item.veiculo) || "—")}</td>
                <td>${escaparHTML(texto(item.passageiro_setor_motivo) || "—")}</td>
                <td>${escaparHTML(texto(item.itinerario) || "—")}</td>
                <td>${badgeStatus("ocupado", "EM ANDAMENTO")}</td>
            </tr>
        `).join("")
        : linhaVazia(7, "Nenhuma ocorrência em andamento hoje.");

    if (count) count.textContent = String(ocorrencias.length);
}

function obterMaiorOdometro(veiculo, lancamentos) {
    const valores = [];

    for (const item of lancamentos) {
        const inicial = numero(item.km_inicial);
        const final = numero(item.km_final);
        if (inicial !== null) valores.push(inicial);
        if (final !== null) valores.push(final);
    }

    const atual = numero(veiculo.km_atual);
    if (atual !== null) valores.push(atual);

    return valores.length ? Math.max(...valores) : null;
}

function obterUltimoCombustivel(veiculo, lancamentos) {
    const valoresValidos = new Set([
        "RESERVA",
        "1/4",
        "1/2",
        "3/4",
        "CHEIO"
    ]);

    const registros = [...lancamentos]
        .filter((item) => normalizarStatus(item.status) === "CONCLUIDO")
        .map((item) => ({
            item,
            valor: normalizarCombustivel(item.combustivel)
        }))
        .filter(({ valor }) => valoresValidos.has(valor))
        .sort((a, b) => compararDataHoraDesc(a.item, b.item));

    return registros[0]?.valor || "";
}

function agruparLancamentosPorCampo(registros, campo) {
    const mapa = new Map();
    for (const item of registros) {
        const chave = texto(item[campo]);
        if (!chave) continue;
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave).push(item);
    }
    return mapa;
}

function compararDataHoraDesc(a, b) {
    const aValor = `${normalizarData(a.data)} ${texto(a.hora)} ${texto(a.criado_em)}`;
    const bValor = `${normalizarData(b.data)} ${texto(b.hora)} ${texto(b.criado_em)}`;
    return bValor.localeCompare(aValor);
}

function obterDataHoje() {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function normalizarData(valor) {
    const textoValor = texto(valor);
    if (!textoValor) return "";
    return textoValor.slice(0, 10);
}

function normalizarStatus(valor) {
    return texto(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function formatarEmpregado(empregado) {
    const nome = texto(empregado?.empregado);
    const matricula = texto(empregado?.matricula);
    if (nome && matricula) return `${nome} / ${matricula}`;
    return nome || matricula || "—";
}

function formatarEmpregadoLancamento(item) {
    const valor = texto(item?.empregado_matricula);
    if (valor) return valor;

    const nome = texto(item?.empregado);
    const matricula = texto(item?.matricula);
    if (nome && matricula) return `${nome} / ${matricula}`;
    return nome || matricula || "—";
}

function badgeCondicao(valor) {
    const condicao = texto(valor) || "—";
    return `<span class="status status-default">${escaparHTML(condicao)}</span>`;
}

function formatarDataPainel(valor) {
    const data = normalizarData(valor);
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function normalizarCombustivel(valor) {
    return texto(valor).toUpperCase().replace(/\s+/g, "");
}

function formatarHoraValor(valor) {
    const valorTexto = texto(valor);
    return valorTexto ? valorTexto.slice(0, 5) : "";
}

function formatarHora(data) {
    return data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatarNumero(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    const numeroValor = Number(valor);
    if (!Number.isFinite(numeroValor)) return "—";
    return numeroValor.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
}

function formatarCombustivel(valor) {
    const valorTexto = texto(valor);
    if (!valorTexto) return "—";

    const mapa = {
        gasolina: "Gasolina",
        etanol: "Etanol",
        flex: "Flex",
        diesel: "Diesel",
        eletrico: "Elétrico",
        reserva: "RESERVA",
        "1/4": "1/4",
        "1/2": "1/2",
        "3/4": "3/4",
        cheio: "CHEIO"
    };

    return mapa[valorTexto.toLowerCase()] || valorTexto;
}

function numero(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    const n = Number(String(valor).replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function texto(valor) {
    return String(valor ?? "").trim();
}

function badgeStatus(status, label = null) {
    const classe = status === "ocupado" ? "status-ocupado" : "status-livre";
    const textoStatus = label || status.toUpperCase();
    return `<span class="status ${classe}">${escaparHTML(textoStatus)}</span>`;
}

function linhaVazia(colunas, mensagem) {
    return `<tr><td colspan="${colunas}" class="dashboard-empty">${escaparHTML(mensagem)}</td></tr>`;
}

function mostrarErroAtualizacao(erro) {
    const elemento = document.querySelector("[data-dashboard-atualizacao]");
    if (elemento) {
        elemento.textContent = `Erro na atualização: ${erro?.message || "não foi possível atualizar"}`;
    }
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function limparTimer() {
    if (timerAtualizacao) {
        window.clearInterval(timerAtualizacao);
        timerAtualizacao = null;
    }
}

export {
    iniciarDashboard,
    iniciarDashboard as iniciar
};
