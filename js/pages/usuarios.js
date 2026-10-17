(() => {
  const box = document.querySelector("#lista-acessos");
  const form = document.querySelector("#form-acesso");
  if (form) form.hidden = true;
  if (box) box.innerHTML = `<p><strong>Cadastro seguro de acessos</strong></p><p>Por segurança, o navegador não cria usuários administrativos do Supabase. O administrador deve criar a conta em Supabase → Authentication → Users e vincular o UUID à tabela <code>public.perfis_acesso</code>, seguindo o arquivo <code>SUPABASE_MIGRACAO_SEM_RENDER.md</code> incluído neste projeto.</p><p>Não coloque a chave secreta (service_role / sb_secret) neste site.</p>`;
})();
