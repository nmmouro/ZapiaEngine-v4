# Usuário e Empregado/Matrícula automáticos nas ocorrências

`js/pages/lancamentos.js` preenche `usuario` com o nome da conta autenticada e `id_empregado` com o `employeeId` do perfil autenticado. O rótulo visível e o snapshot `empregado_matricula` são preenchidos com `nome / matrícula`. O select permanece no formulário para ser enviado no `FormData`, mas fica visualmente bloqueado para impedir a escolha de outro empregado.

O perfil retornado por `PainelFrotaAuth.usuario()` precisa conter `employeeId` (o `js/auth.js` do ZIP já retorna esse campo), `nome` e `matricula`.
