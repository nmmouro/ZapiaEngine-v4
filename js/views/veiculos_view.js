import { SCHEMA_VEICULOS } from "../schemas/veiculos.js";

import {
    carregarRegistro,
    carregarRelacionados,
    iniciarViewBase,
    renderizarCampos,
    renderizarAnexo,
    renderizarLista,
    escapar,
    calcularAlertaRevisao
} from "./viewService.js";


export async function iniciar() {

    const id = new URLSearchParams(location.search).get("id");

    const content = iniciarViewBase({
        titulo: "Veículo",
        subtitulo: id || ""
    });


    try {

        // ============================================================
        // CARREGAR VEÍCULO
        // ============================================================

        const r = await carregarRegistro(
            "veiculos",
            id
        );

        if (!r) {
            throw new Error("Veículo não encontrado.");
        }


        // ============================================================
        // ALERTA DE REVISÃO
        // ============================================================

        const alerta = calcularAlertaRevisao(r);


        // ============================================================
        // FOTO PRINCIPAL
        // ============================================================

        const img = r.foto
            ? renderizarAnexo(
                r.foto,
                "Foto do veículo"
            )
            : "";


        // ============================================================
        // REGISTROS RELACIONADOS
        // ============================================================

        const lanc = await carregarRelacionados(
            "lancamentos",
            "id_veiculo",
            r.id
        );

        const aba = await carregarRelacionados(
            "abastecimento",
            "veiculo",
            r.placa
        );


        // ============================================================
        // MONTAR VISUALIZAÇÃO
        // ============================================================

        content.innerHTML = `

            <!-- ======================================================
                 CABEÇALHO / HERO DO VEÍCULO
            ======================================================= -->

            <div class="view-hero">

                <div class="view-hero-media">

                    ${
                        img ||
                        '<div class="view-placeholder">Sem foto cadastrada</div>'
                    }

                </div>


                <section class="view-section">

                    <h2>
                        ${escapar(r.placa || r.id)}
                    </h2>


                    <!-- ==================================================
                         STATUS E ALERTA
                    =================================================== -->

                    <div class="view-alerts">

                        <span class="view-status ${alerta.classe}">
                            Revisão: ${escapar(alerta.texto)}
                        </span>


                        ${
                            r.status
                                ? `
                                    <span class="view-status neutral">
                                        Status: ${escapar(r.status)}
                                    </span>
                                `
                                : ""
                        }

                    </div>


                    <!-- ==================================================
                         DADOS DO VEÍCULO
                    =================================================== -->

                    ${renderizarCampos(
                        r,
                        SCHEMA_VEICULOS,
                        {
                            excluir: [
                                "id",
                                "foto",
                                "criado_em",
                                "atualizado_em",
                                "alerta_revisao"
                            ]
                        }
                    )}

                </section>

            </div>


            <!-- ======================================================
                 ANEXOS
            ======================================================= -->

            <section class="view-section">

                <h2>
                    Anexos
                </h2>


                <div class="view-attachments">

                    ${
                        [
                            r.foto,
                            r.crlv,
                            r.tag_foto,
                            r.foto_neo,
                            r.pontos_abastecimento,
                            r.manual_digital
                        ]
                            .map(
                                (u, i) =>
                                    u
                                        ? renderizarAnexo(
                                            u,
                                            [
                                                "Foto",
                                                "CRLV",
                                                "Foto da TAG",
                                                "Foto NEO",
                                                "Pontos de abastecimento",
                                                "Manual digital"
                                            ][i]
                                        )
                                        : ""
                            )
                            .join("")
                        ||
                        '<div class="view-empty">Nenhum anexo.</div>'
                    }

                </div>

            </section>


            <!-- ======================================================
                 OCORRÊNCIAS DO VEÍCULO
            ======================================================= -->

            ${renderizarLista(
                "Ocorrências do veículo",
                lanc,
                null,
                [
                    "id",
                    "data",
                    "hora",
                    "passageiro_setor_motivo",
                    "itinerario",
                    "status"
                ]
            )}


            <!-- ======================================================
                 ABASTECIMENTOS RELACIONADOS
            ======================================================= -->

            ${renderizarLista(
                "Abastecimentos relacionados",
                aba,
                null,
                [
                    "id",
                    "data",
                    "hora",
                    "odometro",
                    "tipo_combustivel",
                    "qtde_l",
                    "valor_total_nota"
                ]
            )}

        `;


    } catch (e) {

        // ============================================================
        // TRATAMENTO DE ERRO
        // ============================================================

        content.innerHTML = `

            <section class="view-section">

                <div class="view-empty">

                    ${escapar(e.message)}

                </div>

            </section>

        `;

    }

}
