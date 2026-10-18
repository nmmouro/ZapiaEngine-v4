/**
 * ============================================================
 * CONFIG
 * Painel Frota
 *
 * Arquivo:
 * js/config/config.js
 *
 * Configurações globais da aplicação.
 *
 * ============================================================
 */


// ============================================================
// CONFIGURAÇÃO PRINCIPAL
// ============================================================

const CONFIG = {

    // ========================================================
    // API
    // ========================================================

    api: {

        // Frontend GitHub Pages acessa o Supabase diretamente.
        // Preencha com a URL real do projeto e a chave publishable/anon PUBLICA.
        // NUNCA use service_role / sb_secret no navegador.
        url: `${String(window.PAINEL_FROTA_SUPABASE_URL || "https://iomekawabacmuhlltket.supabase.co").replace(/\/+$/, "")}/rest/v1`,
        authUrl: `${String(window.PAINEL_FROTA_SUPABASE_URL || "https://iomekawabacmuhlltket.supabase.co").replace(/\/+$/, "")}/auth/v1`,
        key: String(window.PAINEL_FROTA_SUPABASE_ANON_KEY || "sb_secret_uLIM_l_OOQ21LvFNsohW_w__w-43AhA"),


        /*
         * Nome do schema PostgreSQL.
         */

        schema:
            "public",


        /*
         * Tempo máximo da requisição.
         */

        timeout:
            15000

    },


    // ========================================================
    // ENGINE
    // ========================================================

    engine: {

        autoRefresh:
            false,

        pageSize:
            10,

        cache:
            false

    },


    // ========================================================
    // UI
    // ========================================================

    ui: {

        animation:
            true,

        locale:
            "pt-BR"

    }

};


// ============================================================
// EXPORT NOMEADO
// ============================================================

export {
    CONFIG
};


// ============================================================
// EXPORT DEFAULT
// ============================================================

export default CONFIG;
