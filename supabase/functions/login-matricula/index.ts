// Supabase Edge Function: login-matricula
// Configuração pública: deploy com verify_jwt=false (login ainda não tem sessão).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!url || !serviceKey || !anonKey) return json({ error: "Configuração segura incompleta no Supabase." }, 500);
    const body = await req.json();
    const matricula = String(body?.matricula ?? "").trim();
    const password = String(body?.password ?? "");
    if (!matricula || !password) return json({ error: "Informe matrícula e senha." }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: employee, error: employeeError } = await admin.from("empregados")
      .select("id, empregado, matricula, email, classificacao, status")
      .eq("matricula", matricula).maybeSingle();
    if (employeeError || !employee) return json({ error: "Matrícula não cadastrada ou sem acesso." }, 401);
    if (String(employee.status ?? "").trim().toUpperCase() !== "ATIVO") return json({ error: "O cadastro do empregado não está ATIVO." }, 403);
    const email = String(employee.email ?? "").trim().toLowerCase();
    if (!email) return json({ error: "O empregado não possui e-mail cadastrado." }, 400);

    const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) return json({ error: "Matrícula ou senha inválida." }, 401);
    return json(data.session);
  } catch (_error) {
    return json({ error: "Não foi possível validar o acesso." }, 500);
  }
});
