/**
 * ============================================================
 * HEADER
 * Painel Frota
 *
 * Arquivo:
 *     js/components/header.js
 *
 * Responsabilidades:
 *
 * - Criar/controlar o Header
 * - Exibir logo
 * - Exibir título da página
 * - Exibir data no formato brasileiro
 * - Exibir hora HH:mm
 * - Atualizar relógio automaticamente
 * - Controlar Tela Cheia
 *
 * Não depende de:
 *
 * - Engine
 * - CRUD
 * - Supabase
 * - página específica
 *
 * ============================================================
 */


/* ============================================================
   TELA CHEIA
============================================================ */

function iniciarTelaCheia(
    header
) {

    const botao =
        header.querySelector(
            "[data-header-fullscreen]"
        );


    if (!botao) {

        return;

    }


    /*
     * Evita registrar
     * o evento duas vezes.
     */

    if (
        botao.dataset.fullscreenEvento ===
        "true"
    ) {

        return;

    }


    botao.addEventListener(
        "click",
        alternarTelaCheia
    );


    botao.dataset.fullscreenEvento =
        "true";


    document.addEventListener(
        "fullscreenchange",
        atualizarBotaoTelaCheia
    );


    atualizarBotaoTelaCheia();

}


/* ============================================================
   ALTERNAR TELA CHEIA
============================================================ */

async function alternarTelaCheia() {

    try {

        if (
            !document.fullscreenElement
        ) {

            await document.documentElement
                .requestFullscreen();

        }

        else {

            await document.exitFullscreen();

        }

    }

    catch (erro) {

        console.error(
            "HEADER → ERRO TELA CHEIA:",
            erro
        );

    }

}


/* ============================================================
   ATUALIZAR BOTÃO TELA CHEIA
============================================================ */

function atualizarBotaoTelaCheia() {

    const botao =
        document.querySelector(
            "[data-header-fullscreen]"
        );


    const icone =
        document.querySelector(
            "[data-header-fullscreen-icon]"
        );


    const texto =
        document.querySelector(
            ".header-fullscreen-text"
        );


    if (!botao) {

        return;

    }


    const telaCheia =
        Boolean(
            document.fullscreenElement
        );


    if (telaCheia) {

        botao.title =
            "Sair da Tela Cheia";

        botao.setAttribute(
            "aria-label",
            "Sair da Tela Cheia"
        );


        if (icone) {

            icone.textContent =
                "⛶";

        }


        if (texto) {

            texto.textContent =
                "Sair";

        }

    }

    else {

        botao.title =
            "Tela Cheia";

        botao.setAttribute(
            "aria-label",
            "Tela Cheia"
        );


        if (icone) {

            icone.textContent =
                "⛶";

        }


        if (texto) {

            texto.textContent =
                "Tela Cheia";

        }

    }

}


/* ============================================================
   ATUALIZAR TÍTULO MANUALMENTE
============================================================ */

export function definirTituloHeader(
    titulo
) {

    const elemento =
        document.querySelector(
            "[data-header-titulo]"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        titulo || "Painel Frota";

}


/* ============================================================
   ESCAPAR HTML
============================================================ */

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* ============================================================
   ESCAPAR ATRIBUTO
============================================================ */

function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );

}


/* ============================================================
   EXPORT DEFAULT
============================================================ */

export default {

    iniciarHeader,

    definirTituloHeader

};
