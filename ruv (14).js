/**
 * SCHEMA — RUV
 * Relatório de Utilização de Veículo.
 *
 * O RUV é um relatório consolidado de lançamentos.
 * A ordenação é declarativa e consumida pela infraestrutura global do Engine.
 */
export const SCHEMA_RUV = {
    entity: "ruv",
    title: "RUV - Relatório de Utilização de Veículo",
    orderBy: [
        { field: "data", direction: "desc" },
        { field: "id", direction: "desc" },
        { field: "horario_inicial", direction: "desc" }
    ],
    fields: [
        { name: "data", label: "Data", type: "date" },
        { name: "id", label: "ID", type: "text" },
        { name: "placa_modelo", label: "Placa / Modelo", type: "text" },
        { name: "horario_inicial", label: "Horário Inicial", type: "time" },
        { name: "horario_final", label: "Horário Final", type: "time" },
        { name: "km_inicial", label: "Km Inicial", type: "number" },
        { name: "km_final", label: "Km Final", type: "number" },
        { name: "distancia_percorrida", label: "Distância Percorrida", type: "number" },
        { name: "media_consumo_combustivel", label: "Média de Consumo", type: "number" },
        { name: "valor_higienizacao", label: "Valor Higienização", type: "number" },
        { name: "notas_abastecimento", label: "Notas Abastecimento", type: "number" },
        { name: "notas_manutencao", label: "Notas Manutenção", type: "number" }
    ]
};

export default SCHEMA_RUV;
