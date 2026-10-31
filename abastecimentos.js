/**
 * ============================================================
 * PÁGINA — ABASTECIMENTO
 * Painel Frota
 *
 * Fluxo:
 *     Lançamento → Abastecimento → Salvar → Retornar
 *
 * O ID da ocorrência é recebido pela URL:
 *     abastecimentos.html?lancamento=LAN000001
 * ============================================================
 */

import { createModule } from "../engine/module.js";
import { SCHEMA_ABASTECIMENTO } from "../schemas/abastecimentos.js";
import { listar, atualizar } from "../services/crudService.js";
import { obterLocalizacao } from "../utils/geolocalizacao.js";

let modulo = null;
let idLancamento = "";
let contextoLancamento = null;

export async function iniciarAbastecimentos() {
    console.log("PÁGINA ABASTECIMENTO → INICIANDO");

    const container = document.querySelector("#app");
    if (!container) throw new Error("PÁGINA ABASTECIMENTO → #app não encontrado.");

    const params = new URLSearchParams(window.location.search);
    idLancamento = String(params.get("lancamento") || "").trim();

    // Fallback apenas quando a navegação veio da página Lançamentos.
    // Ao abrir Abastecimentos pelo menu, exibe a listagem em vez de reutilizar
    // por engano um lançamento antigo guardado no navegador.
    const veioDeLancamentos = /lancamentos\.html/i.test(document.referrer || "");
    if (!idLancamento && veioDeLancamentos) {
        idLancamento = String(
            sessionStorage.getItem("painelFrota:lancamentoAtual") ||
            localStorage.getItem("painelFrota:lancamentoAtual") ||
            ""
        ).trim();
        if (idLancamento) {
            console.warn("PÁGINA ABASTECIMENTO → ID recuperado do armazenamento:", idLancamento);
        }
    }

    if (!idLancamento) {
        return iniciarListaAbastecimentos(container);
    }

    const lancamentos = await listar("lancamentos", { id: idLancamento });
    contextoLancamento = Array.isArray(lancamentos) ? lancamentos[0] || null : null;

    if (!contextoLancamento) {
        throw new Error(`Lançamento ${idLancamento} não encontrado.`);
    }

    modulo = createModule({
        entity: "abastecimento",
        schema: SCHEMA_ABASTECIMENTO,
        container: "#app",
        stateName: "abastecimento",
        options: {
            titulo: "Abastecimento",
            tabela: "Abastecimentos Registrados",
            permitirNovo: false,
            permitirEditar: false,
            permitirExcluir: false,
            pageSize: 10,
            visualizarAoClicarNaLinha: true,
            visualizarUrl: "abastecimentos_view.html",
            colunas: [
                { name: "data", label: "Data", format: formatarData },
                { name: "hora", label: "Hora", format: formatarHora },
                { name: "empregado_matricula", label: "Empregado / Matrícula" },
                { name: "placa_modelo", label: "Placa / Modelo" },
                { name: "odometro", label: "Odômetro" },
                { name: "tipo_combustivel", label: "Combustível" },
                { name: "qtde_l", label: "Litros" },
                { name: "preco_l", label: "Preço/L" },
                { name: "valor_total_nota", label: "Total" }
            ]
        }
    });

    window.abastecimento = modulo;
    window.abastecimentos = modulo;

    await modulo.iniciar();
    garantirCampoOculto("id_lancamento");
    adicionarBotaoVoltar();

    modulo.novo();
    preencherContexto();
    instalarCalculoTotal();
    await capturarGPS();
    instalarRetornoAposSalvar();

    console.log("PÁGINA ABASTECIMENTO → INICIADO");
    return modulo;
}

async function iniciarListaAbastecimentos(container) {
    console.log("PÁGINA ABASTECIMENTOS → MODO LISTAGEM");

    modulo = createModule({
        entity: "abastecimento",
        schema: SCHEMA_ABASTECIMENTO,
        container: "#app",
        stateName: "abastecimento",
        options: {
            titulo: "Abastecimentos",
            tabela: "Abastecimentos Registrados",
            permitirNovo: false,
            permitirEditar: true,
            permitirExcluir: true,
            pageSize: 10,
            visualizarAoClicarNaLinha: true,
            visualizarUrl: "abastecimentos_view.html",
            colunas: [
                { name: "data", label: "Data", format: formatarData },
                { name: "hora", label: "Hora", format: formatarHora },
                { name: "empregado_matricula", label: "Empregado / Matrícula" },
                { name: "placa_modelo", label: "Placa / Modelo" },
                { name: "odometro", label: "Odômetro" },
                { name: "tipo_combustivel", label: "Combustível" },
                { name: "qtde_l", label: "Litros" },
                { name: "preco_l", label: "Preço/L" },
                { name: "valor_total_nota", label: "Total" }
            ],
            actions: {
                visualizar(registro) {
                    if (!registro?.id) return;
                    window.location.href = "abastecimentos_view.html?id=" + encodeURIComponent(registro.id);
                }
            }
        }
    });

    window.abastecimento = modulo;
    window.abastecimentos = modulo;
    await modulo.iniciar();

    const toolbar = container.querySelector("[data-engine-toolbar]");
    if (toolbar && !toolbar.querySelector("[data-abastecimento-novo-lista]")) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn btn-primary";
        botao.dataset.abastecimentoNovoLista = "true";
        botao.textContent = "+ Novo Abastecimento";
        botao.addEventListener("click", abrirSeletorLancamento);
        toolbar.appendChild(botao);
    }

    return modulo;
}

async function abrirSeletorLancamento() {
    const container = document.querySelector("#app");
    if (!container) return;

    let painel = container.querySelector("[data-abastecimento-seletor]");
    if (painel) {
        painel.hidden = !painel.hidden;
        return;
    }

    painel = document.createElement("section");
    painel.dataset.abastecimentoSeletor = "true";
    painel.className = "abastecimento-seletor view-section";
    painel.innerHTML = `
        <h2>Novo abastecimento</h2>
        <p>Selecione a ocorrência à qual este abastecimento será vinculado. Os dados de empregado e veículo serão preenchidos automaticamente.</p>
        <label for="abastecimento-lancamento-select">Ocorrência / Lançamento</label>
        <select id="abastecimento-lancamento-select" style="display:block;width:100%;max-width:760px;min-height:40px;margin:8px 0 14px;padding:8px;border:1px solid #cbd2d9;border-radius:7px">
            <option value="">Carregando lançamentos...</option>
        </select>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-primary" data-abastecimento-continuar>Continuar</button>
            <button type="button" class="btn btn-secondary" data-abastecimento-cancelar>Cancelar</button>
        </div>
        <p data-abastecimento-seletor-msg role="status" aria-live="polite"></p>
    `;
    container.prepend(painel);
    painel.querySelector("[data-abastecimento-cancelar]").addEventListener("click", () => painel.remove());
    painel.querySelector("[data-abastecimento-continuar]").addEventListener("click", () => {
        const id = painel.querySelector("select").value;
        if (!id) {
            painel.querySelector("[data-abastecimento-seletor-msg]").textContent = "Selecione um lançamento para continuar.";
            return;
        }
        window.location.href = "abastecimentos.html?lancamento=" + encodeURIComponent(id);
    });

    const select = painel.querySelector("select");
    try {
        const dados = await listar("lancamentos");
        const registros = Array.isArray(dados) ? dados : [];
        select.replaceChildren();
        const inicial = document.createElement("option");
        inicial.value = "";
        inicial.textContent = registros.length ? "Selecione uma ocorrência..." : "Nenhum lançamento encontrado";
        select.appendChild(inicial);
        registros
            .slice()
            .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")) || String(b.hora || "").localeCompare(String(a.hora || "")))
            .forEach(r => {
                const option = document.createElement("option");
                option.value = String(r.id || "");
                const detalhes = [r.data ? formatarData(r.data) : "", r.hora ? formatarHora(r.hora) : "", r.placa_modelo || r.veiculo || "", r.empregado_matricula || "", r.passageiro_setor_motivo || ""]
                    .filter(Boolean).join(" · ");
                option.textContent = `${r.id || "Lançamento"}${detalhes ? " — " + detalhes : ""}`;
                select.appendChild(option);
            });
    } catch (erro) {
        select.replaceChildren();
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Não foi possível carregar os lançamentos";
        select.appendChild(option);
        painel.querySelector("[data-abastecimento-seletor-msg]").textContent = erro?.message || String(erro);
    }
}

export async function iniciar() {
    return iniciarAbastecimentos();
}

function preencherContexto() {
    setValor("id_lancamento", idLancamento);
    setValor("data", contextoLancamento.data || dataAtual());
    setValor("hora", formatarHora(contextoLancamento.hora) || horaAtual());
    setValor("empregado_matricula", contextoLancamento.empregado_matricula || "");
    setValor("id_veiculo", contextoLancamento.id_veiculo || "");

    // Placa / Modelo é um snapshot da ocorrência.
    // Não deve abrir um novo select nem permitir trocar o veículo
    // dentro do formulário de abastecimento.
    const placaModelo = String(
        contextoLancamento.placa_modelo ||
        contextoLancamento.veiculo ||
        ""
    ).trim();

    setValor("placa_modelo", placaModelo);
    setValor("id_veiculo", contextoLancamento.id_veiculo || "");
    // Compatibilidade com registros antigos: o novo contrato persiste
    // placa_modelo, mas mantém veiculo como snapshot legado quando aplicável.
    setValor("veiculo", placaModelo);

    setValor("usuario", contextoLancamento.usuario || "");
}

function instalarCalculoTotal() {
    const litros = getCampo("qtde_l");
    const preco = getCampo("preco_l");
    const total = getCampo("valor_total_nota");
    if (!litros || !preco || !total) return;

    const calcular = () => {
        const l = Number(litros.value);
        const p = Number(preco.value);
        if (Number.isFinite(l) && Number.isFinite(p) && l >= 0 && p >= 0) {
            total.value = (l * p).toFixed(2);
        }
    };

    litros.addEventListener("input", calcular);
    preco.addEventListener("input", calcular);
}

async function capturarGPS() {
    const campo = getCampo("localizacao");
    if (!campo) return;

    try {
        const coordenadas = await obterLocalizacao();
        campo.value = coordenadas;
        console.log("ABASTECIMENTO → GPS:", coordenadas);
    } catch (erro) {
        console.warn("ABASTECIMENTO → GPS NÃO OBTIDO:", erro.message);
        // O abastecimento continua disponível; localização é registrada quando autorizada.
    }
}

function instalarRetornoAposSalvar() {
    const container = modulo?.form?.container;
    if (!container || container.dataset.abastecimentoRetorno === "true") return;

    container.dataset.abastecimentoRetorno = "true";
    container.addEventListener("form:salvo", async () => {
        try {
            const registros = await listar("abastecimento", { id_lancamento: idLancamento });
            const registro = Array.isArray(registros) && registros.length ? registros[0] : null;
            const valor = registro ? Number(registro.valor_total_nota) : NaN;
            if (!registro || !Number.isFinite(valor)) {
                throw new Error("O abastecimento foi salvo, mas o valor da nota não foi localizado como número.");
            }
            await atualizar("lancamentos", {
                id: idLancamento,
                notas_abastecimento: Number(valor.toFixed(2))
            });
            console.log("ABASTECIMENTO → LANÇAMENTO SINCRONIZADO:", {
                id: idLancamento,
                notas_abastecimento: Number(valor.toFixed(2))
            });
            voltarAoLancamento();
        } catch (erro) {
            console.error("ABASTECIMENTO → ERRO AO SINCRONIZAR LANÇAMENTO:", erro);
            alert("O abastecimento foi salvo, mas não foi possível sincronizar o valor da nota no lançamento.\n\n" + (erro?.message || erro));
        }
    }, { once: true });
}

function adicionarBotaoVoltar() {
    const form = modulo?.form?.formulario;
    if (!form || form.querySelector("[data-abastecimento-voltar]")) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-secondary";
    botao.dataset.abastecimentoVoltar = "true";
    botao.textContent = "Voltar ao Lançamento";
    botao.addEventListener("click", voltarAoLancamento);

    const actions = form.querySelector(".engine-form-actions");
    (actions || form).appendChild(botao);
}

function voltarAoLancamento() {
    window.location.href = `lancamentos.html?editar=${encodeURIComponent(idLancamento)}`;
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

function setValor(nome, valor) {
    const campo = getCampo(nome);
    if (campo) campo.value = valor ?? "";
}

function formatarData(valor) {
    const texto = String(valor ?? "").trim();
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : texto;
}

function formatarHora(valor) {
    const texto = String(valor ?? "").trim();
    const m = texto.match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : texto;
}

function dataAtual() {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function horaAtual() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
