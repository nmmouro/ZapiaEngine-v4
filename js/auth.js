/* Autenticação do Painel Frota. A autorização efetiva é aplicada no servidor. */
(() => {
  "use strict";
  const LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  // Após criar o Web Service no Render, substitua o endereço abaixo pela URL HTTPS real do serviço.
  const API = String(window.PAINEL_FROTA_API_URL || (LOCAL ? `${location.protocol}//${location.hostname}:3000` : "https://nmmouro@gmail.onrender.com")).replace(/\/+$/, "");
  const TOKEN_KEY = "painel_frota_auth_token", USER_KEY = "painel_frota_auth_user";
  const token = () => localStorage.getItem(TOKEN_KEY);
  const page = () => String(document.body?.dataset.page || document.body?.dataset.pageTitle || "home").toLowerCase();
  const home = () => ["home", "index", ""].includes(page());
  const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getUser = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } };
  function addStyle() {
    if (document.getElementById("pf-auth-style")) return;
    const s = document.createElement("style"); s.id = "pf-auth-style";
    s.textContent = `.pf-auth-shade{position:fixed;inset:0;z-index:99999;background:#eef2f7;display:grid;place-items:center;padding:20px}.pf-auth-card{width:min(100%,420px);background:#fff;border-radius:16px;padding:30px;box-shadow:0 15px 45px #17255422}.pf-auth-card h1{font-size:24px;margin:0 0 8px;color:#172554}.pf-auth-card p{color:#64748b}.pf-auth-card label{display:block;font-weight:600;margin:12px 0 5px}.pf-auth-card input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.pf-auth-card button{width:100%;padding:12px;border:0;border-radius:8px;background:#1d4ed8;color:white;font-weight:700;margin-top:16px;cursor:pointer}.pf-auth-msg{min-height:24px;margin-top:12px;color:#b91c1c;font-size:14px}.pf-auth-user{display:flex;align-items:center;gap:8px;font-size:13px;margin-left:auto;flex-wrap:wrap}.pf-auth-logout{border:0;border-radius:6px;padding:6px 10px;cursor:pointer}.pf-auth-denied{padding:24px;margin:24px;border:1px solid #fecaca;background:#fff7f7;border-radius:12px;color:#991b1b}`;
    document.head.appendChild(s);
  }
  function showLogin(message = "Entre com sua matrícula e senha de acesso.") {
    addStyle(); let shade = document.querySelector(".pf-auth-shade");
    if (shade && shade.querySelector("form.pf-auth-card")) { const p = shade.querySelector(".pf-auth-intro"); if (p) p.textContent = message; return; }
    shade?.remove();
    shade = document.createElement("div"); shade.className = "pf-auth-shade";
    shade.innerHTML = `<form class="pf-auth-card"><h1>Acesso ao Painel Frota</h1><p class="pf-auth-intro">${safe(message)}</p><label for="pf-matricula">Matrícula</label><input id="pf-matricula" autocomplete="username" required><label for="pf-senha">Senha</label><input id="pf-senha" type="password" autocomplete="current-password" required><div class="pf-auth-msg" role="status" aria-live="polite"></div><button type="submit">Entrar</button></form>`;
    document.body.appendChild(shade);
    const form = shade.querySelector("form"), msg = shade.querySelector(".pf-auth-msg");
    form.addEventListener("submit", async e => {
      e.preventDefault(); const matricula = shade.querySelector("#pf-matricula").value.trim(), senha = shade.querySelector("#pf-senha").value;
      const button = form.querySelector("button"); button.disabled = true; msg.textContent = "Validando acesso…";
      try {
        const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matricula, senha }) });
        const d = await r.json().catch(() => ({})); if (!r.ok || !d.sucesso) throw new Error(d.message || `Falha no acesso (HTTP ${r.status}).`);
        localStorage.setItem(TOKEN_KEY, d.token); localStorage.setItem(USER_KEY, JSON.stringify(d.usuario)); location.reload();
      } catch (err) { msg.textContent = err.message || "Não foi possível conectar ao servidor em localhost:3000."; button.disabled = false; }
    });
  }
  function pageAllowed(p, role) {
    if (["relatorio", "ruv", "lancamentos_relatorio"].includes(p)) return ["admin", "supervisor"].includes(role);
    if (["usuarios"].includes(p)) return role === "admin";
    return true;
  }
  function addUserControl(user) {
    const header = document.querySelector("[data-header]"); if (!header || header.querySelector(".pf-auth-user")) return;
    const el = document.createElement("div"); el.className = "pf-auth-user";
    el.innerHTML = `<span>Conectado: ${safe(user.nome || user.matricula)} · ${safe(user.classificacao || user.perfil)}</span><button type="button" class="pf-auth-logout">Sair</button>`;
    el.querySelector("button").addEventListener("click", async () => { try { await fetch(`${API}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token()}` } }); } catch {} localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); location.href = "./index.html"; }); header.appendChild(el);
  }
  async function verificarAcesso(p = page()) {
    if (!token()) { if (home()) showLogin(); else location.replace("./index.html"); return false; }
    try {
      const r = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.sucesso) throw new Error("Sessão expirada.");
      localStorage.setItem(USER_KEY, JSON.stringify(d.usuario));
      if (!pageAllowed(p, d.usuario.perfil)) { addStyle(); const app = document.querySelector("#app"); if (app) app.innerHTML = `<div class="pf-auth-denied"><h2>Acesso não autorizado</h2><p>Seu perfil (${safe(d.usuario.classificacao || d.usuario.perfil)}) não tem permissão para esta página.</p><p><a href="./index.html">Voltar ao menu</a></p></div>`; return false; }
      addUserControl(d.usuario);
      document.querySelectorAll("[data-admin-only], [data-employee-admin]").forEach(el => { el.hidden = d.usuario.perfil !== "admin"; });
      document.querySelectorAll("[data-report-only]").forEach(el => { el.hidden = !["admin", "supervisor"].includes(d.usuario.perfil); });
      document.querySelector(".pf-auth-shade")?.remove();
      return true;
    } catch {
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
      if (home()) showLogin("Sua sessão expirou. Entre novamente."); else location.replace("./index.html");
      return false;
    }
  }
  window.PainelFrotaAuth = { API, token, usuario: getUser, verificarAcesso, adicionarControleUsuario: () => { const u = getUser(); if (u) addUserControl(u); } };
  document.addEventListener("DOMContentLoaded", () => {
    addStyle();
    const shade = document.createElement("div"); shade.className = "pf-auth-shade"; shade.innerHTML = `<div class="pf-auth-card"><h1>Painel Frota</h1><p>Verificando sessão de acesso…</p></div>`; document.body.appendChild(shade);
    verificarAcesso(page());
  });
})();
