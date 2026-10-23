// Supabase Edge Function: admin-criar-acesso
// Só um administrador autenticado pode criar acesso para um empregado MOTORISTA ativo.
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
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!url || !serviceKey || !anonKey) return json({ error: "Configuração segura incompleta no Supabase." }, 500);
    if (!accessToken) return json({ error: "É necessário entrar como administrador." }, 401);

    const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken);
    const caller = userData?.user;
    if (userError || !caller?.email) return json({ error: "Sessão inválida. Entre novamente." }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: admins, error: adminLookupError } = await admin.from("empregados")
      .select("id, classificacao, status")
      .eq("email", caller.email.trim().toLowerCase());
    const isAdmin = !adminLookupError && Array.isArray(admins) && admins.some((row: any) =>
      String(row.classificacao ?? "").trim().toUpperCase() === "ADMIN" &&
      String(row.status ?? "").trim().toUpperCase() === "ATIVO");
    if (!isAdmin) return json({ error: "Somente um administrador ativo pode criar acessos." }, 403);

    const body = await req.json();
    const matricula = String(body?.matricula ?? "").trim();
    const password = String(body?.password ?? "");
    if (!matricula) return json({ error: "Informe a matrícula do motorista." }, 400);
    if (password.length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);

    const { data: employee, error: employeeError } = await admin.from("empregados")
      .select("id, empregado, matricula, email, classificacao, status")
      .eq("matricula", matricula).maybeSingle();
    if (employeeError || !employee) return json({ error: "Não foi encontrado empregado com essa matrícula." }, 404);
    if (String(employee.classificacao ?? "").trim().toUpperCase() !== "MOTORISTA") {
      return json({ error: "A classificação do empregado deve ser MOTORISTA." }, 400);
    }
    if (String(employee.status ?? "").trim().toUpperCase() !== "ATIVO") {
      return json({ error: "O empregado precisa estar com status ATIVO." }, 400);
    }
    const email = String(employee.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) return json({ error: "Cadastre um e-mail válido para o empregado antes de criar o acesso." }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { matricula: String(employee.matricula), empregado_id: employee.id },
    });
    if (createError || !created.user) {
      const message = String(createError?.message || "");
      if (/already|registered|exists/i.test(message)) {
        return json({ error: "Já existe uma conta de autenticação para esse e-mail. Não foi criada uma conta duplicada." }, 409);
      }
      return json({ error: createError?.message || "Não foi possível criar a conta de autenticação." }, 400);
    }
    return json({ ok: true, nome: employee.empregado, matricula: String(employee.matricula), email });
  } catch (_error) {
    return json({ error: "Erro interno ao criar acesso. Verifique os logs da Edge Function no Supabase." }, 500);
  }
});
