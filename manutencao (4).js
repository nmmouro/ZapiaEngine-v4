export const ROUTER_MANUTENCAO = {
    entity: "manutencao",
    table: "manutencao",
    primaryKey: "id",
    endpoint: "manutencao",
    prefixo: "MAN",
    operations: { listar: true, obter: true, criar: true, atualizar: true, excluir: true },
    options: { permitirNovo: true, permitirEditar: true, permitirExcluir: true, pageSize: 10 }
};

export default ROUTER_MANUTENCAO;
