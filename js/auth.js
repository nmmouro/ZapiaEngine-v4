/* Autenticação visual do Painel Frota. A validação de senha ocorre no backend. */
(() => {
  "use strict";
  const API = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? `${location.protocol}//${location.hostname}:3000` : location.origin;
  const TOKEN_KEY = "painel_frota_auth_token";
  const USER_KEY = "painel_frota_auth_user";
  const current = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } };
  const token = () => localStorage.getItem(TOKEN_KEY);
  const isHome = document.body?.dataset.page === "home" || /(^|\/)index\.html?$/.test(location.pathname) || location.pathname.endsWith("/");
  function style() {
    if (document.getElementById("pf-auth-style")) return;
    const s = document.createElement("style"); s.id = "pf-auth-style";
    s.textContent = `.pf-auth-shade{position:fixed;inset:0;z-index:99999;background:#eef2f7;display:grid;place-items:center;padding:20px}.pf-auth-card{width:min(100%,420px);background:#fff;border-radius:16px;padding:30px;box-shadow:0 15px 45px #17255422}.pf-auth-card h1{font-size:24px;margin-bottom:8px;color:#172554}.pf-auth-card p{color:#64748b;margin-bottom:18px}.pf-auth-card label{display:block;font-weight:600;margin:12px 0 5px}.pf-auth-card input{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.pf-auth-card button{width:100%;padding:12px;border:0;border-radius:8px;background:#1d4ed8;color:#fff;font-weight:700;margin-top:16px;cursor:pointer}.pf-auth-card button.secondary{background:#e2e8f0;color:#1e293b;margin-top:8px}.pf-auth-msg{min-height:24px;margin-top:12px;color:#b91c1c;font-size:14px}.pf-auth-user{display:flex;align-items:center;gap:10px;font-size:13px}.pf-auth-logout{border:0;border-radius:6px;padding:6px 10px;cursor:pointer}`;
    document.head.appendChild(s);
  }
  function showLogin() {
    style();
    const shade = document.createElement("div"); shade.className = "pf-auth-shade";
    shade.innerHTML = `<form class="pf-auth-card" id="pf-auth-form"><h1>Acesso ao Painel Frota</h1><p>Entre com sua matrícula e senha de acesso.</p><label for="pf-matricula">Matrícula</label><input id="pf-matricula" autocomplete="username" required><label for="pf-senha">Senha</label><input id="pf-senha" type="password" autocomplete="current-password" required><div class="pf-auth-msg" role="status" aria-live="polite"></div><button type="submit">Entrar</button><button class="secondary" type="button" id="pf-primeiro">Primeiro acesso — cadastrar senha</button></form>`;
    document.body.appendChild(shade);
    const form = shade.querySelector("form"), msg = shade.querySelector(".pf-auth-msg"), pass = shade.querySelector("#pf-senha"), matricula = shade.querySelector("#pf-matricula");
    async function post(path, body) {
      const response = await fetch(`${API}${path}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      const result = await response.json().catch(() => ({})); if (!response.ok || !result.sucesso) throw new Error(result.message || "Não foi possível concluir a solicitação."); return result;
    }
    form.addEventListener("submit", async e => {
      e.preventDefault(); msg.style.color = "#b91c1c"; msg.textContent = "Validando acesso…";
      try { const result = await post("/api/auth/login", {matricula:matricula.value, senha:pass.value}); localStorage.setItem(TOKEN_KEY,result.token); localStorage.setItem(USER_KEY,JSON.stringify(result.usuario)); location.reload(); }
      catch (err) { msg.textContent = err.message; }
    });
    shade.querySelector("#pf-primeiro").addEventListener("click", async () => {
      if (!matricula.value.trim()) { msg.textContent = "Informe sua matrícula primeiro."; matricula.focus(); return; }
      if (pass.value.length < 8) { msg.textContent = "Crie uma senha com pelo menos 8 caracteres no campo Senha."; pass.focus(); return; }
      msg.style.color = "#334155"; msg.textContent = "Cadastrando senha…";
      try { const result = await post("/api/auth/primeiro-acesso", {matricula:matricula.value, senha:pass.value}); msg.textContent = result.message; msg.style.color = "#166534"; pass.value = ""; }
      catch (err) { msg.style.color = "#b91c1c"; msg.textContent = err.message; }
    });
  }
  function addUserControl() {
    const user = current(); const header = document.querySelector("[data-header]"); if (!header || !user || header.querySelector(".pf-auth-user")) return;
    const el = document.createElement("div"); el.className = "pf-auth-user"; el.innerHTML = `<span>Conectado: ${String(user.nome || user.matricula).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span><button type="button" class="pf-auth-logout">Sair</button>`;
    el.querySelector("button").addEventListener("click", () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); location.href = "./index.html"; }); header.appendChild(el);
  }
  document.addEventListener("DOMContentLoaded", () => {
    if (!token()) {
      if (!isHome) { location.replace("./index.html"); return; }
      showLogin(); return;
    }
    addUserControl();
  });
})();
