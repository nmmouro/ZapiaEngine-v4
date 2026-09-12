# Lançamentos — ajuste dos campos calculados

## Alteração

Os campos:

- `distancia_percorrida`
- `duracao_atendimento`

não são mais exibidos durante a abertura de uma ocorrência.

### Abertura

Continuam visíveis apenas os campos necessários para iniciar a ocorrência.

### Conclusão

Os dois campos passam a ser exibidos somente na etapa de conclusão, depois de:

- `horario_final`
- `km_final`

Os valores continuam sendo calculados automaticamente pelo `lancamentos.js`.

## Arquivos alterados

- `js/schemas/lancamentos.js`
- `js/pages/lancamentos.js`
