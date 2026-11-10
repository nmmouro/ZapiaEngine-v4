# Correção da coluna `usuario` em novas ocorrências

Arquivo alterado: `js/services/crudService.js`.

Na função `criar()`, depois da normalização do payload e antes do POST ao Supabase,
quando a entidade é `lancamentos`, o campo `usuario` é definido a partir do perfil
retornado por `window.PainelFrotaAuth.usuario()`. Isso evita depender apenas do
campo oculto no formulário. A regra é aplicada somente na criação de novos registros,
não na atualização de ocorrências existentes.

Também foi mantido o preenchimento visual no arquivo `js/pages/lancamentos.js`.
Após publicar, confira no DevTools > Network o payload POST para `lancamentos`:
a propriedade `usuario` deve conter o nome da conta conectada.
