/**
 * ============================================================
 * PÁGINA — LANÇAMENTOS
 * Painel Frota
 *
 * Ciclo:
 *     NOVO → ABERTURA → EM ANDAMENTO → CONCLUSÃO → CONCLUÍDA
 *
 * O Engine continua genérico.
 * As regras específicas do ciclo ficam nesta página e em
 * services/lancamentosService.js.
 * ============================================================
 */
import { createModule } from "../engine/module.js";
import { SCHEMA_LANCAMENTOS } from "../schemas/lancamentos.js";
import { listar } from "../services/crudService.js";
import { obterLocalizacao } from "../utils/geolocalizacao.js";
import {
    obterUltimoKmVeiculo,
    veiculoEmAndamento,
    extrairIdRegistro
} from "../services/lancamentosService.js";

let modulo = null;
let modo = "abertura";
let preparando = false;
let vehicleListenerRegistrado = false;

const CAMPOS_ABERTURA = [
    "data", "hora", "id_empregado", "id_veiculo",
    "passageiro_setor_motivo", "itinerario",
    "horario_inicial", "km_inicial"
];

const CAMPOS_CONCLUSAO = [
    "horario_final", "km_final", "combustivel",
    "media_consumo_combustivel", "checklist",
    "avaliacao_visual", "registro_avarias",
    "avarias_registradas", "lava_car",
    "valor_higienizacao", "notas_abastecimento",
    "notas_manutencao", "horas_extras", "revisao"
];

async function iniciarLancamentos() {
    console.log("PÁGINA LANÇAMENTOS → INICIANDO");

    const container = document.querySelector("#app");
    if (!container) {
        console.error("PÁGINA LANÇAMENTOS → #app não encontrado.");
        return;
    }

    modulo = createModule({
        entity: "lancamentos",
        schema: SCHEMA_LANCAMENTOS,
        container: "#app",
        stateName: "lancamentos",
        options: {
            titulo: "Cadastro de Lançamentos",
            tabela: "Lançamentos Cadastrados",
            permitirNovo: true,
            permitirEditar: true,
            permitirExcluir: true,
            pageSize: 10,
            colunas: [
                { name: "data", label: "Data", type: "date",
                  format: formatarData },
                { name: "hora", label: "Hora", type: "time",
                  format: formatarHora },
                { name: "empregado_matricula", label: "Empregado / Matrícula" },
                { name: "veiculo", label: "Veículo / Modelo" },
                { name: "passageiro_setor_motivo", label: "Passageiro / Setor / Motivo" },
                { name: "itinerario", label: "Itinerário" },
                
                { name: "status", label: "Status" }
            ]
        }
    });





modulo.abrirChecklist =
    abrirChecklist;

modulo.abrirAbastecimento =
    abrirAbastecimento;

modulo.abrirAvarias =
    abrirAvarias;

modulo.abrirLavaCar =
    abrirLavaCar;




    




// =================================================================================================================================
// FORMULÁRIOS RELACIONADOS
// ============================================================

function obterLancamentoAtual() {

    const estado =
        modulo.engine?.state;

    if (!estado) {
        return null;
    }

    return estado.registroEditando || null;
}


function obterContextoLancamento() {

    const lancamento =
        obterLancamentoAtual();

    if (!lancamento) {

        throw new Error(
            "Nenhum lançamento está selecionado."
        );

    }

    if (!lancamento.id) {

        throw new Error(
            "O lançamento ainda não possui ID."
        );

    }

    return {

        id_lancamento:
            lancamento.id,

        id_empregado:
            lancamento.id_empregado || "",

        id_veiculo:
            lancamento.id_veiculo || "",

        empregado_matricula:
            lancamento.empregado_matricula || "",

        veiculo:
            lancamento.veiculo || ""

    };

}


function abrirFormularioRelacionado(
    entidade
) {

    try {

        const contexto =
            obterContextoLancamento();

        console.log(
            "LANÇAMENTOS → ABRIR FORMULÁRIO RELACIONADO:",
            entidade,
            contexto
        );


        /*
         * Guarda o contexto da ocorrência.
         *
         * Os módulos específicos utilizarão
         * esses dados para preencher
         * id_lancamento, empregado e veículo.
         */

        window.lancamentoRelacionado = {

            entidade,

            contexto

        };


        /*
         * Aqui será feita a navegação/abertura
         * do formulário específico.
         */

        const evento =
            new CustomEvent(
                "lancamento:abrir-relacionado",
                {
                    detail: {
                        entidade,
                        contexto
                    }
                }
            );


        document.dispatchEvent(
            evento
        );


    } catch (erro) {

        console.error(
            "LANÇAMENTOS → ERRO AO ABRIR FORMULÁRIO:",
            erro
        );

        alert(
            erro.message ||
            "Não foi possível abrir o formulário."
        );

    }

}


function abrirChecklist() {

    try {

        const contexto = obterContextoLancamento();

        console.log(
            "LANÇAMENTOS → ABRIR CHECKLIST:",
            contexto
        );

        const url =
            `checklist.html?lancamento=${encodeURIComponent(
                contexto.id_lancamento
            )}`;

        window.location.href = url;

    } catch (erro) {

        console.error(
            "LANÇAMENTOS → ERRO AO ABRIR CHECKLIST:",
            erro
        );

        alert(
            erro.message ||
            "Não foi possível abrir o Checklist."
        );

    }

}


function abrirAbastecimento() {
    try {
        const contexto = obterContextoLancamento();
        const url = `abastecimentos.html?lancamento=${encodeURIComponent(contexto.id_lancamento)}`;
        console.log("LANÇAMENTOS → ABRIR ABASTECIMENTO:", contexto);
        window.location.href = url;
    } catch (erro) {
        console.error("LANÇAMENTOS → ERRO AO ABRIR ABASTECIMENTO:", erro);
        alert(erro.message || "Não foi possível abrir o formulário de Abastecimento.");
    }
}


function abrirAvarias() {

    try {
        const contexto = obterContextoLancamento();
        const url = `avarias.html?lancamento=${encodeURIComponent(contexto.id_lancamento)}`;
        console.log("LANÇAMENTOS → ABRIR AVARIAS:", contexto);
        window.location.href = url;
    } catch (erro) {
        console.error("LANÇAMENTOS → ERRO AO ABRIR AVARIAS:", erro);
        alert(erro.message || "Não foi possível abrir o formulário de Avarias.");
    }
}


function abrirLavaCar() {

    try {
        const contexto = obterContextoLancamento();
        const url = `lava_car.html?lancamento=${encodeURIComponent(contexto.id_lancamento)}`;
        console.log("LANÇAMENTOS → ABRIR LAVA-CAR:", contexto);
        window.location.href = url;
    } catch (erro) {
        console.error("LANÇAMENTOS → ERRO AO ABRIR LAVA-CAR:", erro);
        alert(erro.message || "Não foi possível abrir o formulário de Lava-Car.");
    }
}














    

    window.lancamentos = modulo;
    await modulo.iniciar();
    instalarControlesDoCiclo();

    const idRetorno =
        new URLSearchParams(window.location.search).get("editar");

    if (idRetorno) {
        console.log(
            "LANÇAMENTOS → REABRINDO OCORRÊNCIA:",
            idRetorno
        );

        try {
            await modulo.editar(idRetorno);
        } catch (erro) {
            console.error(
                "LANÇAMENTOS → NÃO FOI POSSÍVEL REABRIR A OCORRÊNCIA:",
                idRetorno,
                erro
            );
            // Não interrompe a inicialização da página quando o ID da URL
            // não existe mais ou não está visível para a sessão atual.
            // O usuário continua podendo consultar/criar lançamentos.
        }
    }


registrarBotoesRelacionados();
    



function registrarBotoesRelacionados() {

    const container =
        document.querySelector("#app");

    if (!container) {
        return;
    }


    /*
     * Evita registrar o mesmo evento mais de uma vez.
     */

    if (
        container.dataset
            .lancamentosRelacionadosRegistrados === "true"
    ) {
        return;
    }


    container.dataset
        .lancamentosRelacionadosRegistrados = "true";


    container.addEventListener(
        "click",
        evento => {

            const botao =
                evento.target.closest(
                    "[data-lancamento-aux]"
                );

            if (!botao) {
                return;
            }


            const acao =
                botao.dataset.lancamentoAux;


            switch (acao) {

                case "Checklist":

                    abrirChecklist();

                    break;


                case "Abastecimento":

                    abrirAbastecimento();

                    break;


                case "Avarias":

                    abrirAvarias();

                    break;


                case "Lava-car":

                    abrirLavaCar();

                    break;

            }

        }
    );

}

















    

    console.log("PÁGINA LANÇAMENTOS → MÓDULO CRIADO:", modulo);
    return modulo;
}

function instalarControlesDoCiclo() {
    const container = modulo?.form?.container;
    if (!container) return;

    garantirCampoOculto("status");
    garantirCampoOculto("localizacao");
    garantirCampoOculto("localizacao_final");

    const formulario = modulo.form.formulario;
    if (!formulario) return;

    formulario.addEventListener("submit", validarAntesDeSalvar, true);

    container.addEventListener("form:novo", async () => {
        modo = "abertura";
        configurarAbertura();
        adicionarBotoesAuxiliares();
        setValor("status", "EM ANDAMENTO");
        await capturarGPS("localizacao");
        instalarListenerVeiculo();
    });

    container.addEventListener("form:editar", async evento => {
        const registro = evento.detail || {};
        const status = normalizarStatus(registro.status);

        if (status === "EM ANDAMENTO") {
            modo = "conclusao";
            configurarConclusao(registro);
            adicionarBotoesAuxiliares();
            setValor("status", "CONCLUÍDA");
            await atualizarIndicadoresRelacionados(registro.id);
            await capturarGPS("localizacao_final");
        } else {
            modo = "edicao";
            configurarEdicao(registro);
            await atualizarIndicadoresRelacionados(registro.id);
        }
    });

    container.addEventListener("form:salvo", async evento => {
        if (modo !== "abertura") return;

        const id =
            extrairIdRegistro(evento.detail) ||
            modulo?.engine?.state?.registros?.at(-1)?.id;

        if (!id) {
            console.warn("LANÇAMENTOS → não foi possível obter o ID da ocorrência aberta.");
            return;
        }

        console.log("LANÇAMENTOS → ABERTURA SALVA:", id);
        modo = "conclusao-pendente";
        await modulo.editar(id);
    });



/*
    

    // Botões auxiliares são preparados agora, mas os formulários
    // específicos serão conectados na próxima etapa.
    container.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-lancamento-aux]");
        if (!botao) return;
        const acao = botao.dataset.lancamentoAux;
        alert(`Formulário de ${acao} será conectado na próxima etapa.`);
    });

*/


    
}

function configurarAbertura() {
    const form = modulo.form.formulario;
    if (!form) return;

    [...CAMPOS_ABERTURA].forEach(n => {
        mostrarCampo(n, true);
        setRequired(n, true);
    });

    [...CAMPOS_CONCLUSAO].forEach(n => {
        mostrarCampo(n, false);
        setRequired(n, false);
    });

    ocultarCamposInformativos();

    mostrarCampo("id_empregado", true);
    mostrarCampo("id_veiculo", true);
    mostrarCampo("data", true);
    mostrarCampo("hora", true);
    mostrarCampo("horario_inicial", true);
    mostrarCampo("km_inicial", true);

    setReadonly("data", true);
    setReadonly("hora", true);
    setReadonly("horario_inicial", true);
    setReadonly("km_inicial", true);

    setTextoBotaoSalvar("INICIAR OCORRÊNCIA");
    removerBotaoConcluir();

    setValor("status", "EM ANDAMENTO");
    setValor("localizacao_final", "");
}

function configurarConclusao(registro = {}) {
    [...CAMPOS_ABERTURA].forEach(n => mostrarCampo(n, true));
    [...CAMPOS_CONCLUSAO].forEach(n => {
        mostrarCampo(n, true);
        setRequired(n, false);
    });

    ocultarCamposInformativos();

    setRequired("horario_final", true);
    setRequired("km_final", true);

    ["data", "hora", "id_empregado", "id_veiculo",
     "passageiro_setor_motivo", "itinerario",
     "horario_inicial", "km_inicial"].forEach(n => setReadonly(n, true));

    setTextoBotaoSalvar("CONCLUIR OCORRÊNCIA");
    setValor("status", "CONCLUÍDA");
    adicionarBotoesAuxiliares();
}

function configurarEdicao() {
    [...CAMPOS_ABERTURA, ...CAMPOS_CONCLUSAO].forEach(n => mostrarCampo(n, true));
    [...CAMPOS_CONCLUSAO].forEach(n => setRequired(n, false));
    ocultarCamposInformativos();
    setTextoBotaoSalvar("ATUALIZAR");
    adicionarBotoesAuxiliares();
}

async function validarAntesDeSalvar(evento) {
    if (preparando) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        return;
    }

    if (modo !== "abertura") return;

    const idVeiculo = getValor("id_veiculo");
    if (!idVeiculo) return;

    try {
        const ocupado = await veiculoEmAndamento(idVeiculo);
        if (ocupado) {
            evento.preventDefault();
            evento.stopImmediatePropagation();
            alert("Este veículo já possui uma ocorrência EM ANDAMENTO.");
            return;
        }
    } catch (erro) {
        console.error("LANÇAMENTOS → erro ao verificar veículo:", erro);
        // A proteção definitiva deve permanecer no Supabase.
    }
}

function instalarListenerVeiculo() {
    if (vehicleListenerRegistrado) return;

    const select = getCampo("id_veiculo");
    if (!select) return;

    vehicleListenerRegistrado = true;
    select.addEventListener("change", async () => {
        if (modo !== "abertura") return;

        const idVeiculo = select.value;
        if (!idVeiculo) {
            setValor("km_inicial", "");
            return;
        }

        try {
            const ocupado = await veiculoEmAndamento(idVeiculo);
            if (ocupado) {
                setReadonly("km_inicial", true);
                setTextoBotaoSalvar("VEÍCULO EM ANDAMENTO");
                alert("Este veículo já possui uma ocorrência EM ANDAMENTO. Selecione outro veículo.");
                return;
            }

            const km = await obterUltimoKmVeiculo(idVeiculo);
            setValor("km_inicial", String(km));
            setReadonly("km_inicial", true);
            setTextoBotaoSalvar("INICIAR OCORRÊNCIA");
            console.log("LANÇAMENTOS → KM INICIAL:", km);
        } catch (erro) {
            console.error("LANÇAMENTOS → erro ao obter Km Inicial:", erro);
            setValor("km_inicial", "");
        }
    });
}

async function capturarGPS(nomeCampo) {
    const campo = getCampo(nomeCampo);
    if (!campo) return;

    preparando = true;
    const botao = getBotaoSalvar();
    if (botao) botao.disabled = true;

    try {
        const coordenadas = await obterLocalizacao();
        setValor(nomeCampo, coordenadas);
        console.log(`LANÇAMENTOS → ${nomeCampo}:`, coordenadas);
    } catch (erro) {
        console.error(`LANÇAMENTOS → GPS ${nomeCampo}:`, erro);
        alert(`Não foi possível obter a localização GPS.\n\n${erro.message}\n\nAutorize a localização e tente novamente.`);
    } finally {
        preparando = false;
        if (botao) botao.disabled = false;
    }
}

function adicionarBotoesAuxiliares() {
    const form = modulo?.form?.formulario;
    if (!form) return;

    let grupo = form.querySelector("[data-lancamento-auxiliares]");
    if (!grupo) {
        grupo = document.createElement("div");
        grupo.dataset.lancamentoAuxiliares = "true";
        grupo.className = "lancamento-auxiliares";
        grupo.innerHTML = `
            <div class="lancamento-auxiliares-titulo">Dados complementares</div>
            <div class="lancamento-auxiliares-lista">
                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Checklist">Checklist</button>
                    <div class="lancamento-aux-info" data-indicador="checklist">NÃO REGISTRADO</div>
                </div>

                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Abastecimento">Abastecimento</button>
                    <div class="lancamento-aux-info" data-indicador="abastecimento-status">NÃO REGISTRADO</div>
                    <div class="lancamento-aux-valor" data-indicador="abastecimento-valor">Valor da nota: —</div>
                </div>

                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Avarias">Avarias</button>
                    <div class="lancamento-aux-info" data-indicador="avarias">NÃO REGISTRADO</div>
                </div>

                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Lava-car">Lava-Car</button>
                    <div class="lancamento-aux-info" data-indicador="lava-car">NÃO REALIZADO</div>
                    <div class="lancamento-aux-valor" data-indicador="lava-car-valor">Valor: —</div>
                </div>
            </div>
        `;
        const actions = form.querySelector(".engine-form-actions");
        (actions || form).before(grupo);
    }
    grupo.hidden = false;
}

function ocultarCamposInformativos() {
    [
        "checklist",
        "lava_car",
        "valor_higienizacao",
        "notas_abastecimento",
        "notas_manutencao"
    ].forEach(nome => {
        mostrarCampo(nome, false);
        setRequired(nome, false);
    });
}

async function atualizarIndicadoresRelacionados(idLancamento) {
    if (!idLancamento) return;

    adicionarBotoesAuxiliares();

    const grupo = modulo?.form?.formulario?.querySelector("[data-lancamento-auxiliares]");
    if (!grupo) return;

    const indicadores = {
        checklist: grupo.querySelector('[data-indicador="checklist"]'),
        abastecimentoStatus: grupo.querySelector('[data-indicador="abastecimento-status"]'),
        abastecimentoValor: grupo.querySelector('[data-indicador="abastecimento-valor"]'),
        avarias: grupo.querySelector('[data-indicador="avarias"]'),
        lavaCar: grupo.querySelector('[data-indicador="lava-car"]'),
        lavaCarValor: grupo.querySelector('[data-indicador="lava-car-valor"]')
    };

    definirIndicador(indicadores.checklist, "CARREGANDO...");
    definirIndicador(indicadores.abastecimentoStatus, "CARREGANDO...");
    definirIndicador(indicadores.abastecimentoValor, "Valor da nota: —");
    definirIndicador(indicadores.avarias, "CARREGANDO...");
    definirIndicador(indicadores.lavaCar, "CARREGANDO...");
    definirIndicador(indicadores.lavaCarValor, "Valor: —");

    try {
        const [checklists, abastecimentos, avarias, lavaCars] = await Promise.all([
            listar("checklist", { id_lancamento: idLancamento }),
            listar("abastecimento", { id_lancamento: idLancamento }),
            listar("avarias", { id_lancamento: idLancamento }),
            listar("lava_car", { id_lancamento: idLancamento })
        ]);

        const checklist = Array.isArray(checklists) ? checklists[0] : null;
        const abastecimento = Array.isArray(abastecimentos) ? abastecimentos[0] : null;
        const avaria = Array.isArray(avarias) ? avarias[0] : null;
        const lavaCar = Array.isArray(lavaCars) ? lavaCars[0] : null;

        definirIndicador(
            indicadores.checklist,
            checklist ? "REGISTRADO" : "NÃO REGISTRADO"
        );

        definirIndicador(
            indicadores.abastecimentoStatus,
            abastecimento ? "REGISTRADO" : "NÃO REGISTRADO"
        );

        definirIndicador(
            indicadores.abastecimentoValor,
            `Valor da nota: ${abastecimento ? formatarMoeda(obterValorAbastecimento(abastecimento)) : "—"}`
        );

        definirIndicador(
            indicadores.avarias,
            avaria
                ? "REGISTRADO"
                : "NÃO REGISTRADO"
        );

        definirIndicador(
            indicadores.lavaCar,
            lavaCar ? "REALIZADO" : "NÃO REALIZADO"
        );

        definirIndicador(
            indicadores.lavaCarValor,
            `Valor: ${lavaCar ? formatarMoeda(lavaCar.valor) : "—"}`
        );

        // Persiste somente valores compatíveis com os tipos das colunas.
        // A apresentação amigável permanece exclusivamente nos indicadores visuais.
        setValor("checklist", checklist ? "REGISTRADO" : "NÃO REGISTRADO");

        const valorLavaCar = lavaCar ? Number(lavaCar.valor) : null;
        setValor("lava_car", Number.isFinite(valorLavaCar) ? valorLavaCar.toFixed(2) : "");

        // Mantém o campo histórico de valor da higienização, quando existir.
        setValor("valor_higienizacao", Number.isFinite(valorLavaCar) ? valorLavaCar.toFixed(2) : "");

        const valorAbastecimento = abastecimento ? obterValorAbastecimento(abastecimento) : null;
        setValor(
            "notas_abastecimento",
            Number.isFinite(valorAbastecimento) ? valorAbastecimento.toFixed(2) : ""
        );

        // Campo booleano original de avarias: preserva a compatibilidade com o banco.
        setValor("registro_avarias", avaria ? "SIM" : "NÃO");

        if (avaria) {
            setValor("notas_manutencao", avaria.avarias_registradas || avaria.relato_avaria || "Avaria registrada.");
        } else {
            setValor("notas_manutencao", "");
        }

        console.log("LANÇAMENTOS → INDICADORES ATUALIZADOS:", {
            idLancamento,
            checklist: Boolean(checklist),
            abastecimento: Boolean(abastecimento),
            avarias: Boolean(avaria),
            lavaCar: Boolean(lavaCar),
            valorHigienizacao: lavaCar?.valor ?? null
        });

    } catch (erro) {
        console.error("LANÇAMENTOS → ERRO AO ATUALIZAR INDICADORES:", erro);
        definirIndicador(indicadores.checklist, "NÃO REGISTRADO");
        definirIndicador(indicadores.abastecimentoStatus, "NÃO DISPONÍVEL");
        definirIndicador(indicadores.abastecimentoValor, "Valor da nota: —");
        definirIndicador(indicadores.avarias, "NÃO DISPONÍVEL");
        definirIndicador(indicadores.lavaCar, "NÃO REALIZADO");
        definirIndicador(indicadores.lavaCarValor, "Valor: —");
    }
}

function definirIndicador(elemento, texto) {
    if (elemento) elemento.textContent = texto;
}

function formatarOpcaoLavaCar(opcao) {
    const valor = String(opcao || "").trim().toLowerCase();

    const opcoes = {
        aparencia_creta: "APARÊNCIA — CRETA",
        aparencia_trail: "APARÊNCIA — TRAIL",
        completa_creta: "COMPLETA — CRETA",
        completa_cera_creta: "COMPLETA COM CERA — CRETA",
        completa_trail: "COMPLETA — TRAIL",
        completa_cera_trail: "COMPLETA COM CERA — TRAIL"
    };

    if (opcoes[valor]) return opcoes[valor];

    // Fallback para futuras opções: transforma snake_case em texto legível.
    if (!valor) return "SERVIÇO NÃO INFORMADO";

    return valor
        .replace(/_/g, " ")
        .replace(/\b\w/g, letra => letra.toUpperCase())
        .toUpperCase();
}


function obterValorAbastecimento(registro = {}) {
    const valor = Number(registro.valor_total_nota);
    return Number.isFinite(valor) ? valor : null;
}

function formatarResumoAbastecimento(registro = {}) {
    const tipo = String(registro.tipo_combustivel || "").trim();
    const litros = Number(registro.qtde_l);
    const total = Number(registro.valor_total_nota);

    const partes = ["REGISTRADO"];
    if (tipo) partes.push(tipo);
    if (Number.isFinite(litros)) partes.push(`${litros.toFixed(3)} L`);
    if (Number.isFinite(total)) partes.push(formatarMoeda(total));

    return partes.join(" — ");
}

function formatarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "—";

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function removerBotaoConcluir() {
    // Mantido como ponto de extensão para a UI futura.
}

function garantirCampoOculto(nome) {
    const form = modulo?.form?.formulario;
    if (!form || form.elements.namedItem(nome)) return;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = nome;
    form.appendChild(input);
}

function getCampo(nome) {
    return modulo?.form?.formulario?.elements?.namedItem(nome) || null;
}

function getValor(nome) {
    const campo = getCampo(nome);
    return campo ? campo.value : "";
}

function setValor(nome, valor) {
    const campo = getCampo(nome);
    if (campo) campo.value = valor ?? "";
}

function mostrarCampo(nome, visivel) {
    const campo = getCampo(nome);
    if (!campo) return;
    const wrapper = campo.closest("[data-engine-field]");
    if (wrapper) wrapper.style.display = visivel ? "" : "none";
}

function setRequired(nome, requerido) {
    const campo = getCampo(nome);
    if (!campo) return;
    campo.required = requerido;
}

function setReadonly(nome, readonly) {
    const campo = getCampo(nome);
    if (!campo) return;
    if (campo.type === "checkbox" || campo.tagName === "SELECT") {
        campo.disabled = false;
        campo.dataset.lifecycleReadonly = readonly ? "true" : "false";
        return;
    }
    campo.readOnly = readonly;
}

function getBotaoSalvar() {
    return modulo?.form?.formulario?.querySelector("[data-engine-salvar]") || null;
}

function setTextoBotaoSalvar(texto) {
    const botao = getBotaoSalvar();
    if (botao) botao.textContent = texto;
}

function normalizarStatus(valor) {
    return String(valor ?? "").trim().toUpperCase().replace(/_/g, " ");
}

function formatarData(valor) {
    const texto = String(valor ?? "").trim();
    if (!texto) return "";
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return texto;
}

function formatarHora(valor) {
    const texto = String(valor ?? "").trim();
    const m = texto.match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : texto;
}

export {
    iniciarLancamentos,
    iniciarLancamentos as iniciar
};
