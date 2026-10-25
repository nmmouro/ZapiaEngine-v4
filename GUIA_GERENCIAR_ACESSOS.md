# Gerenciar acessos — Painel Frota

## O que foi incluído
- Tela `usuarios.html` para criar acessos de **Motorista**, **Supervisor** e **Usuário**.
- Consulta do empregado por matrícula e validação no servidor de status `ATIVO` e e-mail válido.
- Campo de senha inicial e confirmação (mínimo de 8 caracteres).
- Listagem de perfis e ativação/desativação de acessos existentes.
- A função `admin-criar-acesso` valida a sessão do administrador; a chave `service_role` permanece somente nos secrets das Edge Functions.
- `perfis_acesso.perfil` é a fonte das permissões efetivas. A coluna `empregados.classificacao` continua representando a classificação cadastral do empregado.
- `login-matricula` e `js/auth.js` validam que exista um perfil ativo vinculado à matrícula/conta.

## Publicação obrigatória
1. Faça backup do projeto atual.
2. Copie os arquivos atualizados para o repositório e publique o frontend no GitHub Pages.
3. Faça deploy das duas Edge Functions atualizadas:
   - `supabase/functions/admin-criar-acesso`
   - `supabase/functions/login-matricula`
4. No Supabase SQL Editor, execute `sql/gerenciar_acessos_perfis_rls.sql`.
5. Confirme que os secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` estão configurados nas Edge Functions. A `service_role` não deve ser colocada em arquivos do frontend.
6. Teste como administrador: consultar matrícula, criar um usuário em cada perfil, verificar a listagem, desativar e reativar um acesso e confirmar que um usuário desativado não consegue fazer novo login.

## Regras
- Só um administrador ativo pode usar as ações administrativas.
- O empregado deve estar ativo e ter e-mail válido.
- Senha inicial deve ter pelo menos 8 caracteres e ser confirmada na tela.
- Se já existir um perfil para a matrícula, o sistema não cria uma conta duplicada. Use a ação ativar/desativar na lista.
- `perfis_acesso.id` permanece `bigint IDENTITY`; o código não envia esse campo ao inserir.
- O perfil selecionado não altera `empregados.classificacao`. As permissões são derivadas de `perfis_acesso.perfil`, inclusive para a função RLS `pf_perfil_atual()`.

## Observação de segurança
A desativação atualiza `perfis_acesso.ativo`, aplica bloqueio no Supabase Auth e faz o resolvedor `pf_perfil_atual()` devolver `NULL` para o perfil inativo. Como a validade de tokens já emitidos também depende das políticas RLS existentes, revise as policies das tabelas protegidas para confirmar que verificam `pf_perfil_atual()`/`pf_empregado_id_atual()` conforme necessário.
