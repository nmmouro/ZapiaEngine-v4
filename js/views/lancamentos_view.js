import { SCHEMA_LANCAMENTOS } from "../schemas/lancamentos.js";

import {
    carregarRegistro,
    carregarRelacionados,
    iniciarViewBase,
    renderizarCampos,
    renderizarLista,
    escapar
} from "./viewService.js";


export async function iniciar() {

    const id = new URLSearchParams(location.search).get("id");

    const content = iniciarViewBase({
        titulo: "Ocorrência / Lançamento",
        subtitulo: id || ""
    });

    try {

        // ============================================================
        // CARREGAR LANÇAMENTO
        // ============================================================

        const r = await carregarRegistro(
            "lancamentos",
            id
        );

        if (!r) {
            throw new Error("Lançamento não encontrado.");
        }


        // ============================================================
        // CARREGAR DADOS RELACIONADOS
        // ============================================================

        const [
            aba,
            ava,
            man,
            lava,
            che
        ] = await Promise.all([

            carregarRelacionados(
                "abastecimento",
                "id_lancamento",
                r.id
            ),

            carregarRelacionados(
                "avarias",
                "id_lancamento",
                r.id
            ),

            carregarRelacionados(
                "manutencao",
                "id_lancamento",
                r.id
            ),

            carregarRelacionados(
                "lava_car",
                "id_lancamento",
                r.id
            ),

            carregarRelacionados(
                "checklist",
                "id_lancamento",
                r.id
            )

        ]);


        // ============================================================
        // MONTAR VISUALIZAÇÃO
        // ============================================================

        content.innerHTML = `

            <!-- ======================================================
                 RESUMO DA OCORRÊNCIA
            ======================================================= -->

            <section class="view-section">

                <h2>
                    Resumo da ocorrência
                </h2>

                <div class="view-cards">

                    <div class="view-card">

                        <strong>
                            ${escapar(r.status || "—")}
                        </strong>

                        <span>
                            Status
                        </span>

                    </div>


                    <div class="view-card">

                        <strong>
                            ${escapar(
                                r.veiculo ?? "—"
                            )}
                        </strong>

                        <span>
                            Veículo
                        </span>

                    </div>


                    <div class="view-card">

                        <strong>
                            ${escapar(
                                r.empregado_matricula ?? "—"
                            )}
                        </strong>

                        <span>
                            Empregado / Matrícula
                        </span>

                    </div>

                </div>

            </section>


            <!-- ======================================================
                 TODOS OS DADOS DO LANÇAMENTO
            ======================================================= -->

            <section class="view-section">

                <h2>
                    Todos os dados registrados
                </h2>

                ${renderizarCampos(
                    r,
                    SCHEMA_LANCAMENTOS,
                    {
                        excluir: [
                            "id",
                            "id_empregado",
                            "id_veiculo",
                            "empregado_matricula",                      
                            "veiculo",
                            "hora",
                            "notas_abastecimento",
                            "creatd_at",
                            "updated_at"
                        ]
                    }
                )}

            </section>


            <!-- ======================================================
                 ABASTECIMENTOS
            ======================================================= -->

            ${renderizarLista(
                "Abastecimentos",
                aba,
                null,
                [
                    "id",
                    "data",
                    "hora",
                    "veiculo",
                    "odometro",
                    "tipo_combustivel",
                    "qtde_l",
                    "valor_total_nota"
                ]
            )}


            <!-- ======================================================
                 AVARIAS
            ======================================================= -->

            ${renderizarLista(
                "Avarias",
                ava,
                null,
                [
                    "id",
                    "data",
                    "hora",
                    "relato_avaria",
                    "avarias_registradas"
                ]
            )}


            <!-- ======================================================
                 MANUTENÇÃO
            ======================================================= -->

            ${renderizarLista(
                "Manutenção",
                man,
                null,
                [
                    "id",
                    "data",
                    "hora",
                    "odometro",
                    "descricao_manutencao",
                    "valor_total_nota"
                ]
            )}


            <!-- ======================================================
                 LAVA-CAR
            ======================================================= -->

            ${renderizarLista(
                "Lava-Car",
                lava,
                null,
                [
                    "id",
                    "data",
                    "hora",
                    "opcao",
                    "valor"
                ]
            )}


            <!-- ======================================================
                 CHECKLIST
            ======================================================= -->

            ${renderizarLista(
                "Checklist",
                che,
                null,
                [
                    "id",
                    "data",
                    "hora",
                    "oleo_motor",
                    "agua_radiador",
                    "pneus",
                    "freios",
                    "observacoes"
                ]
            )}

        `;


    } catch (e) {

        content.innerHTML = `

            <section class="view-section">

                <div class="view-empty">

                    ${escapar(e.message)}

                </div>

            </section>

        `;

    }

}
