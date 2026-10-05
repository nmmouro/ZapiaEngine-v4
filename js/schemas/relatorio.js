/**
 * SCHEMA — RELATÓRIO DE OCORRÊNCIAS
 * Ordenação declarativa consumida pelo Engine.
 */

const SCHEMA_RELATORIO_OCORRENCIAS = {
    entity: "relatorio_ocorrencias",
    orderBy: [
        { field: "data", direction: "desc" },
        { field: "id", direction: "desc" },
        { field: "hora", direction: "desc" }
    ]
};

export { SCHEMA_RELATORIO_OCORRENCIAS };
export default SCHEMA_RELATORIO_OCORRENCIAS;
