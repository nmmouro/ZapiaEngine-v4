/**
 * ============================================================
 * PÁGINA — MANUTENÇÃO
 * Painel Frota
 *
 * Fluxo:
 *     Lançamento → Manutenção → Salvar → Retornar
 *
 * URL:
 *     manutencao.html?lancamento=LAN000001
 * ============================================================
 */

import { createModule } from "../engine/module.js";
import { SCHEMA_MANUTENCAO } from "../schemas/manutencao.js";
import { listar, atualizar } from "../services/crudService.js";
import { obterLocalizacao } from "../utils/geolocalizacao.js";

let modulo = null;
let idLancamento = "";
let contextoLancamento = null;

export async function iniciarManutencao() {
    console.log("PÁGINA MANUTENÇÃO → INICIANDO");

    const container = document.querySelector("#app");
    if (!container) throw new Error("PÁGINA MANUTENÇÃO → #app não encontrado.");

    idLancamento = String(
        new URLSearchParams(window.location.search).get("lancamento") || ""
    ).trim();

    if (!idLancamento) {
        throw new Error("Nenhum lançamento foi informado para a Manutenção.");
    }

    const lancamentos = await listar("lancamentos", { id: idLancamento });
    contextoLancamento = Array.isArray(lancamentos) ? lancamentos[0] || null : null;

    if (!contextoLancamento) {
        throw new Error(`Lançamento ${idLancamento} não encontrado.`);
    }

    modulo = createModule({
        entity: "manutencao",
        schema: SCHEMA_MANUTENCAO,
        container: "#app",
        stateName: "manutencao",
        options: {
            titulo: "Manutenção",
            tabela: "Manutenções Registradas",
            permitirNovo: false,
            permitirEditar: false,
            permitirExcluir: false,
            pageSize: 10,
            colunas: [
                { name: "data", label: "Data", format: formatarData },
                { name: "hora", label: "Hora", format: formatarHora },
                { name: "empregado_matricula", label: "Empregado / Matrícula" },
                { name: "veiculo", label: "Veículo / Modelo" },
                { name: "odometro", label: "Odômetro" },
                { name: "descricao_manutencao", label: "Descrição" },
                { name: "valor_total_nota", label: "Total" }
            ]
        }
    });

    window.manutencao = modulo;
    window.manutencoes = modulo;

    await modulo.iniciar();
    garantirCampoOculto("id_lancamento");
    adicionarBotaoVoltar();

    const registros = await listar("manutencao", { id_lancamento: idLancamento });
    const existente = Array.isArray(registros) && registros.length ? registros[0] : null;

    if (existente?.id) {
        console.log("MANUTENÇÃO → REGISTRO EXISTENTE:", existente.id);
        await modulo.editar(existente.id);
        preencherContexto(existente);
    } else {
        console.log("MANUTENÇÃO → NOVO REGISTRO");
        modulo.novo();
        preencherContexto();
    }

    instalarRetornoAposSalvar();
    await capturarGPS();

    console.log("PÁGINA MANUTENÇÃO → INICIADO");
    return modulo;
}

export async function iniciar() {
    try {
        return await iniciarManutencao();
    } catch (erro) {
        mostrarErro(erro);
        return null;
    }
}

function preencherContexto(registro = {}) {
    setValor("id_lancamento", registro.id_lancamento || idLancamento);
    setValor("data", registro.data || contextoLancamento.data || dataAtual());
    setValor("hora", formatarHora(registro.hora) || formatarHora(contextoLancamento.hora) || horaAtual());
    setValor("empregado_matricula", registro.empregado_matricula || contextoLancamento.empregado_matricula || "");
    setValor("veiculo", registro.veiculo || contextoLancamento.veiculo || "");
    setValor("usuario", registro.usuario || contextoLancamento.usuario || "");
}

async function capturarGPS() {
    const campo = getCampo("localizacao");
    if (!campo) return;

    try {
        const coordenadas = await obterLocalizacao();
        campo.value = coordenadas;
        console.log("MANUTENÇÃO → GPS:", coordenadas);
    } catch (erro) {
        console.warn("MANUTENÇÃO → GPS NÃO OBTIDO:", erro.message);
    }
}

function instalarRetornoAposSalvar() {
    const container = modulo?.form?.container;
    if (!container || container.dataset.manutencaoRetorno === "true") return;

    container.dataset.manutencaoRetorno = "true";
    container.addEventListener("form:salvo", async () => {
        try {
            const registros = await listar("manutencao", { id_lancamento: idLancamento });
            const registro = Array.isArray(registros) && registros.length ? registros[0] : null;
            const valor = registro ? Number(registro.valor_total_nota) : NaN;
            if (!registro || !Number.isFinite(valor)) {
                throw new Error("A manutenção foi salva, mas o valor da nota não foi localizado como número.");
            }
            await atualizar("lancamentos", {
                id: idLancamento,
                notas_manutencao: Number(valor.toFixed(2))
            });
            console.log("MANUTENÇÃO → LANÇAMENTO SINCRONIZADO:", {
                id: idLancamento,
                notas_manutencao: Number(valor.toFixed(2))
            });
            voltarAoLancamento();
        } catch (erro) {
            console.error("MANUTENÇÃO → ERRO AO SINCRONIZAR LANÇAMENTO:", erro);
            alert("A manutenção foi salva, mas não foi possível sincronizar o valor da nota no lançamento.\n\n" + (erro?.message || erro));
        }
    }, { once: true });
}

function adicionarBotaoVoltar() {
    const form = modulo?.form?.formulario;
    if (!form || form.querySelector("[data-manutencao-voltar]")) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-secondary";
    botao.dataset.manutencaoVoltar = "true";
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
    return m ? `${m[1]}:${m[2]}` : "";
}

function dataAtual() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function horaAtual() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function mostrarErro(erro) {
    console.error("PÁGINA MANUTENÇÃO → ERRO:", erro);
    const app = document.querySelector("#app");
    if (!app) return;
    app.innerHTML = `
        <section class="engine-error" role="alert">
            <h2>Erro ao carregar a Manutenção</h2>
            <p>${escaparHTML(erro?.message || erro)}</p>
            <button type="button" data-manutencao-recarregar>Recarregar</button>
        </section>
    `;
    app.querySelector("[data-manutencao-recarregar]")?.addEventListener("click", () => window.location.reload());
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export default iniciarManutencao;
