// Supabase Edge Function: admin-criar-acesso
// Administração segura de acessos. A service_role existe apenas nos secrets da Edge Function.
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
const norm = (v: unknown) => clean(v).toUpperCase();
const ALLOWED_ROLES = new Set(["motorista", "supervisor", "usuario"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const accessToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!url || !serviceKey || !anonKey) return json({ error: "Configuração segura incompleta no Supabase." }, 500);
    if (!accessToken) return json({ error: "É necessário entrar como administrador." }, 401);

    const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken);
    const caller = userData?.user;
    if (userError || !caller?.id || !caller.email) return json({ error: "Sessão inválida. Entre novamente." }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const callerEmail = clean(caller.email).toLowerCase();
    const [{ data: callerEmployees, error: callerEmployeeError }, { data: callerProfile, error: callerProfileError }] = await Promise.all([
      admin.from("empregados").select("id, classificacao, status, email").eq("email", callerEmail),
      admin.from("perfis_acesso").select("auth_user_id, perfil, ativo, matricula").eq("auth_user_id", caller.id).maybeSingle()
    ]);
    const activeAdminEmployee = !callerEmployeeError && Array.isArray(callerEmployees) && callerEmployees.some((row: any) =>
      norm(row.classificacao) === "ADMIN" && norm(row.status) === "ATIVO");
    const activeAdminProfile = !callerProfileError && callerProfile && callerProfile.ativo === true && clean(callerProfile.perfil).toLowerCase() === "admin";
    const isAdmin = activeAdminEmployee && activeAdminProfile;
    if (!isAdmin) return json({ error: "Somente um administrador ativo com perfil admin ativo pode gerenciar acessos." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action || "create").toLowerCase();

    if (action === "list") {
      const [{ data: profiles, error: profilesError }, { data: employees, error: employeesError }] = await Promise.all([
        admin.from("perfis_acesso").select("id,auth_user_id,empregado_id,matricula,nome,perfil,ativo,criado_em,atualizado_em").order("matricula"),
        admin.from("empregados").select("id,empregado,matricula,email,classificacao,status")
      ]);
      if (profilesError) return json({ error: `Não foi possível listar os acessos: ${profilesError.message}` }, 400);
      if (employeesError) return json({ error: `Não foi possível consultar empregados: ${employeesError.message}` }, 400);
      const byMatricula = new Map((employees || []).map((e: any) => [clean(e.matricula), e]));
      const result = (profiles || []).map((p: any) => {
        const e: any = byMatricula.get(clean(p.matricula)) || {};
        return { id: p.id, auth_user_id: p.auth_user_id, empregado_id: p.empregado_id, matricula: p.matricula,
          nome: p.nome || e.empregado || p.matricula, email: clean(e.email).toLowerCase(), perfil: p.perfil,
          ativo: p.ativo === true, empregado_status: e.status || "", classificacao_empregado: e.classificacao || "" };
      });
      return json({ ok: true, acessos: result });
    }

    const matricula = clean(body?.matricula);
    if (!matricula) return json({ error: "Informe a matrícula do empregado." }, 400);
    const { data: employee, error: employeeError } = await admin.from("empregados")
      .select("id, empregado, matricula, email, classificacao, status")
      .eq("matricula", matricula).maybeSingle();
    if (employeeError || !employee) return json({ error: "Não foi encontrado empregado com essa matrícula." }, 404);

    if (action === "lookup") {
      const email = clean(employee.email).toLowerCase();
      if (norm(employee.status) !== "ATIVO") return json({ error: "O empregado está inativo. Ative o cadastro em Empregados antes de criar acesso." }, 400);
      if (!email || !email.includes("@")) return json({ error: "O empregado não possui um e-mail válido cadastrado." }, 400);
      const { data: existing, error: existingError } = await admin.from("perfis_acesso")
        .select("id,auth_user_id,matricula,nome,perfil,ativo").eq("matricula", matricula).maybeSingle();
      if (existingError) return json({ error: `Não foi possível verificar o acesso existente: ${existingError.message}` }, 400);
      return json({ ok: true, empregado: { id: employee.id, nome: employee.empregado, matricula: String(employee.matricula),
        email, classificacao: employee.classificacao, status: employee.status }, acesso_existente: existing ? {
        id: existing.id, perfil: existing.perfil, ativo: existing.ativo === true, auth_user_id: existing.auth_user_id
      } : null });
    }

    if (action === "set-active") {
      const active = body?.ativo === true;
      const { data: profile, error: profileError } = await admin.from("perfis_acesso")
        .select("id,auth_user_id,matricula,perfil,ativo").eq("matricula", matricula).maybeSingle();
      if (profileError || !profile) return json({ error: "Não foi encontrado perfil de acesso para essa matrícula." }, 404);
      if (norm(employee.status) !== "ATIVO" && active) return json({ error: "Não é possível ativar o acesso: o empregado está inativo." }, 400);
      const { error: updateError } = await admin.from("perfis_acesso").update({ ativo: active, atualizado_em: new Date().toISOString() }).eq("id", profile.id);
      if (updateError) return json({ error: `Não foi possível atualizar o acesso: ${updateError.message}` }, 400);
      // Bloqueio adicional no Supabase Auth; a tabela e a função de login também verificam ativo.
      const { error: banError } = await admin.auth.admin.updateUserById(profile.auth_user_id, {
        ban_duration: active ? "none" : "876000h"
      });
      if (banError) {
        await admin.from("perfis_acesso").update({ ativo: profile.ativo === true, atualizado_em: new Date().toISOString() }).eq("id", profile.id);
        return json({ error: `O perfil não foi alterado porque o Supabase Auth não confirmou a mudança: ${banError.message}` }, 400);
      }
      return json({ ok: true, matricula, ativo: active, perfil: profile.perfil });
    }

    if (action !== "create") return json({ error: "Ação não reconhecida." }, 400);
    const role = clean(body?.perfil).toLowerCase();
    const password = String(body?.password ?? "");
    if (!ALLOWED_ROLES.has(role)) return json({ error: "Selecione Motorista, Supervisor ou Usuário." }, 400);
    if (password.length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
    if (norm(employee.status) !== "ATIVO") return json({ error: "O empregado precisa estar com status ATIVO." }, 400);
    const email = clean(employee.email).toLowerCase();
    if (!email || !email.includes("@")) return json({ error: "Cadastre um e-mail válido para o empregado antes de criar o acesso." }, 400);

    const { data: existingProfile, error: existingProfileError } = await admin.from("perfis_acesso")
      .select("id,auth_user_id,perfil,ativo").eq("matricula", matricula).maybeSingle();
    if (existingProfileError) return json({ error: `Não foi possível verificar perfil existente: ${existingProfileError.message}` }, 400);
    if (existingProfile) return json({ error: `Já existe um perfil para esta matrícula (${existingProfile.perfil}, ${existingProfile.ativo ? "ativo" : "inativo"}). Use a lista para ativar/desativar o acesso; não foi criada outra conta.` }, 409);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { matricula: String(employee.matricula), empregado_id: employee.id, perfil_acesso: role }
    });
    if (createError || !created.user) {
      const message = String(createError?.message || "");
      if (/already|registered|exists/i.test(message)) return json({ error: "Já existe uma conta Supabase Auth para esse e-mail. Verifique Authentication → Users e vincule/regularize o perfil antes de tentar novamente." }, 409);
      return json({ error: message || "Não foi possível criar a conta de autenticação." }, 400);
    }

    const { error: insertError } = await admin.from("perfis_acesso").insert({
      auth_user_id: created.user.id, empregado_id: String(employee.id), matricula: String(employee.matricula),
      nome: clean(employee.empregado) || String(employee.matricula), perfil: role, ativo: true,
      atualizado_em: new Date().toISOString()
    });
    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: `A conta não foi mantida porque não foi possível gravar o perfil de acesso: ${insertError.message}` }, 400);
    }
    return json({ ok: true, nome: employee.empregado, matricula: String(employee.matricula), email, perfil: role, ativo: true });
  } catch (_error) {
    return json({ error: "Erro interno ao gerenciar acessos. Verifique os logs da Edge Function no Supabase." }, 500);
  }
});
