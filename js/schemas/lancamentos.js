/**
 * ============================================================
 * SCHEMA — LANÇAMENTOS
 * Painel Frota
 * Arquivo: js/schemas/lancamentos.js
 *
 * Responsabilidade:
 * - Definir os campos da tabela LANÇAMENTOS
 * - Definir labels
 * - Definir tipos
 * - Definir campos visíveis na tabela
 * - Definir campos editáveis
 * - Definir campos obrigatórios
 * - Definir opções dos campos SELECT
 *
 * Não possui:
 * - CRUD
 * - Supabase
 * - PostgreSQL
 * - HTML
 * - Eventos
 * ============================================================
 */

export const SCHEMA_LANCAMENTOS = {

    entity: "lancamentos",

    table: "lancamentos",

    title: "Lançamentos",

    fields: [

        // ========================================================
        // IDENTIFICAÇÃO
        // ========================================================

        {
            name: "empregado_matricula",
            label: "Empregado / Matrícula",
            type: "hidden",
            visible: false,
            hidden: true,
            required: false
        },        

        {
            name: "veiculo",
            label: "Veículo / Modelo",
            type: "hidden",
            visible: false,
            hidden: true,
            required: false
        },

        // ========================================================
        // DATA
        // ========================================================

        {
            name: "data",
            label: "Data",
            type: "date",
            required: true,
            visible: true,
            defaultValue: () =>
                new Date().toISOString().slice(0, 10),
            defaultNow: true
        },

        // ========================================================
        // HORA
        // ========================================================

        {
            name: "hora",
            label: "Hora",
            type: "time",
            required: true,
            visible: true,
            defaultNow: true,            
        },

        // ========================================================
        // EMPREGADO / MATRÍCULA
        // ========================================================

        {
            name: "id_empregado",
            label: "Empregado / Matrícula",
            type: "select",
            required: true,
            visible: true,

            source: "empregados",
            valueField: "id",
            labelFields: ["empregado", "matricula"],
            separator: " / ",

           
            snapshotField: "empregado_matricula"           
            
        },

        // ========================================================
        // VEÍCULO
        // ========================================================

        {
            name: "id_veiculo",
            label: "Veículo / Modelo",
            type: "select",
            required: true,
            visible: true,

            source: "veiculos",
            valueField: "id",
            labelFields: ["placa", "modelo"],
            separator: " - ",

           
            snapshotField: "veiculo"
            
        },

        // ========================================================
        // PASSAGEIRO / SETOR / MOTIVO
        // ========================================================

        {
            name: "passageiro_setor_motivo",
            label: "Passageiro / Setor / Motivo",
            type: "text",
            required: true,
            visible: true
        },

        // ========================================================
        // ITINERÁRIO
        // ========================================================

        {
            name: "itinerario",
            label: "Itinerário",
            type: "text",
            required: true,
            visible: true
        },

        // ========================================================
        // CHECKLIST
        // ========================================================

        {
            name: "checklist",
            label: "Checklist",
            type: "text",
            required: false,
            visible: false,
            hidden: true,
            readonly: true
        },

        // ========================================================
        // AVALIAÇÃO VISUAL
        // ========================================================

        {
            name: "avaliacao_visual",
            label: "Avaliação Visual",
            type: "select",
            required: false,
            visible: false,
            options: [
                "COM AVARIAS",
                "SEM AVARIAS"
            ]
        },

        // ========================================================
        // AVARIAS REGISTRADAS
        // ========================================================

        {
            name: "avarias_registradas",
            label: "Avarias Registradas",
            type: "textarea",
            required: false,
            visible: false
        },

        // ========================================================
        // HORÁRIO INICIAL
        // ========================================================

        {
            name: "horario_inicial",
            label: "Horário Inicial",
            type: "time",
            required: false,
            visible: true
        },

        // ========================================================
        // KM INICIAL
        // ========================================================

        {
            name: "km_inicial",
            label: "Km Inicial",
            type: "number",
            required: false,
            visible: true,
            min: 0,
            step: 0.01
        },

        // ========================================================
        // KM FINAL
        // ========================================================

        {
            name: "km_final",
            label: "Km Final",
            type: "number",
            required: false,
            visible: true,
            min: 0,
            step: 0.01
        },

        // ========================================================
        // HORÁRIO FINAL
        // ========================================================

        {
            name: "horario_final",
            label: "Horário Final",
            type: "time",
            required: false,
            visible: true
        },

        // ========================================================
        // COMBUSTÍVEL
        // ========================================================

        {
            name: "combustivel",
            label: "Combustível",
            type: "select",
            required: false,
            visible: false,
            options: [
                "RESERVA",
                "1/4",
                "1/2",
                "3/4",
                "CHEIO"
            ]
        },

        // ========================================================
        // MÉDIA DE CONSUMO DE COMBUSTÍVEL
        // ========================================================

        {
            name: "media_consumo_combustivel",
            label: "Média de consumo de combustível",
            type: "number",
            required: false,
            visible: false,
            min: 0,
            step: 0.01
        },

        // ========================================================
        // DISTÂNCIA PERCORRIDA
        // ========================================================

        {
            name: "distancia_percorrida",
            label: "Distância Percorrida",
            type: "number",
            required: false,
            visible: false,
            readonly: true,
            min: 0,
            step: 0.01
        },

        // ========================================================
        // DURAÇÃO ATENDIMENTO
        // ========================================================

        {
            name: "duracao_atendimento",
            label: "Duração Atendimento / HH:MM",
            type: "time",
            required: false,
            visible: false,
            readonly: true
        ,
            visible: false
        },

        // ========================================================
        // LAVA-CAR
        // ========================================================

        {
            name: "lava_car",
            label: "Lava-Car",
            type: "text",
            required: false,
            visible: false,
            hidden: true,
            readonly: true,
        },

        // ========================================================
        // VALOR HIGIENIZAÇÃO
        // ========================================================

        {
            name: "valor_higienizacao",
            label: "Valor Higienização",
            type: "number",
            required: false,
            visible: false,
            min: 0,
            step: 0.01
        },

        // ========================================================
        // NOTAS DE ABASTECIMENTO
        // ========================================================

        {
            name: "notas_abastecimento",
            label: "Valor da Nota de Abastecimento",
            type: "number",
            required: false,
            visible: false,
            hidden: true,
            readonly: true,
            min: 0,
            step: 0.01
        },

        // ========================================================
        // NOTAS DE MANUTENÇÃO
        // ========================================================

        {
            name: "notas_manutencao",
            label: "Notas de Manutenção",
            type: "textarea",
            required: false,
            visible: false
        },

        // ========================================================
        // STATUS
        // ========================================================

        {
            name: "status",
            label: "Status",
            type: "select",
            required: false,
            visible: false,
            options: [
                "EM ANDAMENTO",
                "CONCLUÍDO",
                "CANCELADO"
            ]
        },

        // ========================================================
        // HORAS EXTRAS
        // ========================================================

        {
            name: "horas_extras",
            label: "Horas Extras",
            type: "time",
            required: false,
            visible: false
        },

        // ========================================================
        // REVISÃO
        // ========================================================

        {
            name: "revisao",
            label: "Revisão",
            type: "text",
            required: false,
            visible: false
        },

        // ========================================================
        // USUÁRIO
        // ========================================================

        {
            name: "usuario",
            label: "Usuário",
            type: "text",
            required: false,
            visible: false,
            hidden: true,
            readonly: true
        },

        // ========================================================
        // CLASSIFICAÇÃO
        // ========================================================

        {
            name: "classificacao",
            label: "Classificação",
            type: "select",
            required: false,
            visible: false,
            hidden: true,
            readonly: true,
        },

        // ========================================================
        // LOCALIZAÇÃO
        // ========================================================

        {
            name: "localizacao",
            label: "Localização",
            type: "text",
            required: false,
            visible: false
        },

        // ========================================================
        // LOCALIZAÇÃO FINAL
        // ========================================================

        {
            name: "localizacao_final",
            label: "Localização Final",
            type: "text",
            required: false,
            visible: false
        },

        // ========================================================
        // CRIADO EM
        // ========================================================

        {
            name: "criado_em",
            label: "Criado em",
            type: "datetime-local",
            required: false,
            visible: false,
            hidden: true,
            readonly: true
        },

        // ========================================================
        // ATUALIZADO EM
        // ========================================================

        {
            name: "atualizado_em",
            label: "Atualizado em",
            type: "datetime-local",
            required: false,
            visible: false,
            hidden: true,
            readonly: true
        }

    ]
};

// ============================================================
// EXPORTS
// ============================================================



export default SCHEMA_LANCAMENTOS;
