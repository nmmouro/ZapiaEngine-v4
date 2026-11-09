export const SCHEMA_LAVA_CAR = {
    entity: "lava_car",
    table: "lava_car",
    title: "Lava-car",
    fields: [
        { name: "id_lancamento", label: "Lançamento", type: "text", readonly: true, hidden: true },
        { name: "data", label: "Data", type: "date", readonly: true },
        { name: "hora", label: "Hora", type: "time", readonly: true },

        { name: "empregado_matricula", label: "Empregado / Matrícula", type: "text", readonly: true },
        { name: "placa_modelo", label: "Placa / Modelo", type: "text", readonly: true },

        {
            name: "opcao",
            label: "Serviço",
            type: "select",
            required: true,
            options: [
                { value: "aparencia_creta", label: "Creta Aparência" },
                { value: "aparencia_trail", label: "Treail Aparência" },
                { value: "completa_creta", label: "Creta Completa" },
                { value: "completa_cera_creta", label: "Creta Completa + Cera" },
                { value: "completa_trail", label: "Trail Completa" },
                { value: "completa_cera_trail", label: "Trail Completa + Cera" }
            ]
        },

        { name: "valor", label: "Valor (R$)", type: "number", readonly: true, required: true },
        { name: "usuario", label: "Usuário", type: "text", readonly: true },
        

        { name: "criado_em", label: "Criado em", type: "datetime", readonly: true, hidden: true },
        { name: "atualizado_em", label: "Atualizado em", type: "datetime", readonly: true, hidden: true }
    ]
};

export default SCHEMA_LAVA_CAR;
