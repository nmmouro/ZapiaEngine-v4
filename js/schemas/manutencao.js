/**
 * SCHEMA — MANUTENÇÃO
 * Registro de manutenção vinculado a uma ocorrência.
 */

const SCHEMA_MANUTENCAO = {
    entity: "manutencao",
    table: "manutencao",
    title: "Manutenção",
    fields: [
        { name: "id", hidden: true },
        { name: "id_lancamento", hidden: true },
        { name: "data", label: "Data", type: "date", required: true, readonly: true },
        { name: "hora", label: "Hora", type: "time", required: true, readonly: true },
        { name: "empregado_matricula", label: "Empregado / Matrícula", type: "text", readonly: true },
        { name: "veiculo", label: "Veículo / Modelo", type: "text", readonly: true },
        { name: "odometro", label: "Odômetro", type: "number", required: true, min: 0, step: "0.1" },
        { name: "usuario", label: "Usuário", type: "text", readonly: true },
        { name: "imagem", label: "Imagem / Nota da Manutenção", type: "file", accept: "image/*", capture: "environment" },
        { name: "observacoes", label: "Observações", type: "textarea" },
        { name: "descricao_manutencao", label: "Descrição da Manutenção", type: "textarea", required: true },
        { name: "valor_total_nota", label: "Valor Total da Nota (R$)", type: "number", required: true, min: 0, step: "0.01" },
        { name: "localizacao", label: "Localização GPS", type: "text", readonly: true }
    ]
};

export { SCHEMA_MANUTENCAO };
export default SCHEMA_MANUTENCAO;
