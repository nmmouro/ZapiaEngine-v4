# Acesso de MOTORISTA — Painel Frota

Esta atualização permite que um administrador autenticado crie acesso para um empregado já cadastrado com classificação MOTORISTA, status ATIVO e e-mail válido. O login passa a localizar o e-mail pela matrícula no servidor, sem lista de matrículas fixa no JavaScript.

## Segurança
- A chave `service_role` é usada somente dentro das Supabase Edge Functions; nunca a coloque no frontend/GitHub Pages.
- `admin-criar-acesso` confere a sessão Supabase e verifica na tabela `public.empregados` que o solicitante é ADMIN e ATIVO.
- Só cria conta para empregados MOTORISTA e ATIVO. Senha mínima de 8 caracteres.
- O e-mail do empregado deve ser único e em letras minúsculas.

## Publicar as funções no projeto Supabase
Projeto/ref configurado neste pacote: `iomekawabacmuhlltket`.

1. Instale o Supabase CLI e entre na sua conta: `supabase login`.
2. No terminal, entre na pasta `ZapiaEngine-v4-main` deste projeto.
3. Vincule o projeto: `supabase link --project-ref iomekawabacmuhlltket`.
4. Publique as funções:
   - `supabase functions deploy login-matricula --project-ref iomekawabacmuhlltket`
   - `supabase functions deploy admin-criar-acesso --project-ref iomekawabacmuhlltket`
5. As Edge Functions usam os segredos de ambiente fornecidos pelo Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Não adicione segredo no JavaScript. Se o painel do projeto não disponibilizar alguma variável, configure-a em Edge Functions → Secrets com os valores do próprio projeto.
6. Publique os arquivos do frontend no GitHub Pages. Faça recarga forçada (Ctrl+F5).

## Uso
1. Entre no Painel Frota como ADMIN.
2. Cadastre o empregado na página Empregados, com e-mail, classificação MOTORISTA e status ATIVO.
3. No cabeçalho, clique em **Criar acesso MOTORISTA**.
4. Informe a matrícula e defina/confirme uma senha inicial de pelo menos 8 caracteres.
5. O motorista entra com matrícula e senha.

Se a conta já existir no Supabase Auth, a função não cria duplicata; será necessário usar um fluxo separado de redefinição de senha.
