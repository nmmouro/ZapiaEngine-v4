# Correção — IDs da Agenda e Perfis de Acesso

## Alterações no código

- A Agenda utiliza `gerarId()` de `js/engine/idService.js`.
- O prefixo `AGD` foi adicionado ao mapa central de prefixos.
- Novos agendamentos usam IDs no formato `AGD000001`, `AGD000002` etc.
- IDs antigos baseados em timestamp são preservados e ignorados na contagem sequencial.
- A geração de IDs das demais entidades foi mantida.

## SQL no Supabase

Execute somente `sql/agenda_rls_insert.sql` em Supabase > SQL Editor para criar a política de inserção da Agenda para usuários autenticados. Isso corrige especificamente a política de INSERT; não substitui políticas de leitura, edição ou exclusão.

## Perfis de Acesso

A coluna `perfis_acesso.id` já é uma coluna `IDENTITY` do PostgreSQL. Portanto, **não execute um script para criar outra sequência nem altere o DEFAULT dessa coluna**. O PostgreSQL deve gerar o ID numérico automaticamente. `auth_user_id` permanece UUID e continua sendo a associação com Supabase Auth. O código não deve enviar `id` explicitamente ao criar um perfil.

## Testes recomendados

1. Fazer login no Painel Frota.
2. Criar um agendamento e confirmar que o novo ID segue `AGD` + seis dígitos.
3. Editar e abrir uma ocorrência a partir do agendamento.
4. Confirmar que os agendamentos antigos continuam visíveis e editáveis.
5. Se a inclusão funcionar mas a listagem/edição/exclusão falhar, revisar as políticas SELECT/UPDATE/DELETE existentes da tabela `agenda`.
6. Criar um perfil pelo fluxo seguro já utilizado e confirmar que o banco gera o `id` numérico e `auth_user_id` permanece o UUID da conta.
