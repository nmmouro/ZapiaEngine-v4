import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { supabase } from "./db.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(ROOT, ".env"), override: false });
const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_SECRET = String(process.env.AUTH_SECRET || "").trim();
const ACCESS_TABLE = "usuario_acesso";
const TOKEN_TTL_SECONDS = 12 * 60 * 60;
const TABLES = new Set(["veiculos", "empregados", "lancamentos", "abastecimento", "abastecimentos", "avarias", "checklist", "lava_car", "manutencao"]);
const CHILD_TABLES = new Set(["abastecimento", "abastecimentos", "avarias", "checklist", "lava_car", "manutencao"]);

if (AUTH_SECRET.length < 32) throw new Error("AUTH_SECRET deve ter pelo menos 32 caracteres aleatórios no .env.");
app.disable("x-powered-by");
app.use(cors({ origin: true, methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => { console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`); next(); });

const normalize = value => String(value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function profileOf(employee) {
  const raw = normalize(employee?.classificacao || employee?.perfil || employee?.usuario || "usuario");
  if (["admin", "administrador", "administradora"].includes(raw)) return "admin";
  if (["supervisor", "supervisora"].includes(raw)) return "supervisor";
  if (["motorista", "condutor"].includes(raw)) return "motorista";
  return "usuario";
}
function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored || "").split(":");
  if (!salt || !expectedHex || !/^[a-f0-9]+$/i.test(expectedHex)) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ ...user, iat: now, exp: now + TOKEN_TTL_SECONDS })).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function decodeToken(token) {
  const [payload, signature, extra] = String(token || "").split(".");
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest();
  let supplied; try { supplied = Buffer.from(signature, "base64url"); } catch { return null; }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  let user; try { user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!user.exp || user.exp < Math.floor(Date.now() / 1000)) return null;
  return user;
}
function authRequired(req, res, next) {
  const match = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  const user = match && decodeToken(match[1]);
  if (!user) return res.status(401).json({ sucesso: false, message: "Sessão ausente ou expirada. Entre novamente no Painel Frota." });
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  if (req.user?.perfil !== "admin") return res.status(403).json({ sucesso: false, message: "Somente o administrador pode gerenciar acessos e empregados." });
  next();
}
function apiError(res, error, message = "Erro ao consultar o banco de dados.") {
  console.error(message, error?.message || error);
  return res.status(500).json({ sucesso: false, message, erro: error?.message || String(error) });
}
async function employeeForMatricula(matricula) {
  const { data, error } = await supabase.from("empregados").select("*").eq("matricula", matricula).maybeSingle();
  if (error) throw error;
  return data;
}
async function ownedLaunchIds(user) {
  const { data, error } = await supabase.from("lancamentos").select("id").eq("id_empregado", user.employeeId);
  if (error) throw error;
  return (data || []).map(row => row.id).filter(Boolean);
}
async function assertOwnLaunch(user, launchId) {
  if (user.perfil === "admin" || user.perfil === "supervisor") return true;
  if (!launchId) return false;
  const { data, error } = await supabase.from("lancamentos").select("id").eq("id", launchId).eq("id_empregado", user.employeeId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
function queryToSupabase(query, builder) {
  const reserved = new Set(["select", "offset", "limit", "order"]);
  for (const [key, raw] of Object.entries(query)) {
    if (reserved.has(key) || typeof raw !== "string") continue;
    const dot = raw.indexOf(".");
    const op = dot > 0 ? raw.slice(0, dot) : "eq";
    const value = dot > 0 ? raw.slice(dot + 1) : raw;
    if (op === "eq") builder = builder.eq(key, value);
    else if (op === "neq") builder = builder.neq(key, value);
    else if (op === "gt") builder = builder.gt(key, value);
    else if (op === "gte") builder = builder.gte(key, value);
    else if (op === "lt") builder = builder.lt(key, value);
    else if (op === "lte") builder = builder.lte(key, value);
    else if (op === "is" && ["null", "true", "false"].includes(value)) builder = builder.is(key, value === "null" ? null : value === "true");
    else if (op === "in" && value.startsWith("(") && value.endsWith(")")) builder = builder.in(key, value.slice(1, -1).split(",").map(v => v.replace(/^"|"$/g, "")));
  }
  if (query.order) {
    const [column, direction] = String(query.order).split(".");
    if (/^[a-zA-Z0-9_]+$/.test(column)) builder = builder.order(column, { ascending: direction !== "desc" });
  }
  const limit = Math.max(1, Math.min(1000, Number(query.limit || 1000)));
  const offset = Math.max(0, Number(query.offset || 0));
  return builder.range(offset, offset + limit - 1);
}

app.get("/", (_req, res) => res.sendFile(join(ROOT, "index.html")));
app.get("/health", async (_req, res) => {
  try { const { error } = await supabase.from("veiculos").select("id").limit(1); if (error) throw error; res.json({ sucesso: true, api: "online", banco: "online" }); }
  catch (error) { apiError(res, error, "API online, mas não foi possível consultar o Supabase."); }
});

// Login: a conta precisa existir em usuario_acesso e a matrícula em empregados.
app.post("/api/auth/login", async (req, res) => {
  try {
    const matricula = String(req.body?.matricula || "").trim();
    const senha = String(req.body?.senha || "");
    if (!matricula || !senha) return res.status(400).json({ sucesso: false, message: "Informe matrícula e senha." });
    const { data: account, error: accountError } = await supabase.from(ACCESS_TABLE).select("*").eq("matricula", matricula).maybeSingle();
    if (accountError) throw accountError;
    if (!account || account.ativo === false || !verifyPassword(senha, account.senha_hash)) return res.status(401).json({ sucesso: false, message: "Matrícula ou senha inválida, ou acesso bloqueado." });
    const employee = await employeeForMatricula(matricula);
    if (!employee) return res.status(403).json({ sucesso: false, message: "A matrícula não está cadastrada em Empregados." });
    if (normalize(employee.status || "ativo") !== "ativo") return res.status(403).json({ sucesso: false, message: "Empregado inativo. Procure o administrador." });
    const perfil = profileOf(employee);
    const user = { employeeId: employee.id, matricula, nome: employee.empregado || employee.nome || matricula, perfil, classificacao: employee.classificacao || employee.usuario || perfil };
    const { error: updateError } = await supabase.from(ACCESS_TABLE).update({ ultimo_acesso: new Date().toISOString() }).eq("matricula", matricula);
    if (updateError) console.warn("Não foi possível atualizar ultimo_acesso:", updateError.message);
    return res.json({ sucesso: true, token: issueToken(user), usuario: user });
  } catch (error) { return apiError(res, error, "Falha ao autenticar. Confira se a tabela usuario_acesso existe e contém matricula, senha_hash e ativo."); }
});
app.get("/api/auth/me", authRequired, (req, res) => res.json({ sucesso: true, usuario: { employeeId: req.user.employeeId, matricula: req.user.matricula, nome: req.user.nome, perfil: req.user.perfil, classificacao: req.user.classificacao } }));
app.post("/api/auth/logout", authRequired, (_req, res) => res.json({ sucesso: true, message: "Sessão encerrada no cliente. Remova o token armazenado." }));

// Gerenciamento de contas: somente administrador.
app.get("/api/admin/usuarios", authRequired, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase.from(ACCESS_TABLE).select("id,matricula,ativo,ultimo_acesso").order("matricula");
    if (error) throw error;
    const rows = [];
    for (const account of data || []) {
      const employee = await employeeForMatricula(account.matricula);
      rows.push({ ...account, nome: employee?.empregado || employee?.nome || "Matrícula sem empregado", classificacao: employee ? (employee.classificacao || employee.usuario || profileOf(employee)) : "—", perfil: employee ? profileOf(employee) : "usuario" });
    }
    res.json({ sucesso: true, dados: rows });
  } catch (error) { apiError(res, error, "Não foi possível listar os acessos."); }
});
app.post("/api/admin/usuarios", authRequired, requireAdmin, async (req, res) => {
  try {
    const matricula = String(req.body?.matricula || "").trim();
    const senha = String(req.body?.senha || "");
    if (!matricula || senha.length < 8) return res.status(400).json({ sucesso: false, message: "Informe uma matrícula e uma senha de pelo menos 8 caracteres." });
    const employee = await employeeForMatricula(matricula);
    if (!employee) return res.status(404).json({ sucesso: false, message: "Matrícula não encontrada em Empregados." });
    const { error } = await supabase.from(ACCESS_TABLE).upsert({ matricula, senha_hash: passwordHash(senha), ativo: true, atualizado_em: new Date().toISOString() }, { onConflict: "matricula" });
    if (error) throw error;
    res.status(201).json({ sucesso: true, message: "Acesso criado/atualizado com sucesso." });
  } catch (error) { apiError(res, error, "Não foi possível criar o acesso."); }
});
app.patch("/api/admin/usuarios/:id", authRequired, requireAdmin, async (req, res) => {
  try {
    const ativo = req.body?.ativo;
    if (typeof ativo !== "boolean") return res.status(400).json({ sucesso: false, message: "Informe ativo como true ou false." });
    const { data, error } = await supabase.from(ACCESS_TABLE).update({ ativo, atualizado_em: new Date().toISOString() }).eq("id", req.params.id).select("id,matricula,ativo").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ sucesso: false, message: "Conta não encontrada." });
    res.json({ sucesso: true, dados: data });
  } catch (error) { apiError(res, error, "Não foi possível alterar o acesso."); }
});

// API de dados protegida. Todas as consultas passam pelo servidor, nunca pela chave pública do navegador.
app.all("/api/data/:table", authRequired, async (req, res) => {
  const table = String(req.params.table || "").toLowerCase();
  const user = req.user;
  const method = req.method.toUpperCase();
  if (!TABLES.has(table)) return res.status(404).json({ sucesso: false, message: "Tabela não permitida pela API." });
  const admin = user.perfil === "admin";
  const supervisor = user.perfil === "supervisor";
  const privileged = admin || supervisor;
  const employeeTable = table === "empregados";
  const launchTable = table === "lancamentos";
  const childTable = CHILD_TABLES.has(table);
  if (employeeTable && !admin && method !== "GET") return res.status(403).json({ sucesso: false, message: "Somente o administrador pode alterar empregados." });
  if (method === "DELETE" && !admin) return res.status(403).json({ sucesso: false, message: "Este perfil não tem permissão para excluir registros." });
  if (!privileged && !["GET", "POST", "PATCH", "PUT"].includes(method)) return res.status(403).json({ sucesso: false, message: "Operação não permitida." });
  if (!privileged && !launchTable && !childTable && !["GET"].includes(method)) return res.status(403).json({ sucesso: false, message: "Seu perfil só pode cadastrar/editar lançamentos e ocorrências relacionadas." });
  try {
    if (method === "GET") {
      let builder = supabase.from(table).select("*");
      if (!privileged) {
        if (launchTable) builder = builder.eq("id_empregado", user.employeeId);
        else if (childTable) {
          const ids = await ownedLaunchIds(user);
          if (!ids.length) return res.json([]);
          builder = builder.in("id_lancamento", ids);
        } else if (employeeTable) builder = builder.eq("id", user.employeeId);
      }
      const result = await queryToSupabase(req.query, builder);
      if (result.error) throw result.error;
      return res.json(result.data || []);
    }
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) return res.status(405).json({ sucesso: false, message: "Método não permitido." });
    if (method === "POST") {
      const payload = Array.isArray(req.body) ? req.body[0] : { ...(req.body || {}) };
      if (!payload || typeof payload !== "object") return res.status(400).json({ sucesso: false, message: "Corpo da requisição inválido." });
      if (!privileged && launchTable) {
        payload.id_empregado = user.employeeId;
        const { data: employee } = await supabase.from("empregados").select("empregado,matricula").eq("id", user.employeeId).maybeSingle();
        if (employee) payload.empregado_matricula = `${employee.empregado || ""} / ${employee.matricula || user.matricula}`.trim();
      }
      if (!privileged && childTable && !(await assertOwnLaunch(user, payload.id_lancamento))) return res.status(403).json({ sucesso: false, message: "A ocorrência relacionada não pertence ao seu usuário." });
      const { data, error } = await supabase.from(table).insert(payload).select("*");
      if (error) throw error;
      return res.status(201).json(data || []);
    }
    const idFilter = req.query.id;
    const id = typeof idFilter === "string" && idFilter.startsWith("eq.") ? decodeURIComponent(idFilter.slice(3)) : null;
    if (!id) return res.status(400).json({ sucesso: false, message: "A atualização/exclusão exige o filtro id=eq.ID." });
    if (!privileged) {
      if (launchTable) {
        if (!(await assertOwnLaunch(user, id))) return res.status(403).json({ sucesso: false, message: "Este lançamento não pertence ao seu usuário." });
      } else if (childTable) {
        const { data: row, error } = await supabase.from(table).select("id_lancamento").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!row || !(await assertOwnLaunch(user, row.id_lancamento))) return res.status(403).json({ sucesso: false, message: "Esta ocorrência não pertence ao seu usuário." });
      }
    }
    if (method === "DELETE") {
      const { data, error } = await supabase.from(table).delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) return res.status(404).json({ sucesso: false, message: "Registro não encontrado." });
      return res.json(data);
    }
    const payload = { ...(req.body || {}) };
    delete payload.id; delete payload.ID; delete payload.criado_em; delete payload.atualizado_em;
    if (!privileged && launchTable) { delete payload.id_empregado; delete payload.usuario; delete payload.classificacao; }
    if (!privileged && childTable) delete payload.id_lancamento;
    const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*");
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ sucesso: false, message: "Registro não encontrado." });
    return res.json(data);
  } catch (error) { return apiError(res, error, `Falha na operação ${method} da tabela ${table}. Confira os nomes das tabelas/colunas no Supabase.`); }
});

// Hospeda o frontend também em http://localhost:3000, usando a pasta do projeto.
app.use(express.static(ROOT, { extensions: ["html"] }));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(join(ROOT, "index.html"));
});
app.use((req, res) => res.status(404).json({ sucesso: false, message: "Rota não encontrada.", rota: req.originalUrl }));
app.listen(PORT, () => console.log(`Painel Frota API online em http://localhost:${PORT} | Supabase configurado | tabelas protegidas`));
