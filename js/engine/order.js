/**
 * Ordenação global do Engine.
 *
 * Regras declaradas pelo schema:
 * orderBy: [
 *   { field: "id", direction: "desc" },
 *   { field: "horario_inicial", direction: "desc" }
 * ]
 */

function valorComparavel(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).trim();
}

function compararValores(a, b) {
    const sa = valorComparavel(a);
    const sb = valorComparavel(b);
    if (sa === sb) return 0;
    if (!sa) return -1;
    if (!sb) return 1;

    if (/^-?\d+$/.test(sa) && /^-?\d+$/.test(sb)) {
        try {
            const na = BigInt(sa);
            const nb = BigInt(sb);
            return na < nb ? -1 : 1;
        } catch (_) {}
    }

    if (/^-?\d+(\.\d+)?$/.test(sa) && /^-?\d+(\.\d+)?$/.test(sb)) {
        const na = Number(sa);
        const nb = Number(sb);
        if (Number.isFinite(na) && Number.isFinite(nb)) {
            return na < nb ? -1 : 1;
        }
    }

    return sa.localeCompare(sb, "pt-BR", {
        numeric: true,
        sensitivity: "base"
    });
}

export function normalizarOrderBy(orderBy) {
    if (!Array.isArray(orderBy)) return [];

    return orderBy
        .map(regra => {
            if (typeof regra === "string") {
                return { field: regra, direction: "asc" };
            }

            const field = String(
                regra?.field ?? regra?.campo ?? regra?.name ?? ""
            ).trim();

            if (!field) return null;

            const direction = String(
                regra?.direction ?? regra?.direcao ?? regra?.order ?? "asc"
            ).toLowerCase() === "desc" ? "desc" : "asc";

            return { field, direction };
        })
        .filter(Boolean);
}

export function ordenarRegistros(registros, orderBy = []) {
    const regras = normalizarOrderBy(orderBy);
    const origem = Array.isArray(registros) ? registros : [];

    if (!regras.length) return [...origem];

    return [...origem].sort((a, b) => {
        for (const regra of regras) {
            const resultado = compararValores(
                a?.[regra.field],
                b?.[regra.field]
            );

            if (resultado !== 0) {
                return regra.direction === "desc"
                    ? -resultado
                    : resultado;
            }
        }

        return 0;
    });
}

export default ordenarRegistros;
