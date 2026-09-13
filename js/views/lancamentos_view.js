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

        const r = await carregarRegistro(
            "lancamentos",
            id
        );

        if (!r) {
            throw new Error(
                "Lançamento não encontrado."
            );
        }


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


        content.innerHTML = `

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


            <section class="view-section">

                <h2>
                    Todos os dados registrados
                </h2>

                ${
                    renderizarCampos(
                        r,
                        SCHEMA_LANCAMENTOS,
                        {
                            excluir: [
                                "id",
                                "hora",
                                "id_empregado",
                                "id_veiculo",
                                "empregado_matricula",
                                "veiculo",
                                
                                "criado_em",
                                "atualizado_em"
                            ]
                        }
                    )
                }

            </section>


            ${
                renderizarLista(
                    "Abastecimentos",
                    aba,
                    null,
                    [
                        
                        "data",
                        "hora",
                        "veiculo",
                        "odometro",
                        "tipo_combustivel",
                        "qtde_l",
                        "valor_total_nota"
                    ]
                )
            }


            ${
                renderizarLista(
                    "Avarias",
                    ava,
                    null,
                    [
                        
                        "data",
                        "hora",
                        "relato_avaria",
                        "avarias_registradas"
                    ]
                )
            }


            ${
                renderizarLista(
                    "Manutenção",
                    man,
                    null,
                    [
                        
                        "data",
                        "hora",
                        "odometro",
                        "descricao_manutencao",
                        "valor_total_nota"
                    ]
                )
            }


            ${
                renderizarLista(
                    "Lava-Car",
                    lava,
                    null,
                    [
                        
                        "data",
                        "hora",
                        "opcao",
                        "valor"
                    ]
                )
            }


            ${
                renderizarLista(
                    "Checklist",
                    che,
                    null,
                    [
                        
                        "data",
                        "hora",
                        "oleo_motor",
                        "agua_radiador",
                        "pneus",
                        "freios",
                        "observacoes"
                    ]
                )
            }

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
