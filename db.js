import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = dirname(fileURLToPath(import.meta.url));
// Carrega o .env ao lado deste arquivo, independentemente da pasta de onde npm start foi executado.
dotenv.config({ path: resolve(ROOT, ".env"), override: false });

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!SUPABASE_URL) throw new Error(`DB: SUPABASE_URL não configurada. Confira o arquivo: ${resolve(ROOT, ".env")}`);
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)) throw new Error("DB: SUPABASE_URL inválida. Use a URL HTTPS do projeto exibida no painel Supabase.");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error(`DB: SUPABASE_SERVICE_ROLE_KEY não configurada no arquivo ${resolve(ROOT, ".env")}.`);
if (/^sb_publishable_/i.test(SUPABASE_SERVICE_ROLE_KEY) || (!/^sb_secret_/i.test(SUPABASE_SERVICE_ROLE_KEY) && !/^eyJ/i.test(SUPABASE_SERVICE_ROLE_KEY))) {
  throw new Error("DB: SUPABASE_SERVICE_ROLE_KEY não parece ser uma chave secreta. Use sb_secret_... ou a service_role legada; nunca use a chave publicável.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
export async function testarConexao() {
  const { error } = await supabase.from("veiculos").select("id").limit(1);
  if (error) throw error;
  return true;
}
export default supabase;
