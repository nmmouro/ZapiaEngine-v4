/**
 * ============================================================
 * SCHEMA — EMPREGADOS
 * Painel Frota
 * Arquivo: js/schemas/empregados.js
 *
 * Responsabilidade:
 *
 * - Definir os campos da tabela EMPREGADOS
 * - Definir labels
 * - Definir tipos
 * - Definir campos visíveis na tabela
 * - Definir campos editáveis
 * - Definir campos obrigatórios
 * - Definir opções dos campos SELECT
 *
 * Não possui:
 *
 * - CRUD
 * - Supabase
 * - PostgreSQL
 * - HTML
 * - Eventos
 *
 * ============================================================
 */

// ============================================================
// SCHEMA EMPREGADOS
// ============================================================

export const SCHEMA_EMPREGADOS = {

entity:
        "empregados",


    table:
        "empregados",


    title:
        "Cadastro de Empregados",


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
        // DATA DE CADASTRO
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
        // FOTO
        // ----------------------------------------------------

        {
            name:
                "foto",

            label:
                "Foto",

            type:
                "file",

            accept:
                "image/jpeg,image/png,image/webp",

            maxSizeMB:
                5,

            storageFolder:
                "foto",

            storageBucket:
                "veiculos",

            required:
                false,

            visible:
                true
        },



        // ----------------------------------------------------
        // NOME
        // ----------------------------------------------------

        {
            name:
                "empregado",

            label:
                "Empregado",

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
        // MATRÍCULA
        // ----------------------------------------------------

        {
            name:
                "matricula",

            label:
                "Matrícula",

            type:
                "text",

            required:
                true,

            visible:
                true
        },


        // ----------------------------------------------------
        // DIRETORIA
        // ----------------------------------------------------

        {
            name:
                "diretoria",

            label:
                "Diretoria",

            type:
                "text",

            required:
                true,

            visible:
                true
        },


        // ----------------------------------------------------
        // SETOR
        // ----------------------------------------------------

        {
            name:
                "setor",

            label:
                "Setor",

            type:
                "text",

            required:
                true,

            visible:
                true
        },


        // ----------------------------------------------------
        // TELEFONE
        // ----------------------------------------------------

        {
            name:
                "telefone",

            label:
                "Telefone",

            type:
                "text",

            required:
                true,

            visible:
                true
        },


         // ----------------------------------------------------
        // E-MAIL
        // ----------------------------------------------------

        {
            name:
                "email",

            label:
                "E-mail",

            type:
                "text",

            required:
                false,

            uppercase:
                false,

            visible:
                true
        },

         // ----------------------------------------------------
        // CLASSIFICAÇÃO
        // ----------------------------------------------------

        {
            name:
                "classificacao",

            label:
                "Classificação",

            type:
                "select",

            required:
                true,

            visible:
                true,

            options: [

                {
                    value:
                        "ADMIN",

                    label:
                        "ADMIN"
                },

                {
                    value:
                        "SUOERVISOR",

                    label:
                        "SUPERVISOR"
                },

                {
                    value:
                        "MOTORISTA",

                    label:
                        "MOTORISTA"
                },

                {
                    value:
                        "USUÁRIO",

                    label:
                        "USUÁRIO"
                },
                
            ]
        },


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
                        "ATIVO",

                    label:
                        "ATIVO"
                },
                
                {
                    value:
                        "INATIVO",

                    label:
                        "INATIVO"
                },

                {
                    value:
                        "FÉRIAS",

                    label:
                        "FÉRIAS"
                },


                {
                    value:
                        "VIAGEM",

                    label:
                        "VIAGEM"
                },
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

        
export default SCHEMA_EMPREGADOS;
