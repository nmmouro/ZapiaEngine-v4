/**
 * ============================================================
 * SCHEMA — VEÍCULOS
 * Painel Frota
 * Arquivo: js/schemas/veiculos.js
 * */


// ============================================================
// SCHEMA VEÍCULOS
// ============================================================

export const SCHEMA_VEICULOS = {

    // ========================================================
    // IDENTIFICAÇÃO
    // ========================================================

    entity:
        "veiculos",


    table:
        "veiculos",


    title:
        "Cadastro de Veículos",


    // ========================================================
    // CAMPOS
    // ========================================================

    fields: [

        // ----------------------------------------------------
        // ID
        // ----------------------------------------------------

        {
            name:
                "id",

            label:
                "ID",

            type:
                "text",

            visible:
                false,

            hidden:
                true,

            readonly:
                true,

            required:
                false
        },

        // ----------------------------------------------------
        // FOTO
        // ----------------------------------------------------

        arquivo('Foto', { name: 'foto', image: true }),


        // ----------------------------------------------------
        // DATA
        // ----------------------------------------------------

        {
            name:
                "data",

            label:
                "Data",

            type:
                "date",

            required:
                true,

            visible:
                true,

            readonly:
                false
        },      


        // ----------------------------------------------------
        // PLACA
        // ----------------------------------------------------

        {
            name:
                "placa",

            label:
                "Placa",

            type:
                "text",

            required:
                true,

            visible:
                true,

            maxlength:
                10
        },

        // ----------------------------------------------------
        // RENAVAM
        // ----------------------------------------------------

        {
            name:
                "renavam",

            label:
                "RENAVAM",

            type:
                "text",

            required:
                true,

            visible:
                true,

            maxlength:
                11
        },

        // ----------------------------------------------------
        // CHASSI
        // ----------------------------------------------------

        {
            name:
                "chassi",

            label:
                "Chassi",

            type:
                "text",

            required:
                true,

            visible:
                true,

            maxlength:
                17
        },


         // ----------------------------------------------------
        // PATRIMÔNIO
        // ----------------------------------------------------

        {
            name:
                "patrimonio",

            label:
                "Patrimônio",

            type:
                "number",

            required:
                true,

            visible:
                true


        // ----------------------------------------------------
        // ANO FABRICAÇÃO / MODELO
        // ----------------------------------------------------

        {
            name:
                "ano_fabricacao_modelo",

            label:
                "Ano Fabricação / Modelo",

            type:
                "text",

            required:
                true,

            visible:
                true
        },


        // ----------------------------------------------------
        // MARCA / Modelo / Versão
        // ----------------------------------------------------

        {
            name:
                "marca_modelo_verssao",

            label:
                "Marca / Modelo / Versão",

            type:
                "text",

            required:
                true,

            visible:
                true
        },


        // ----------------------------------------------------
        // COR PREDOMINANTE
        // ----------------------------------------------------

        {
            name:
                "cor_predominante",

            label:
                "Cor Predominante",

            type:
                "text",

            required:
                false,

            visible:
                true
        },


        // ----------------------------------------------------
        // COMBUSTÍVEL
        // ----------------------------------------------------

        {
            name:
                "combustivel",

            label:
                "Combustível",

            type:
                "select",

            required:
                true,

            visible:
                true,

            options: [

                {
                    value:
                        "gasolina",

                    label:
                        "Gasolina"
                },

                {
                    value:
                        "etanol",

                    label:
                        "Etanol"
                },

                {
                    value:
                        "flex",

                    label:
                        "Flex"
                },

                {
                    value:
                        "diesel",

                    label:
                        "Diesel"
                },

                {
                    value:
                        "eletrico",

                    label:
                        "Elétrico"
                }

            ]
        },


        // ----------------------------------------------------
        // ÚLTIMA REVISÃO
        // ----------------------------------------------------

        {
            name:
                "ultima_revisao",

            label:
                "Última Revisão",

            type:
                "date",

            required:
                true,

            visible:
                true,

            readonly:
                false
        },


        // ----------------------------------------------------
        // PRÓXIMA REVISÃO
        // ----------------------------------------------------

        {
            name:
                "proxima_revisao",

            label:
                "Próxima Revisão",

            type:
                "date",

            required:
                true,

            visible:
                true,

            readonly:
                false
        },


        // ----------------------------------------------------
        // KM ATUAL
        // ----------------------------------------------------

        {
            name:
                "km_atual",

            label:
                "Km Atual",

            type:
                "number",

            required:
                false,

            visible:
                true,

            readonly: true,
            
            auto: true
        },


        // ----------------------------------------------------
        // ALERTA REVISÃO
        // ----------------------------------------------------

        {
            name: 'alerta_revisao',
            
            label: 'Alerta de revisão',
            
            type: 'text',
            
            readonly: true,
            
            auto: true
        },


       // ----------------------------------------------------
        // CRLV
        // ----------------------------------------------------


        arquivo('CRLV', { name: 'crlv' }),


        // ----------------------------------------------------
        // TAG
        // ----------------------------------------------------

        {
            name: 'numero_tag',
            
            label: 'Número da TAG',
            
            type: 'text'
        },


        // ----------------------------------------------------
        // FOTO TAG
        // ----------------------------------------------------
        
            arquivo('Foto da TAG', { name: 'tag_foto', image: true }),

        // ----------------------------------------------------
        // CARTÃO NEO
        // ----------------------------------------------------
        
        {
            name: 'cartao_neo',
            
            label: 'Cartão NEO',
            
            type: 'text'
        },


        // ----------------------------------------------------
        // foto cartão neo
        // ----------------------------------------------------
    
            arquivo('Foto NEO', { name: 'foto_neo', image: true }),

        // ----------------------------------------------------
        // CÓDIGO NEO
        // ----------------------------------------------------
        
        {
            name: 'codigo_neo',
            
            label: 'Código NEO',
            
            type: 'text'
        },

        // ----------------------------------------------------
        // POSTOR CREDENCIADOS
        // ----------------------------------------------------
        
            arquivo('Pontos de abastecimento', { name: 'pontos_abastecimento' }),

        // ----------------------------------------------------
        // MANUAL DIGITAL
        // ----------------------------------------------------
        
            arquivo('Manual digital', { name: 'manual_digital' }),

        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        {
            name:
                "status",

            label:
                "Status",

            type:
                "select",

            required:
                true,

            visible:
                true,

            options: [

                {
                    value:
                        "ativo",

                    label:
                        "Ativo"
                },

                {
                    value:
                        "manutencao",

                    label:
                        "Manutenção"
                },

                {
                    value:
                        "inativo",

                    label:
                        "Inativo"
                }

            ]
        },


        // ----------------------------------------------------
        // CRIADO EM
        // ----------------------------------------------------

        {
            name:
                "criado_em",

            label:
                "Criado em",

            type:
                "datetime-local",

            required:
                false,

            visible:
                false,

            hidden:
                true,

            readonly:
                true
        },


        // ----------------------------------------------------
        // ATUALIZADO EM
        // ----------------------------------------------------

        {
            name:
                "atualizado_em",

            label:
                "Atualizado em",

            type:
                "datetime-local",

            required:
                false,

            visible:
                false,

            hidden:
                true,

            readonly:
                true
        }

    ]

};


// ============================================================
// EXPORT DEFAULT
// ============================================================

export default SCHEMA_VEICULOS;
