/* Painel Frota — Supabase Auth sem backend Render.
   As contas devem ser provisionadas por administrador no Supabase Auth e vinculadas
   à tabela public.perfis_acesso. A chave usada no navegador é apenas publishable/anon. */
(() => {
  "use strict";
  const cfg = window.CONFIG || {};
  const rawProjectUrl = String(window.PAINEL_FROTA_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const projectUrl = rawProjectUrl ? (rawProjectUrl.endsWith("/auth/v1") ? rawProjectUrl : `${rawProjectUrl}/auth/v1`) : String(cfg.api?.authUrl || "").trim().replace(/\/+$/, "");
  const apiKey = String(window.PAINEL_FROTA_SUPABASE_ANON_KEY || cfg.api?.key || "").trim();
  const TOKEN_KEY = "painel_frota_supabase_session_v1", USER_KEY = "painel_frota_auth_user";
  const page = () => String(document.body?.dataset.page || document.body?.dataset.pageTitle || "home").toLowerCase();
  const home = () => ["home", "index", ""].includes(page());
  const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const readSession = () => { try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); } catch { return null; } };
  const token = () => readSession()?.access_token || "";
  const getUser = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } };
  const configured = () => projectUrl && apiKey && !/SEU-PROJETO|SUA_CHAVE_PUBLICA/.test(projectUrl + apiKey);
  


function matriculaEmail(m) {
  const matricula = String(m || "").trim();

  if (!matricula) {
    throw new Error("Informe a matrícula.");
  }

  const contas = {
    "5000199": "nmmouro@gmail.com"
  };

  const email = contas[matricula];

  if (!email) {
    throw new Error(
      "Matrícula sem associação de e-mail configurada. " +
      "Solicite ao administrador o cadastro do acesso."
    );
  }

  return email;
}


 


  async function authRequest(path, body, bearer) {
    if (!configured()) throw new Error("Configure a URL real do Supabase e a chave pública em js/config/config.js antes de publicar.");
    const headers = { apikey: apiKey, "Content-Type": "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const r = await fetch(`${projectUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body || {}) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.msg || d.message || d.error_description || d.error || "Falha na autenticação Supabase.");
    return d;
  }
  async function rest(path, bearer = token()) {
    if (!configured()) throw new Error("Supabase ainda não configurado.");
    const r = await fetch(`${projectUrl.replace(/\/auth\/v1$/, "/rest/v1")}/${path}`, { headers: { apikey: apiKey, Authorization: `Bearer ${bearer || apiKey}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || d.details || d.hint || `Falha ao consultar perfil (HTTP ${r.status}).`);
    return d;
  }
  async function refreshIfNeeded() {
    const s = readSession();
    if (!s?.access_token) return false;
    if (!s.expires_at || Date.now() < (Number(s.expires_at) - 60) * 1000) return true;
    if (!s.refresh_token) return false;
    try {
      const d = await authRequest("/token?grant_type=refresh_token", { refresh_token: s.refresh_token });
      d.expires_at = Math.floor(Date.now()/1000) + Number(d.expires_in || 3600);
      localStorage.setItem(TOKEN_KEY, JSON.stringify(d)); return true;
    } catch { return false; }
  }
  function addStyle() {
    if (document.getElementById("pf-auth-style")) return;
    const s = document.createElement("style"); s.id = "pf-auth-style";
    s.textContent = `.pf-auth-shade{position:fixed;inset:0;z-index:99999;background:#eef2f7;display:grid;place-items:center;padding:20px}.pf-auth-card{width:min(100%,420px);background:#fff;border-radius:16px;padding:30px;box-shadow:0 15px 45px #17255422}.pf-auth-card h1{font-size:24px;margin:0 0 8px;color:#172554}.pf-auth-card p{color:#64748b}.pf-auth-card label{display:block;font-weight:600;margin:12px 0 5px}.pf-auth-card input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.pf-auth-card button{width:100%;padding:12px;border:0;border-radius:8px;background:#1d4ed8;color:white;font-weight:700;margin-top:16px;cursor:pointer}.pf-auth-msg{min-height:24px;margin-top:12px;color:#b91c1c;font-size:14px}.pf-auth-user{display:flex;align-items:center;gap:8px;font-size:13px;margin-left:auto;flex-wrap:wrap}.pf-auth-logout{border:0;border-radius:6px;padding:6px 10px;cursor:pointer}.pf-auth-denied{padding:24px;margin:24px;border:1px solid #fecaca;background:#fff7f7;border-radius:12px;color:#991b1b}`;
    document.head.appendChild(s);
  }
  function showLogin(message = "Entre com sua matrícula e senha de acesso.") {
    addStyle(); let shade = document.querySelector(".pf-auth-shade");
    if (shade && shade.querySelector("form.pf-auth-card")) { const p = shade.querySelector(".pf-auth-intro"); if (p) p.textContent = message; return; }
    shade?.remove(); shade = document.createElement("div"); shade.className = "pf-auth-shade";
    shade.innerHTML = `<form class="pf-auth-card"><h1>Acesso ao Painel Frota</h1><p class="pf-auth-intro">${safe(message)}</p><label for="pf-matricula">Matrícula</label><input id="pf-matricula" name="matricula" autocomplete="username" autocapitalize="off" spellcheck="false" required><label for="pf-senha">Senha</label><input id="pf-senha" name="password" type="password" autocomplete="current-password" required><div class="pf-auth-msg" role="status" aria-live="polite"></div><button type="submit">Entrar</button></form>`;
    document.body.appendChild(shade);
    const form = shade.querySelector("form"), msg = shade.querySelector(".pf-auth-msg");
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const matriculaInput = shade.querySelector("#pf-matricula");
      const senhaInput = shade.querySelector("#pf-senha");
      const matricula = matriculaInput?.value.trim() || "";
      const senha = senhaInput?.value ?? "";
      const button = form.querySelector("button");

      // Impede uma chamada ao Supabase se o formulário estiver incompleto.
      if (!matricula || senha.length === 0) {
        msg.textContent = !matricula
          ? "Informe sua matrícula."
          : "Informe sua senha.";
        (!matricula ? matriculaInput : senhaInput)?.focus();
        return;
      }

      button.disabled = true;
      msg.textContent = "Validando acesso…";
      try {
        const d = await authRequest("/token?grant_type=password", { email: matriculaEmail(matricula), password: senha });
        d.expires_at = Math.floor(Date.now()/1000) + Number(d.expires_in || 3600);
        localStorage.setItem(TOKEN_KEY, JSON.stringify(d));
        const u = await carregarPerfil(d.access_token, matricula);
        localStorage.setItem(USER_KEY, JSON.stringify(u)); location.reload();
      } catch (err) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); msg.textContent = err.message || "Não foi possível entrar."; button.disabled = false; }
    });
  }
 
  async function carregarPerfil(accessToken, matriculaInformada) {
    // 1. Validar a sessão diretamente no Supabase Auth.
    const meRes = await fetch(`${projectUrl}/user`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`
      }
    });

    const me = await meRes.json().catch(() => ({}));

    if (!meRes.ok || !me.id) {
      throw new Error("Não foi possível validar a sessão do Supabase.");
    }

    // 2. Consultar somente as colunas existentes em perfis_acesso.
    const rows = await rest(
      `perfis_acesso?auth_user_id=eq.${encodeURIComponent(me.id)}` +
      `&select=id,auth_user_id,empregado_id,matricula,nome,perfil,ativo`,
      accessToken
    );

    const profile = Array.isArray(rows) ? rows[0] : null;

    if (!profile) {
      throw new Error(
        "Não foi encontrado um perfil de acesso vinculado à conta."
      );
    }

    // 3. Confirmar que o perfil está ativo.
    if (profile.ativo !== true) {
      throw new Error(
        "O acesso está inativo. Solicite a verificação ao administrador."
      );
    }

    // 4. Confirmar que a matrícula informada corresponde ao perfil.
    if (
      matriculaInformada &&
      String(profile.matricula || "").trim().toUpperCase() !==
      String(matriculaInformada).trim().toUpperCase()
    ) {
      throw new Error(
        "A matrícula autenticada não corresponde ao perfil cadastrado."
      );
    }

    // 5. Normalizar o nome do perfil de acesso.
    const roleRaw = String(profile.perfil || "usuario")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const perfil = roleRaw === "administrador" ? "admin" : roleRaw;

    // 6. Devolver os dados usados pelo Painel Frota.
    return {
      id: me.id,
      employeeId: profile.empregado_id,
      matricula: profile.matricula,
      nome: profile.nome || profile.matricula,
      perfil,
      classificacao: profile.perfil
    };
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
    el.querySelector("button").addEventListener("click", async () => {
      const activeToken = token();
      try { if (activeToken) await fetch(`${projectUrl}/logout`, { method: "POST", headers: { apikey: apiKey, Authorization: `Bearer ${activeToken}` } }); } catch (_) {}
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); location.href = "./index.html";
    }); header.appendChild(el);
  }
  async function verificarAcesso(p = page()) {
    if (!configured()) { if (home()) showLogin("O projeto ainda precisa ser configurado com a URL e a chave pública do Supabase."); else location.replace("./index.html"); return false; }
    if (!(await refreshIfNeeded())) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); if (home()) showLogin(); else location.replace("./index.html"); return false; }
    try {
      const sess = readSession(); const user = await carregarPerfil(sess.access_token, getUser()?.matricula || "");
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if (!pageAllowed(p, user.perfil)) { addStyle(); const app = document.querySelector("#app"); if (app) app.innerHTML = `<div class="pf-auth-denied"><h2>Acesso não autorizado</h2><p>Seu perfil (${safe(user.classificacao || user.perfil)}) não tem permissão para esta página.</p><p><a href="./index.html">Voltar ao menu</a></p></div>`; return false; }
      addUserControl(user);
      document.querySelectorAll("[data-admin-only], [data-employee-admin]").forEach(el => { el.hidden = user.perfil !== "admin"; });
      document.querySelectorAll("[data-report-only]").forEach(el => { el.hidden = !["admin", "supervisor"].includes(user.perfil); });
      document.querySelector(".pf-auth-shade")?.remove(); return true;
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
      if (home()) showLogin(e.message || "Sua sessão expirou. Entre novamente."); else location.replace("./index.html"); return false;
    }
  }
  let accessPromise = null;
  window.PainelFrotaAuth = { token, usuario: getUser, verificarAcesso, ready: () => accessPromise || Promise.resolve(false), adicionarControleUsuario: () => { const u = getUser(); if (u) addUserControl(u); }, supabaseUrl: rawProjectUrl, anonKey: apiKey };
  function iniciarAutenticacao() {
    if (accessPromise) return;
    addStyle(); const shade = document.createElement("div"); shade.className = "pf-auth-shade"; shade.innerHTML = `<div class="pf-auth-card"><h1>Painel Frota</h1><p>Verificando sessão de acesso…</p></div>`; document.body.appendChild(shade); accessPromise = verificarAcesso(page());
  }
  // Este script é incluído no fim do body, então podemos iniciar já e publicar
  // a Promise antes de app.js executar seus módulos.
  iniciarAutenticacao();
})();
