/**
 * ============================================================
 * PÁGINA — LANÇAMENTOS
 * Painel Frota
 *
 * Ciclo:
 *     NOVO → ABERTURA → EM ANDAMENTO → CONCLUSÃO → CONCLUÍDO
 *
 * O Engine continua genérico.
 * As regras específicas do ciclo ficam nesta página e em
 * services/lancamentosService.js.
 * ============================================================
 */
import { createModule } from "../engine/module.js";
import { SCHEMA_LANCAMENTOS } from "../schemas/lancamentos.js";
import { listar, atualizar } from "../services/crudService.js";
import { obterLocalizacao } from "../utils/geolocalizacao.js";
import {
    obterUltimoKmVeiculo,
    obterAlertaRevisaoVeiculo,
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
    "avaliacao_visual",
    "avarias_registradas",
    "km_final",
    "horario_final",
    "combustivel",
    "media_consumo_combustivel",
    "distancia_percorrida",
    "duracao_atendimento",
    "lava_car",
    "valor_higienizacao",
    "notas_abastecimento",
    "notas_manutencao",
    "checklist",
    "horas_extras",
    "revisao"
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
            visualizarAoClicarNaLinha: true,
            visualizarUrl: "lancamentos_view.html",
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

modulo.abrirManutencao =
    abrirManutencao;




    




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
        const id = String(contexto.id_lancamento || "").trim();
        sessionStorage.setItem("painelFrota:lancamentoAtual", id);
        localStorage.setItem("painelFrota:lancamentoAtual", id);
        const url = `abastecimentos.html?lancamento=${encodeURIComponent(id)}`;
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


function abrirManutencao() {
    try {
        const contexto = obterContextoLancamento();
        const url = `manutencao.html?lancamento=${encodeURIComponent(contexto.id_lancamento)}`;
        console.log("LANÇAMENTOS → ABRIR MANUTENÇÃO:", contexto);
        window.location.href = url;
    } catch (erro) {
        console.error("LANÇAMENTOS → ERRO AO ABRIR MANUTENÇÃO:", erro);
        alert(erro.message || "Não foi possível abrir o formulário de Manutenção.");
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

                case "Status":
                    break;


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


                case "Manutenção":

                    abrirManutencao();

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

    formulario.addEventListener("submit", interceptarESalvarComCalculados, true);

    container.addEventListener("form:novo", async () => {
        modo = "abertura";

        // O Engine já faz um reset genérico, mas os campos desta página
        // podem ter sido preenchidos programaticamente durante a edição
        // de uma ocorrência concluída. Limpamos explicitamente aqui,
        // assim que o usuário abre uma NOVA ocorrência, e não somente
        // depois do clique em "INICIAR OCORRÊNCIA".
        limparDadosParaNovaOcorrencia();

        configurarAbertura();
        adicionarBotoesAuxiliares();
        resetarIndicadoresAuxiliares();
        setValor("status", "EM ANDAMENTO");
        await capturarGPS("localizacao");
        instalarListenerVeiculo();
    });

    container.addEventListener("form:editar", async evento => {
        const registro = evento.detail || {};
        const kmInicial = converterNumero(registro?.km_inicial);
        const kmFinal = converterNumero(registro?.km_final);
        const concluida = Number.isFinite(kmFinal) &&
            (!Number.isFinite(kmInicial) || kmFinal >= kmInicial);

        // O status não é mais lido como uma escolha do usuário.
        // Ele é derivado exclusivamente da existência de Km Final válido
        // e, quando houver Km Inicial, da regra Km Final >= Km Inicial.
        if (!concluida) {
            modo = "conclusao";
            configurarConclusao(registro);
            adicionarBotoesAuxiliares();
            setValor("status", "EM ANDAMENTO");
            await atualizarIndicadoresRelacionados(registro.id);
            await capturarGPS("localizacao_final");
        } else {
            modo = "edicao";
            configurarEdicao(registro);
            setValor("status", "CONCLUÍDO");
            await atualizarIndicadoresRelacionados(registro.id);
        }
    });

    

    container.addEventListener("form:salvo", async evento => {

    const id =
        extrairIdRegistro(evento.detail) ||
        modulo?.engine?.state?.registros?.at(-1)?.id;

    // ========================================================
    // ABERTURA SALVA
    // ========================================================
    if (modo === "abertura") {

        if (!id) {
            console.warn(
                "LANÇAMENTOS → não foi possível obter o ID da ocorrência aberta."
            );
            return;
        }

        console.log(
            "LANÇAMENTOS → ABERTURA SALVA:",
            id
        );

        modo = "conclusao-pendente";

        await modulo.editar(id);

        return;
    }

    // ========================================================
    // CONCLUSÃO SALVA
    // ========================================================
    if (
        modo === "conclusao" ||
        modo === "conclusao-pendente"
    ) {

        console.log(
            "LANÇAMENTOS → OCORRÊNCIA CONCLUÍDA:",
            id
        );

        modo = "edicao";

        // Agora que o registro foi efetivamente salvo como
        // CONCLUÍDO, os campos calculados podem ser exibidos.
        mostrarCampo(
            "distancia_percorrida",
            true
        );

        mostrarCampo(
            "duracao_atendimento",
            true
        );

        // O registro passa a ser tratado como uma ocorrência
        // já concluída.
        setValor(
            "status",
            "CONCLUÍDO"
        );

        setTextoBotaoSalvar(
            "ATUALIZAR"
        );

        return;
    }
});






    
}

function limparDadosParaNovaOcorrencia() {
    const form = modulo?.form?.formulario;
    if (!form) return;

    // Limpa também valores que tenham sido colocados por JavaScript
    // (selects, campos ocultos e indicadores), evitando herdar a
    // ocorrência anterior.
    // DATA, HORA e HORÁRIO INICIAL são preenchidos automaticamente pelo
    // Engine antes do evento "form:novo". Não os apagamos aqui.
    // O KM INICIAL continua sendo obtido automaticamente quando o veículo
    // é selecionado, exatamente como no fluxo original.
    const preservarAutomaticos = new Set([
        "data",
        "hora",
        "horario_inicial"
    ]);

    form.querySelectorAll("[name]").forEach(campo => {
        if (preservarAutomaticos.has(campo.name)) return;

        if (campo.type === "checkbox" || campo.type === "radio") {
            campo.checked = false;
            return;
        }

        if (campo.tagName === "SELECT") {
            campo.selectedIndex = -1;
            campo.value = "";
            return;
        }

        campo.value = "";
    });

    // Estado específico da ocorrência.
    setValor("status", "EM ANDAMENTO");
    setValor("localizacao", "");
    setValor("localizacao_final", "");

    // Impede que o contexto de uma ocorrência anterior seja reutilizado
    // pelos formulários complementares.
    window.lancamentoRelacionado = null;

    console.log("LANÇAMENTOS → NOVA OCORRÊNCIA → DADOS ANTERIORES LIMPOS");
}

function resetarIndicadoresAuxiliares() {
    const grupo = modulo?.form?.formulario?.querySelector("[data-lancamento-auxiliares]");
    if (!grupo) return;

    atualizarBotaoIndicador(
        grupo.querySelector('[data-lancamento-aux="Status"]'),
        true,
        "Status: EM ANDAMENTO",
        false
    );
    atualizarBotaoIndicador(grupo.querySelector('[data-lancamento-aux="Checklist"]'), false, "Checklist", false);
    atualizarBotaoIndicador(grupo.querySelector('[data-lancamento-aux="Abastecimento"]'), false, "Abastecimento", false);
    atualizarBotaoIndicador(grupo.querySelector('[data-lancamento-aux="Avarias"]'), false, "Avarias", false);
    atualizarBotaoIndicador(grupo.querySelector('[data-lancamento-aux="Lava-car"]'), false, "Lava-Car", false);
    atualizarBotaoIndicador(grupo.querySelector('[data-lancamento-aux="Manutenção"]'), false, "Manutenção", false);
    definirIndicador(grupo.querySelector('[data-indicador="abastecimento-valor"]'), "Valor da nota: —");
    definirIndicador(grupo.querySelector('[data-indicador="lava-car-valor"]'), "Valor: —");
    definirIndicador(grupo.querySelector('[data-indicador="manutencao-valor"]'), "Valor da nota: —");
}

function configurarAbertura() {
    const form = modulo?.form?.formulario;
    if (!form) return;

    // ========================================================
    // FASE: INICIAR OCORRÊNCIA
    // Somente estes 8 campos ficam visíveis/editáveis nesta fase.
    // Todos os dados complementares ficam exclusivamente para a
    // fase de conclusão, depois que o lançamento já possui ID.
    // ========================================================
    [...CAMPOS_ABERTURA].forEach(n => {
        mostrarCampo(n, true);
        setRequired(n, true);
    });

    [...CAMPOS_CONCLUSAO].forEach(n => {
        mostrarCampo(n, false);
        setRequired(n, false);
    });

    // Garante que nenhum campo complementar residual de uma edição
    // anterior permaneça visível.
    ocultarCamposInformativos();
    ocultarDadosComplementares();
    

    // Status é informativo e calculado pelo sistema.
    mostrarCampo("status", true);
    setReadonly("status", true);

    setReadonly("data", true);
    setReadonly("hora", true);
    setReadonly("horario_inicial", false);
    setReadonly("km_inicial", true);
    setReadonly("revisao", true);

    setTextoBotaoSalvar("INICIAR OCORRÊNCIA");
    removerBotaoConcluir();

    setValor("status", "EM ANDAMENTO");
    setValor("localizacao_final", "");
}

function configurarConclusao(registro = {}) {
    const form = modulo?.form?.formulario;
    if (!form) return;

    // ========================================================
    // FASE: CONCLUIR OCORRÊNCIA
    // Mantém os 8 dados da abertura somente para consulta e
    // apresenta aqui todos os dados complementares.
    // ========================================================
    [...CAMPOS_ABERTURA].forEach(n => {
        mostrarCampo(n, true);
        setRequired(n, false);
    });

    [...CAMPOS_CONCLUSAO].forEach(n => {
        mostrarCampo(n, true);
        setRequired(n, false);
    });

    // Campos auxiliares de Checklist, Abastecimento, Avarias,
    // Lava-Car e Manutenção são acessados por seus botões nesta fase.
    ocultarCamposInformativos();
    
    mostrarCampo("status", true);
    mostrarCampo("distancia_percorrida", false);
    mostrarCampo("duracao_atendimento", false);

    setRequired("horario_final", true);
    setRequired("km_final", true);

    // ====================================================
    // TODOS OS CAMPOS DA ABERTURA FICAM EDITÁVEIS
    // PARA REVISÃO DURANTE A CONCLUSÃO
    // ====================================================
    [
        "data",
        "hora",
        "id_empregado",
        "id_veiculo",
        "passageiro_setor_motivo",
        "itinerario",
        "horario_inicial",
        "km_inicial"
    ].forEach(n => setReadonly(n, false));

    
    setReadonly("revisao", true);
    setReadonly("status", true);
    sincronizarRevisaoDoVeiculo(registro?.id_veiculo || getValor("id_veiculo"));

    setTextoBotaoSalvar("CONCLUIR OCORRÊNCIA");

    // Enquanto a ocorrência estiver apenas na tela de conclusão, ela continua
    // EM ANDAMENTO. O status só será alterado para CONCLUÍDO no submit, depois
    // da validação do Km Final.
    setValor("status", "EM ANDAMENTO");
    mostrarDadosComplementares();
}
function configurarEdicao() {
    [...CAMPOS_ABERTURA, ...CAMPOS_CONCLUSAO].forEach(n => mostrarCampo(n, true));
    [...CAMPOS_CONCLUSAO].forEach(n => setRequired(n, false));
    mostrarCampo("status", true);
    setReadonly("status", true);
    ocultarCamposInformativos();
    setTextoBotaoSalvar("ATUALIZAR");
    adicionarBotoesAuxiliares();
}

async function interceptarESalvarComCalculados(evento) {
    // O listener genérico do Engine também escuta submit. Para garantir que
    // os campos calculados estejam no payload ANTES do POST/PATCH, este
    // listener interrompe o fluxo genérico, calcula/preenche os valores e
    // chama form.salvar() diretamente.
    if (preparando || modulo?.form?.salvando) return;

    if (modo === "abertura") {
        await validarAntesDeSalvar(evento);
        return;
    }

    evento.preventDefault();
    evento.stopImmediatePropagation();

    const formularioAtual = modulo?.form?.formulario;
    if (!formularioAtual) return;

    if (!formularioAtual.checkValidity()) {
        formularioAtual.reportValidity();
        return;
    }

    try {
        // ====================================================
        // STATUS AUTOMÁTICO DA OCORRÊNCIA
        // ====================================================
        // Na fase de conclusão, o lançamento continua EM ANDAMENTO
        // até que o Km Final esteja realmente preenchido.
        const valorKmFinal = String(getValor("km_final") ?? "").trim();
        const kmFinal = converterNumero(valorKmFinal);

        if (!valorKmFinal || !Number.isFinite(kmFinal)) {
            setValor("status", "EM ANDAMENTO");
            const campoKmFinal = formularioAtual.querySelector('[name="km_final"]');
            campoKmFinal?.focus();
            campoKmFinal?.reportValidity?.();
            console.warn("LANÇAMENTOS → CONCLUSÃO BLOQUEADA: Km Final não preenchido.");
            return;
        }

        const kmInicial = converterNumero(getValor("km_inicial"));
        if (Number.isFinite(kmInicial) && kmFinal < kmInicial) {
            setValor("status", "EM ANDAMENTO");
            const campoKmFinal = formularioAtual.querySelector('[name="km_final"]');
            campoKmFinal?.focus();
            console.warn("LANÇAMENTOS → CONCLUSÃO BLOQUEADA: Km Final menor que Km Inicial.");
            return;
        }

        await preencherCamposCalculados();

        // O status é derivado exclusivamente da regra do Km Final.
        setValor("status", "CONCLUÍDO");
        console.log("LANÇAMENTOS → STATUS AUTOMÁTICO: CONCLUÍDO");

        await modulo.form.salvar();
    } catch (erro) {
        console.error("LANÇAMENTOS → ERRO AO PREPARAR CAMPOS CALCULADOS:", erro);
    }
}

async function preencherCamposCalculados() {
    const kmInicial = converterNumero(getValor("km_inicial"));
    const kmFinal = converterNumero(getValor("km_final"));

    if (Number.isFinite(kmInicial) && Number.isFinite(kmFinal)) {
        const distancia = kmFinal - kmInicial;
        if (distancia >= 0) {
            setValor("distancia_percorrida", Number(distancia.toFixed(2)));
        } else {
            throw new Error("Km Final não pode ser menor que Km Inicial.");
        }
    } else {
        setValor("distancia_percorrida", "");
    }

    const horarioInicial = getValor("horario_inicial");
    const horarioFinal = getValor("horario_final");
    const minutos = calcularDiferencaMinutos(horarioInicial, horarioFinal);

    if (Number.isFinite(minutos)) {
        setValor("duracao_atendimento", formatarDuracao(minutos));
    } else {
        setValor("duracao_atendimento", "");
    }

    const idEmpregado = getValor("id_empregado");
    if (idEmpregado) {
        const empregados = await listar("empregados", { id: idEmpregado });
        const empregado = Array.isArray(empregados) ? empregados[0] : null;
        const classificacao = empregado?.classificacao ?? "";
        setValor("classificacao", classificacao);
        console.log("LANÇAMENTOS → CLASSIFICAÇÃO DO EMPREGADO:", classificacao);
    } else {
        setValor("classificacao", "");
    }

    console.log("LANÇAMENTOS → CAMPOS CALCULADOS:", {
        distancia_percorrida: getValor("distancia_percorrida"),
        classificacao: getValor("classificacao"),
        duracao_atendimento: getValor("duracao_atendimento")
    });
}

function converterNumero(valor) {
    if (valor === null || valor === undefined || valor === "") return NaN;
    const numero = Number(String(valor).replace(",", "."));
    return Number.isFinite(numero) ? numero : NaN;
}

function calcularDiferencaMinutos(inicio, fim) {
    if (!inicio || !fim) return NaN;
    const [hi, mi] = String(inicio).split(":").map(Number);
    const [hf, mf] = String(fim).split(":").map(Number);
    if (![hi, mi, hf, mf].every(Number.isFinite)) return NaN;

    let totalInicio = hi * 60 + mi;
    let totalFim = hf * 60 + mf;
    let diferenca = totalFim - totalInicio;

    // Permite atendimento que atravesse a meia-noite.
    if (diferenca < 0) diferenca += 24 * 60;
    return diferenca;
}

function formatarDuracao(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
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

async function sincronizarRevisaoDoVeiculo(idVeiculo = getValor("id_veiculo")) {
    if (!idVeiculo) {
        setValor("revisao", "");
        return;
    }

    try {
        const alerta = await obterAlertaRevisaoVeiculo(idVeiculo);
        setValor("revisao", alerta);
        console.log("LANÇAMENTOS → REVISÃO SINCRONIZADA:", alerta);
    } catch (erro) {
        console.error("LANÇAMENTOS → erro ao obter Alerta de Revisão do veículo:", erro);
        setValor("revisao", "");
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
            setValor("revisao", "");
            return;
        }

        try {
            const ocupado = await veiculoEmAndamento(idVeiculo);
            if (ocupado) {
                setReadonly("km_inicial", true);
                setValor("revisao", "");
                setTextoBotaoSalvar("VEÍCULO EM ANDAMENTO");
                alert("Este veículo já possui uma ocorrência EM ANDAMENTO. Selecione outro veículo.");
                return;
            }

            const km = await obterUltimoKmVeiculo(idVeiculo);
            setValor("km_inicial", String(km));
            setReadonly("km_inicial", true);
            await sincronizarRevisaoDoVeiculo(idVeiculo);
            setReadonly("revisao", true);
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

function obterGrupoDadosComplementares() {
    return modulo?.form?.formulario?.querySelector("[data-lancamento-auxiliares]") || null;
}

function mostrarDadosComplementares() {
    const grupo = obterGrupoDadosComplementares();
    if (grupo) grupo.hidden = false;
}

function ocultarDadosComplementares() {
    const grupo = obterGrupoDadosComplementares();
    if (grupo) grupo.hidden = true;
}

function adicionarBotoesAuxiliares() {
    const form = modulo?.form?.formulario;
    if (!form) return;

    instalarControleStatusKmFinal(form);

    let grupo = form.querySelector("[data-lancamento-auxiliares]");
    if (!grupo) {
        grupo = document.createElement("div");
        grupo.dataset.lancamentoAuxiliares = "true";
        grupo.className = "lancamento-auxiliares";
        grupo.innerHTML = `
            <div class="lancamento-auxiliares-titulo">Dados complementares</div>
            <div class="lancamento-auxiliares-lista">
                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Status">Status: EM ANDAMENTO</button>
                </div>

                <div class="lancamento-aux-item">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-lancamento-aux="Checklist"
                        data-checklist-registrado="false"
                    >Checklist</button>
                </div>

                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Abastecimento">Abastecimento</button>
                    <div class="lancamento-aux-valor" data-indicador="abastecimento-valor">Valor da nota: —</div>
                </div>

                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Avarias">Avarias</button>
                </div>

                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Lava-car">Lava-Car</button>
                    <div class="lancamento-aux-valor" data-indicador="lava-car-valor">Valor: —</div>
                </div>

                <div class="lancamento-aux-item">
                    <button type="button" class="btn btn-secondary" data-lancamento-aux="Manutenção">Manutenção</button>
                    <div class="lancamento-aux-valor" data-indicador="manutencao-valor">Valor da nota: —</div>
                </div>
            </div>
        `;
        const actions = form.querySelector(".engine-form-actions");
        (actions || form).before(grupo);
    }
    // O grupo só aparece na conclusão. Na abertura permanece oculto.
    grupo.hidden = modo === "abertura";
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

    const botoes = {
        status: grupo.querySelector('[data-lancamento-aux="Status"]'),
        checklist: grupo.querySelector('[data-lancamento-aux="Checklist"]'),
        abastecimento: grupo.querySelector('[data-lancamento-aux="Abastecimento"]'),
        avarias: grupo.querySelector('[data-lancamento-aux="Avarias"]'),
        lavaCar: grupo.querySelector('[data-lancamento-aux="Lava-car"]'),
        manutencao: grupo.querySelector('[data-lancamento-aux="Manutenção"]')
    };

    const indicadores = {
        abastecimentoValor: grupo.querySelector('[data-indicador="abastecimento-valor"]'),
        lavaCarValor: grupo.querySelector('[data-indicador="lava-car-valor"]'),
        manutencaoValor: grupo.querySelector('[data-indicador="manutencao-valor"]')
    };

    definirIndicador(indicadores.abastecimentoValor, "Valor da nota: —");
    definirIndicador(indicadores.lavaCarValor, "Valor: —");
    definirIndicador(indicadores.manutencaoValor, "Valor da nota: —");

    try {
        const [checklists, abastecimentos, avarias, lavaCars, manutencoes] = await Promise.all([
            listar("checklist", { id_lancamento: idLancamento }),
            listar("abastecimento", { id_lancamento: idLancamento }),
            listar("avarias", { id_lancamento: idLancamento }),
                listar("lava_car", { id_lancamento: idLancamento }),
            listar("manutencao", { id_lancamento: idLancamento })
        ]);

        const checklist = Array.isArray(checklists) ? checklists[0] : null;
        const abastecimento = Array.isArray(abastecimentos) ? abastecimentos[0] : null;
        const avaria = Array.isArray(avarias) ? avarias[0] : null;
        const lavaCar = Array.isArray(lavaCars) ? lavaCars[0] : null;
        const manutencao = Array.isArray(manutencoes) ? manutencoes[0] : null;

        const kmFinalIndicador = converterNumero(getValor("km_final"));
        const kmInicialIndicador = converterNumero(getValor("km_inicial"));
        const statusCalculado = Number.isFinite(kmFinalIndicador) &&
            (!Number.isFinite(kmInicialIndicador) || kmFinalIndicador >= kmInicialIndicador)
            ? "CONCLUÍDO"
            : "EM ANDAMENTO";
        setValor("status", statusCalculado);
        atualizarBotaoIndicador(
            botoes.status,
            true,
            `Status: ${statusCalculado}`,
            statusCalculado === "CONCLUÍDO"
        );
        atualizarBotaoIndicador(botoes.checklist, Boolean(checklist), "Checklist", Boolean(checklist));
        atualizarBotaoIndicador(botoes.abastecimento, Boolean(abastecimento), "Abastecimento", Boolean(abastecimento));
        atualizarBotaoIndicador(botoes.avarias, Boolean(avaria), "Avarias", Boolean(avaria));
        atualizarBotaoIndicador(botoes.lavaCar, Boolean(lavaCar), "Lava-Car", Boolean(lavaCar));
        atualizarBotaoIndicador(botoes.manutencao, Boolean(manutencao), "Manutenção", Boolean(manutencao));

        definirIndicador(
            indicadores.abastecimentoValor,
            `Valor da nota: ${abastecimento ? formatarMoeda(obterValorAbastecimento(abastecimento)) : "—"}`
        );

        definirIndicador(
            indicadores.lavaCarValor,
            `Valor: ${lavaCar ? formatarMoeda(lavaCar.valor) : "—"}`
        );

        // Persiste somente valores compatíveis com os tipos das colunas.
        // A apresentação amigável permanece exclusivamente nos indicadores visuais.
        const statusChecklist = checklist ? "REGISTRADO" : "NÃO REGISTRADO";
        setValor("checklist", statusChecklist);

        // Mantém a coluna public.lancamentos.checklist sincronizada com
        // a existência real do registro relacionado. O campo é TEXT.
        try {
            await atualizar("lancamentos", {
                id: idLancamento,
                checklist: statusChecklist
            });
            console.log(
                "LANÇAMENTOS → CHECKLIST PERSISTIDO:",
                { id: idLancamento, checklist: statusChecklist }
            );
        } catch (erroChecklist) {
            console.error(
                "LANÇAMENTOS → ERRO AO PERSISTIR CHECKLIST:",
                erroChecklist
            );
        }

        const opcaoLavaCar = lavaCar ? String(lavaCar.opcao || "").trim() : "";
        const valorLavaCar = lavaCar ? Number(lavaCar.valor) : null;
        setValor("lava_car", opcaoLavaCar);

        // Mantém o valor numérico separado para relatórios e compatibilidade.
        setValor("valor_higienizacao", Number.isFinite(valorLavaCar) ? valorLavaCar.toFixed(2) : "");

        // A coluna public.lancamentos.lava_car registra a OPÇÃO escolhida
        // (ex.: completa_creta), enquanto valor_higienizacao mantém o valor numérico.
        if (opcaoLavaCar) {
            try {
                await atualizar("lancamentos", {
                    id: idLancamento,
                    lava_car: opcaoLavaCar,
                    valor_higienizacao: Number.isFinite(valorLavaCar) ? Number(valorLavaCar.toFixed(2)) : null
                });
                console.log("LANÇAMENTOS → LAVA-CAR PERSISTIDO:", {
                    id: idLancamento,
                    lava_car: opcaoLavaCar,
                    valor_higienizacao: Number.isFinite(valorLavaCar) ? Number(valorLavaCar.toFixed(2)) : null
                });
            } catch (erroPersistenciaLavaCar) {
                console.error("LANÇAMENTOS → ERRO AO PERSISTIR LAVA-CAR:", erroPersistenciaLavaCar);
            }
        }

        const valorAbastecimento = abastecimento ? obterValorAbastecimento(abastecimento) : null;
        setValor(
            "notas_abastecimento",
            Number.isFinite(valorAbastecimento) ? valorAbastecimento.toFixed(2) : ""
        );

        // O valor da nota é um dado derivado do registro de abastecimento.
        // Persistimos imediatamente somente o número, sem texto formatado,
        // para que a coluna public.lancamentos.notas_abastecimento possa
        // continuar sendo usada em soma, filtro e relatórios.
        if (abastecimento && Number.isFinite(valorAbastecimento)) {
            try {
                await atualizar("lancamentos", {
                    id: idLancamento,
                    notas_abastecimento: Number(valorAbastecimento.toFixed(2))
                });

                console.log(
                    "LANÇAMENTOS → VALOR DA NOTA PERSISTIDO:",
                    {
                        id: idLancamento,
                        notas_abastecimento: Number(valorAbastecimento.toFixed(2))
                    }
                );
            } catch (erroPersistencia) {
                console.error(
                    "LANÇAMENTOS → ERRO AO PERSISTIR VALOR DA NOTA:",
                    erroPersistencia
                );
            }
        }

        // Manutenção: o valor da nota permanece numérico para relatórios.
        if (manutencao && Number.isFinite(valorManutencao)) {
            try {
                await atualizar("lancamentos", {
                    id: idLancamento,
                    notas_manutencao: Number(valorManutencao.toFixed(2))
                });

                console.log(
                    "LANÇAMENTOS → VALOR DA MANUTENÇÃO PERSISTIDO:",
                    {
                        id: idLancamento,
                        notas_manutencao: Number(valorManutencao.toFixed(2))
                    }
                );
            } catch (erroPersistencia) {
                console.error(
                    "LANÇAMENTOS → ERRO AO PERSISTIR VALOR DA MANUTENÇÃO:",
                    erroPersistencia
                );
            }
        }

        // Avarias: o status é apenas visual neste ponto.
        // Não copiamos descrição/texto para campos auxiliares do lançamento,
        // pois a estrutura implantada pode ter esses campos com tipos numéricos
        // e a descrição pertence à tabela public.avarias.

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
        atualizarBotaoIndicador(botoes.status, true, "Status: NÃO DISPONÍVEL", false);
        atualizarBotaoIndicador(botoes.checklist, false, "Checklist", false);
        atualizarBotaoIndicador(botoes.abastecimento, false, "Abastecimento", false);
        atualizarBotaoIndicador(botoes.avarias, false, "Avarias", false);
        atualizarBotaoIndicador(botoes.lavaCar, false, "Lava-Car", false);
        atualizarBotaoIndicador(botoes.manutencao, false, "Manutenção", false);
        definirIndicador(indicadores.abastecimentoValor, "Valor da nota: —");
        definirIndicador(indicadores.lavaCarValor, "Valor: —");
        definirIndicador(indicadores.manutencaoValor, "Valor da nota: —");
    }
}

function instalarControleStatusKmFinal(form) {
    const campoKmFinal = form?.querySelector('[name="km_final"]');
    if (!campoKmFinal || campoKmFinal.dataset.statusKmFinalControlado === "true") return;

    campoKmFinal.dataset.statusKmFinalControlado = "true";
    let ultimoValorValido = String(campoKmFinal.value ?? "").trim();

    const sincronizarStatusVisual = () => {
        const kmFinalTexto = String(campoKmFinal.value ?? "").trim();
        const kmFinal = converterNumero(kmFinalTexto);
        const kmInicial = converterNumero(getValor("km_inicial"));
        const valido = Number.isFinite(kmFinal) &&
            (!Number.isFinite(kmInicial) || kmFinal >= kmInicial);

        setValor("status", valido ? "CONCLUÍDO" : "EM ANDAMENTO");

        const botaoStatus = form.querySelector('[data-lancamento-aux="Status"]');
        atualizarBotaoIndicador(
            botaoStatus,
            true,
            `Status: ${valido ? "CONCLUÍDO" : "EM ANDAMENTO"}`,
            valido
        );
    };

    campoKmFinal.addEventListener("focus", () => {
        ultimoValorValido = String(campoKmFinal.value ?? "").trim();
    });

    campoKmFinal.addEventListener("change", () => {
        const novoValor = String(campoKmFinal.value ?? "").trim();

        if (!novoValor && ultimoValorValido) {
            const confirmar = window.confirm(
                "Esta ocorrência está CONCLUÍDA.\n\nAo apagar o Km Final, ela voltará para EM ANDAMENTO.\n\nDeseja realmente apagar o Km Final?"
            );

            if (!confirmar) {
                campoKmFinal.value = ultimoValorValido;
                sincronizarStatusVisual();
                return;
            }
        }

        ultimoValorValido = novoValor;
        sincronizarStatusVisual();
    });

    campoKmFinal.addEventListener("input", () => {
        const valor = String(campoKmFinal.value ?? "").trim();
        if (valor) ultimoValorValido = valor;
        sincronizarStatusVisual();
    });

    sincronizarStatusVisual();
}

function atualizarBotaoIndicador(botao, registrado, texto, concluido = registrado) {
    if (!botao) return;

    botao.classList.toggle("btn-secondary", !registrado || !concluido);
    botao.classList.toggle("btn-success", registrado && concluido);
    botao.dataset.registrado = registrado ? "true" : "false";
    botao.textContent = texto + (registrado && concluido ? " ✓" : "");
    botao.title = registrado
        ? "Preenchido — clique para visualizar ou editar"
        : "Não preenchido — clique para registrar";
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
        // Selects não possuem readOnly nativo. Mantemos o campo habilitado
        // para que seu valor continue sendo enviado no POST/PATCH, mas
        // bloqueamos a interação do usuário quando o campo é calculado pelo sistema.
        campo.disabled = false;
        campo.dataset.lifecycleReadonly = readonly ? "true" : "false";
        campo.setAttribute("aria-readonly", readonly ? "true" : "false");
        campo.tabIndex = readonly ? -1 : 0;
        campo.style.pointerEvents = readonly ? "none" : "";
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
