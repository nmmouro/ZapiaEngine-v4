import { listar, criar, atualizar, excluir } from "../services/crudService.js";

const ENTITY = "agenda";
let registros = [];
let editando = false;

export async function iniciarAgenda() {
  const form = document.querySelector("#agenda-form");
  const lista = document.querySelector("#agenda-lista");
  const mensagem = document.querySelector("#agenda-mensagem");
  if (!form || !lista || !mensagem) throw new Error("Estrutura da página Agenda incompleta.");

  const campo = nome => form.elements.namedItem(nome);
  const hoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const agoraHora = () => `${String(new Date().getHours()).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}`;
  const avisar = (texto, erro = false) => {
    mensagem.textContent = texto;
    mensagem.className = `agenda-message is-visible ${erro ? "is-error" : "is-success"}`;
  };
  const limparAviso = () => { mensagem.textContent = ""; mensagem.className = "agenda-message"; };
  const escapar = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const formatarData = valor => {
    const m = String(valor ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor ?? "");
  };
  const formatarHora = valor => String(valor ?? "").slice(0,5);

  function novoFormulario() {
    form.reset();
    campo("id").value = "";
    campo("data").value = hoje();
    campo("hora").value = agoraHora();
    campo("status").value = "AGENDADO";
    editando = false;
    document.querySelector("#agenda-salvar").textContent = "Salvar agendamento";
    form.hidden = false;
    form.scrollIntoView({behavior:"smooth",block:"start"});
    limparAviso();
  }

  function preencherFormulario(registro) {
    for (const nome of ["id","data","hora","passageiro","setor","motivo","itinerario","status"]) {
      campo(nome).value = registro[nome] ?? "";
    }
    editando = true;
    document.querySelector("#agenda-salvar").textContent = "Salvar alterações";
    form.hidden = false;
    form.scrollIntoView({behavior:"smooth",block:"start"});
    limparAviso();
  }

  function renderizar() {
    if (!registros.length) {
      lista.innerHTML = '<tr><td colspan="8">Nenhum agendamento cadastrado.</td></tr>';
      return;
    }
    const ordenados = [...registros].sort((a,b) => `${a.data ?? ""} ${a.hora ?? ""}`.localeCompare(`${b.data ?? ""} ${b.hora ?? ""}`));
    lista.innerHTML = ordenados.map(r => `
      <tr class="agenda-row" data-open="${escapar(r.id)}" tabindex="0" aria-label="Abrir nova ocorrência a partir deste agendamento">
        <td>${escapar(formatarData(r.data))}</td><td>${escapar(formatarHora(r.hora))}</td>
        <td>${escapar(r.passageiro)}</td><td>${escapar(r.setor)}</td><td>${escapar(r.motivo)}</td>
        <td>${escapar(r.itinerario)}</td><td><span class="agenda-status">${escapar(r.status)}</span></td>
        <td><div class="agenda-actions"><button type="button" class="agenda-action edit" data-edit="${escapar(r.id)}">Editar</button><button type="button" class="agenda-action delete" data-delete="${escapar(r.id)}">Excluir</button></div></td>
      </tr>`).join("");
  }

  async function carregar() {
    lista.innerHTML = '<tr><td colspan="8">Carregando agendamentos...</td></tr>';
    try {
      const resultado = await listar(ENTITY);
      registros = Array.isArray(resultado) ? resultado : Array.isArray(resultado?.data) ? resultado.data : Array.isArray(resultado?.dados) ? resultado.dados : [];
      renderizar();
    } catch (erro) {
      console.error("AGENDA → ERRO AO LISTAR:", erro);
      lista.innerHTML = '<tr><td colspan="8">Não foi possível carregar a Agenda. Confira se a tabela public.agenda foi criada no Supabase.</td></tr>';
      avisar(erro.message || "Erro ao carregar agendamentos.", true);
    }
  }

  document.querySelector("#agenda-novo").addEventListener("click", novoFormulario);
  document.querySelector("#agenda-cancelar").addEventListener("click", () => { form.hidden = true; form.reset(); limparAviso(); });

  form.addEventListener("submit", async evento => {
    evento.preventDefault();
    limparAviso();
    const dados = Object.fromEntries(new FormData(form).entries());
    dados.data = String(dados.data || "").trim();
    dados.hora = String(dados.hora || "").trim();
    for (const k of ["passageiro","setor","motivo","itinerario","status"]) dados[k] = String(dados[k] || "").trim();
    if (!dados.data || !dados.hora || !dados.passageiro || !dados.setor || !dados.motivo || !dados.itinerario || !dados.status) {
      avisar("Preencha todos os campos antes de salvar.", true); return;
    }
    const id = String(dados.id || "").trim();
    delete dados.id;
    try {
      if (editando && id) {
        await atualizar(ENTITY, { id, ...dados });
        avisar("Agendamento atualizado com sucesso.");
      } else {
        dados.id = `AGD${Date.now()}`;
        await criar(ENTITY, dados);
        avisar("Agendamento cadastrado com sucesso.");
      }
      form.hidden = true;
      form.reset();
      await carregar();
    } catch (erro) {
      console.error("AGENDA → ERRO AO SALVAR:", erro);
      avisar(erro.message || "Não foi possível salvar o agendamento.", true);
    }
  });

  lista.addEventListener("click", async evento => {
    const editarBtn = evento.target.closest("[data-edit]");
    const excluirBtn = evento.target.closest("[data-delete]");
    if (editarBtn) {
      evento.stopPropagation();
      const registro = registros.find(r => String(r.id) === editarBtn.dataset.edit);
      if (registro) preencherFormulario(registro);
      return;
    }
    if (excluirBtn) {
      evento.stopPropagation();
      const id = excluirBtn.dataset.delete;
      const registro = registros.find(r => String(r.id) === id);
      if (!registro || !confirm(`Excluir o agendamento de ${registro.passageiro} em ${formatarData(registro.data)}?`)) return;
      try {
        await excluir(ENTITY, id);
        avisar("Agendamento excluído.");
        if (String(campo("id").value) === id) form.hidden = true;
        await carregar();
      } catch (erro) {
        console.error("AGENDA → ERRO AO EXCLUIR:", erro);
        avisar(erro.message || "Não foi possível excluir o agendamento.", true);
      }
      return;
    }
    const linha = evento.target.closest("tr[data-open]");
    if (linha) abrirOcorrencia(linha.dataset.open);
  });
  lista.addEventListener("keydown", evento => {
    if ((evento.key === "Enter" || evento.key === " ") && evento.target.matches("tr[data-open]")) {
      evento.preventDefault(); abrirOcorrencia(evento.target.dataset.open);
    }
  });

  function abrirOcorrencia(id) {
    const registro = registros.find(r => String(r.id) === String(id));
    if (!registro) return;
    const url = new URL("./lancamentos.html", window.location.href);
    url.searchParams.set("agenda", registro.id);
    window.location.href = url.href;
  }

  await carregar();
  return { carregar };
}

export const iniciar = iniciarAgenda;
