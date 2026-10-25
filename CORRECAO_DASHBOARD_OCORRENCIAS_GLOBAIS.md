# Dashboard: ocupação global e ocorrências em andamento do dia

## Arquivos alterados
- `js/pages/dashboard.js`: carrega lançamentos pela RPC `dashboard_lancamentos`, em vez de usar a consulta comum sujeita às políticas RLS por usuário.
- `sql/dashboard_lancamentos.sql`: cria a função RPC no Supabase.

## Comportamento
- Veículos ficam `ocupado` quando existe qualquer ocorrência `EM ANDAMENTO` associada ao veículo, independentemente do usuário que a abriu.
- Motoristas ficam `ocupado` quando existe qualquer ocorrência `EM ANDAMENTO` associada ao empregado.
- O painel lista todas as ocorrências `EM ANDAMENTO` com data de hoje, independentemente do usuário conectado.
- A função RPC exige sessão autenticada e não altera as políticas gerais de leitura da tabela `lancamentos`.

## Instalação obrigatória
1. No Supabase, abra **SQL Editor**.
2. Execute todo o conteúdo de `sql/dashboard_lancamentos.sql`.
3. Publique os arquivos do ZIP no GitHub Pages, incluindo `js/pages/dashboard.js`.
4. Entre com contas diferentes e confirme que o Dashboard apresenta o mesmo conjunto de ocorrências do dia.

A migração é necessária: somente alterar o JavaScript não permite ignorar as políticas RLS do Supabase.
