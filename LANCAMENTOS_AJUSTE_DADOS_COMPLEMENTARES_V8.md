# Lançamentos — dados complementares somente na conclusão

A abertura da ocorrência fica restrita aos dados necessários para criar o
lançamento e iniciar o atendimento.

## Abertura

- Data
- Hora
- Empregado / Matrícula
- Veículo / Modelo
- Passageiro / Setor / Motivo
- Itinerário
- Horário Inicial
- Km Inicial
- Localização inicial

## Conclusão

Passam para a conclusão todos os dados complementares:

- Avaliação Visual
- Avarias Registradas
- Km Final
- Horário Final
- Combustível
- Média de consumo de combustível
- Distância Percorrida
- Duração do Atendimento
- Lava-Car
- Valor Higienização
- Valor da Nota de Abastecimento
- Notas de Manutenção
- Checklist
- Horas Extras
- Revisão

Isso também respeita o vínculo das rotinas complementares (Checklist,
Abastecimento, Avarias, Lava-Car e Manutenção), que dependem do ID do
lançamento já criado para usar `id_lancamento`.

A avaliação visual, que na versão anterior havia sido colocada na abertura,
também acompanha a nova regra de que todo o conjunto complementar fica na
conclusão.
