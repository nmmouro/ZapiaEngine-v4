const root = document.querySelector("#lista-acessos");
const form = document.querySelector("#form-acesso");
const message = document.querySelector("#mensagem");
const lookupButton = document.querySelector("#consultar-empregado");
const matriculaInput = document.querySelector("#matricula");
const employeeCard = document.querySelector("#empregado-encontrado");
const roleInput = document.querySelector("#perfil-acesso");
let employeeFound = null;
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

function setMessage(text, ok = false) {
  const fallback = document.querySelector("#mensagem-fallback");
  const target = (message && !form?.hidden) ? message : fallback || message;
  if (target) { target.textContent = text; target.style.color = ok ? "#166534" : "#b91c1c"; }
  if (fallback && target !== fallback) fallback.textContent = "";
}
function getAuth() { return window.PainelFrotaAuth; }
async function edge(action, payload = {}) {
  const auth = getAuth();
  const url = String(auth?.supabaseUrl || "").replace(/\/+$/, "");
  const key = String(auth?.anonKey || "");
  const bearer = auth?.token?.() || "";
  if (!url || !key || !bearer) throw new Error("Sessão administrativa não encontrada. Entre novamente.");
  const response = await fetch(`${url}/functions/v1/admin-criar-acesso`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Falha ao gerenciar acesso (HTTP ${response.status}).`);
  return data;
}
function clearEmployee() {
  employeeFound = null;
  if (employeeCard) { employeeCard.hidden = true; employeeCard.textContent = ""; }
}
async function lookupEmployee() {
  const matricula = matriculaInput?.value.trim() || "";
  clearEmployee();
  if (!matricula) { setMessage("Informe a matrícula do empregado."); return; }
  lookupButton.disabled = true;
  setMessage("Consultando empregado...");
  try {
    const result = await edge("lookup", { matricula });
    employeeFound = result.empregado;
    if (employeeCard) {
      employeeCard.hidden = false;
      employeeCard.innerHTML = `<strong>${esc(employeeFound.nome)}</strong><br>Matrícula: ${esc(employeeFound.matricula)}<br>E-mail: ${esc(employeeFound.email)}<br>Classificação cadastral: ${esc(employeeFound.classificacao || "não informada")}<br>Status: ${esc(employeeFound.status)}${result.acesso_existente ? `<br><strong>Já existe acesso:</strong> perfil ${esc(result.acesso_existente.perfil)}, ${result.acesso_existente.ativo ? "ativo" : "inativo"}.` : "<br><strong>Sem perfil de acesso cadastrado.</strong>"}`;
    }
    if (result.acesso_existente) {
      setMessage("Este empregado já possui um perfil. Use a lista abaixo para ativar/desativar; não crie uma conta duplicada.");
    } else setMessage("Empregado ativo e e-mail validado. Selecione o perfil e defina a senha inicial.", true);
  } catch (error) { setMessage(error.message || "Não foi possível localizar o empregado."); }
  finally { lookupButton.disabled = false; }
}
async function loadAccesses() {
  if (root) root.innerHTML = "Carregando acessos...";
  try {
    const result = await edge("list");
    const rows = result.acessos || [];
    if (!rows.length) { root.innerHTML = "<p>Nenhum perfil de acesso cadastrado.</p>"; return; }
    root.innerHTML = `<div class="table-responsive"><table class="pf-access-table"><thead><tr><th>Matrícula</th><th>Empregado</th><th>E-mail</th><th>Perfil de acesso</th><th>Status do acesso</th><th>Ação</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.matricula)}</td><td>${esc(r.nome)}</td><td>${esc(r.email)}</td><td>${esc(r.perfil)}</td><td>${r.ativo ? "ATIVO" : "INATIVO"}</td><td><button type="button" class="btn ${r.ativo ? "btn-danger" : "btn-success"} pf-access-toggle" data-matricula="${esc(r.matricula)}" data-active="${r.ativo ? "true" : "false"}" ${String(r.empregado_status).toUpperCase() !== "ATIVO" && !r.ativo ? "disabled" : ""}>${r.ativo ? "Desativar" : "Ativar"}</button></td></tr>`).join("")}</tbody></table></div>`;
    root.querySelectorAll(".pf-access-toggle").forEach(button => button.addEventListener("click", async () => {
      const matricula = button.dataset.matricula;
      const current = button.dataset.active === "true";
      const next = !current;
      if (!confirm(`${next ? "Ativar" : "Desativar"} o acesso da matrícula ${matricula}?`)) return;
      button.disabled = true;
      try {
        await edge("set-active", { matricula, ativo: next });
        setMessage(`Acesso da matrícula ${matricula} ${next ? "ativado" : "desativado"}.`, true);
        await loadAccesses();
      } catch (error) { setMessage(error.message || "Não foi possível alterar o acesso."); button.disabled = false; }
    }));
  } catch (error) {
    root.innerHTML = `<p>${esc(error.message || "Não foi possível carregar os acessos.")}</p>`;
  }
}

async function inicializarUsuarios() {
  const auth = getAuth();
  if (!auth) { setMessage("Autenticação não foi carregada. Recarregue a página."); return; }
  await auth.ready();
  const user = auth.usuario?.();
  if (!user || user.perfil !== "admin") {
    if (form) form.hidden = true;
    if (root) root.innerHTML = "<p>Acesso restrito a administradores.</p>";
    setMessage("Somente um administrador pode gerenciar acessos.");
    return;
  }
  if (form) form.hidden = false;
  lookupButton?.addEventListener("click", lookupEmployee);
  matriculaInput?.addEventListener("input", clearEmployee);
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const matricula = matriculaInput?.value.trim() || "";
    const perfil = roleInput?.value || "";
    const password = document.querySelector("#senha")?.value || "";
    const confirmPassword = document.querySelector("#confirmar-senha")?.value || "";
    if (!employeeFound || employeeFound.matricula !== matricula) { setMessage("Consulte e valide o empregado pela matrícula antes de criar o acesso."); return; }
    if (password.length < 8) { setMessage("A senha deve ter pelo menos 8 caracteres."); return; }
    if (password !== confirmPassword) { setMessage("As senhas não coincidem."); return; }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true; setMessage("Criando conta segura no Supabase Auth...");
    try {
      const result = await edge("create", { matricula, perfil, password });
      setMessage(`Acesso criado para ${result.nome} (${result.matricula}) com perfil ${result.perfil}.`, true);
      form.reset(); clearEmployee(); await loadAccesses();
    } catch (error) { setMessage(error.message || "Não foi possível criar o acesso."); }
    finally { submit.disabled = false; }
  });
  await loadAccesses();
}


/*
 * Inicialização idempotente: app.js é o único responsável por importar
 * este módulo. Se init() for chamado novamente, reutiliza a mesma Promise
 * e não registra listeners nem consulta dados em duplicidade.
 */
export function init() {
  if (window.__PAINEL_FROTA_USUARIOS_INIT_PROMISE__) {
    return window.__PAINEL_FROTA_USUARIOS_INIT_PROMISE__;
  }
  window.__PAINEL_FROTA_USUARIOS_INIT_PROMISE__ = inicializarUsuarios();
  return window.__PAINEL_FROTA_USUARIOS_INIT_PROMISE__;
}
