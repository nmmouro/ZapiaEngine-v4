# Correção: coluna `usuario` nos lançamentos

Foi ajustado `js/pages/lancamentos.js` para preencher o campo oculto `usuario`
com o nome do empregado autenticado quando uma nova ocorrência é aberta e
novamente imediatamente antes de salvar a abertura.

O nome é obtido de `window.PainelFrotaAuth.usuario()` (priorizando `nome`,
depois `empregado`, `name` e, como fallback, `matricula`). A regra vale para
motorista, administrador e usuário; não depende do empregado selecionado no
campo da ocorrência.

O campo `usuario` já existia no schema como oculto e somente leitura, portanto
não foi alterada a estrutura do banco de dados.

Após publicar, abra uma nova ocorrência e confira na tabela `lancamentos` a
coluna `usuario`. O nome será gravado quando a conta autenticada tiver esse
nome disponível no perfil retornado pela autenticação.
