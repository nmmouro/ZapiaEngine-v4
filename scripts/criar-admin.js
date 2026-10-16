import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ROOT = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(ROOT, "../.env"), override: false });
const url = String(process.env.SUPABASE_URL || "").trim();
const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !key || /^sb_publishable_/i.test(key)) throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY secreta no .env local antes de continuar.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const rl = readline.createInterface({ input, output });
const normalize = v => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
try {
  const matricula = (await rl.question("Matrícula do empregado administrador: ")).trim();
  const senha = await rl.question("Defina uma senha (mínimo 8 caracteres): ");
  if (!matricula || senha.length < 8) throw new Error("Matrícula obrigatória e senha com pelo menos 8 caracteres.");
  const { data: employee, error: empError } = await supabase.from("empregados").select("*").eq("matricula", matricula).maybeSingle();
  if (empError) throw empError;
  if (!employee) throw new Error("Matrícula não encontrada na tabela empregados.");
  if (normalize(employee.status || "ativo") !== "ativo") throw new Error("O empregado está inativo; ative o cadastro antes de criar o administrador.");
  const role = normalize(employee.classificacao || employee.perfil || employee.usuario || "");
  if (!["admin", "administrador", "administradora"].includes(role)) throw new Error("O cadastro do empregado precisa estar classificado como ADMIN/ADMINISTRADOR antes de criar a conta inicial.");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = `${salt}:${crypto.scryptSync(senha, salt, 64).toString("hex")}`;
  const { error } = await supabase.from("usuario_acesso").upsert({ matricula, senha_hash: hash, ativo: true, atualizado_em: new Date().toISOString() }, { onConflict: "matricula" });
  if (error) throw error;
  console.log("Conta de administrador criada/atualizada. A senha não foi gravada em texto puro.");
} catch (error) {
  console.error("Não foi possível criar a conta:", error.message || error);
  process.exitCode = 1;
} finally { rl.close(); }
