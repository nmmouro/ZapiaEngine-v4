// Supabase Edge Function: login-matricula
// Deploy com verify_jwt=false: valida credenciais e perfil antes de devolver a sessão.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const clean = (v: unknown) => String(v ?? "").trim();
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ error: "Configuração segura incompleta no Supabase." }, 500);
    const body = await req.json().catch(() => ({}));
    const matricula = clean(body?.matricula);
    const password = String(body?.password ?? "");
    if (!matricula || !password) return json({ error: "Informe matrícula e senha." }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: employee, error: employeeError } = await admin.from("empregados")
      .select("id, empregado, matricula, email, classificacao, status").eq("matricula", matricula).maybeSingle();
    if (employeeError || !employee) return json({ error: "Matrícula não cadastrada ou sem acesso." }, 401);
    if (clean(employee.status).toUpperCase() !== "ATIVO") return json({ error: "O cadastro do empregado não está ATIVO." }, 403);
    const email = clean(employee.email).toLowerCase();
    if (!email || !email.includes("@")) return json({ error: "O empregado não possui e-mail cadastrado válido." }, 400);

    const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) return json({ error: "Matrícula ou senha inválida." }, 401);

    const { data: profile, error: profileError } = await admin.from("perfis_acesso")
      .select("id,auth_user_id,empregado_id,matricula,nome,perfil,ativo")
      .eq("auth_user_id", data.user.id).maybeSingle();
    if (profileError || !profile) return json({ error: "A conta não possui perfil de acesso vinculado. Solicite ao administrador a regularização." }, 403);
    if (profile.ativo !== true) return json({ error: "Este acesso está desativado. Solicite ao administrador a reativação." }, 403);
    if (clean(profile.matricula) !== clean(employee.matricula)) return json({ error: "A conta autenticada não corresponde à matrícula informada." }, 403);
    if (!new Set(["admin", "motorista", "supervisor", "usuario"]).has(clean(profile.perfil).toLowerCase())) {
      return json({ error: "O perfil de acesso cadastrado não é válido." }, 403);
    }
    return json(data.session);
  } catch (_error) {
    return json({ error: "Não foi possível validar o acesso." }, 500);
  }
});
