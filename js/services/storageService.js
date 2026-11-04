import CONFIG from "../config/config.js";

const BUCKET_PADRAO = "veiculos";

function baseUrl() {
    const url = String(CONFIG?.api?.url || "").replace(/\/rest\/v1\/?$/, "");
    if (!url) throw new Error("CONFIG.api.url não configurada.");
    return url;
}

function headers(extra = {}) {
    const key = CONFIG?.api?.key;
    if (!key) throw new Error("CONFIG.api.key não configurada.");
    return {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...extra
    };
}

function safe(v) {
    return String(v || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 100) || "arquivo";
}

function ext(file) {
    const n = String(file?.name || "");
    const i = n.lastIndexOf(".");
    return i >= 0 ? n.slice(i + 1).toLowerCase() : "";
}

function rules(accept = "") {
    return String(accept)
        .split(",")
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);
}

function accepted(file, accept = "") {
    const rs = rules(accept);
    if (!rs.length) return true;

    const type = String(file?.type || "").toLowerCase();
    const e = ext(file);

    return rs.some(r =>
        r.startsWith(".")
            ? e === r.slice(1)
            : r.endsWith("/*")
                ? type.startsWith(r.slice(0, -1))
                : type === r
    );
}

export function validarArquivo(
    file,
    { accept = "", maxSizeMB = 10, label = "Arquivo" } = {}
) {
    if (!file) return { valido: true };

    if (!accepted(file, accept)) {
        return {
            valido: false,
            mensagem: `${label}: tipo de arquivo não permitido.`
        };
    }

    if (
        Number(maxSizeMB) > 0 &&
        file.size > Number(maxSizeMB) * 1024 * 1024
    ) {
        return {
            valido: false,
            mensagem: `${label}: o arquivo excede o limite de ${maxSizeMB} MB.`
        };
    }

    return { valido: true };
}

function filename(file) {
    const d = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace("T", "_")
        .replace(/\.\d+Z$/, "");

    const e = ext(file);

    return `${d}_${Math.random().toString(36).slice(2, 9)}${e ? `.${e}` : ""}`;
}

/**
 * Caminho genérico:
 *
 * entidade/ID/campo/arquivo
 *
 * Exemplos:
 * veiculos/VEI000001/foto/...
 * empregados/EMP000001/foto/...
 * abastecimento/ABA000001/imagem/...
 * avarias/AVA000001/vista_frontal/...
 * manutencao/MAN000001/imagem/...
 *
 * Mantém compatibilidade com o caminho legado de veículos:
 * VEI000001/foto/...
 */
export function montarCaminhoAnexo(
    entidade,
    idRegistro,
    campo,
    file
) {
    if (!idRegistro) {
        throw new Error("ID do registro não informado.");
    }

    const entity = safe(entidade || "anexos");
    const id = safe(idRegistro);
    const field = safe(campo);

    return `${entity}/${id}/${field}/${filename(file)}`;
}

// Compatibilidade com a versão anterior.
export function montarCaminhoVeiculo(idVeiculo, campo, file) {
    if (!idVeiculo) {
        throw new Error("ID do veículo não informado.");
    }

    return `${safe(idVeiculo)}/${safe(campo)}/${filename(file)}`;
}

export async function uploadArquivo(
    file,
    {
        entidade = "veiculos",
        entity,
        idRegistro,
        idVeiculo,
        campo,
        accept = "",
        maxSizeMB = 10,
        label = "Arquivo",
        bucket = BUCKET_PADRAO
    } = {}
) {
    const v = validarArquivo(file, {
        accept,
        maxSizeMB,
        label
    });

    if (!v.valido) {
        throw new Error(v.mensagem);
    }

    if (!file) return null;

    const id = idRegistro || idVeiculo;

    if (!id) {
        throw new Error(`ID não informado para o anexo "${label}".`);
    }

    const caminho = entity || entidade || "anexos";

    const path =
        (caminho === "veiculos" && idVeiculo && !idRegistro && !entity)
            ? montarCaminhoVeiculo(id, campo, file)
            : montarCaminhoAnexo(caminho, id, campo, file);

    const r = await fetch(
        `${baseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`,
        {
            method: "POST",
            headers: headers({
                "Content-Type": file.type || "application/octet-stream",
                "x-upsert": "false"
            }),
            body: file
        }
    );

    if (!r.ok) {
        let msg = "";
        try {
            const b = await r.json();
            msg = b?.message || b?.error || "";
        } catch (_) {}

        throw new Error(
            `Falha ao enviar ${label}${msg ? `: ${msg}` : "."}`
        );
    }

    return {
        bucket,
        path,
        url: `${baseUrl()}/storage/v1/object/public/${bucket}/${path}`,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        entidade: caminho,
        id: id,
        campo
    };
}

export function extrairPath(
    ref,
    bucket = BUCKET_PADRAO
) {
    if (!ref) return "";

    const s = String(ref);

    const marker =
        `/storage/v1/object/public/${bucket}/`;

    const i = s.indexOf(marker);

    return i >= 0
        ? decodeURIComponent(s.slice(i + marker.length))
        : (/^https?:\/\//i.test(s) ? "" : s.replace(/^\/+/, ""));
}

export async function excluirArquivo(
    ref,
    bucket = BUCKET_PADRAO
) {
    const path = extrairPath(ref, bucket);

    if (!path) return true;

    const r = await fetch(
        `${baseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}`,
        {
            method: "DELETE",
            headers: headers({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify([path])
        }
    );

    return r.ok;
}

export default {
    validarArquivo,
    uploadArquivo,
    excluirArquivo,
    extrairPath,
    montarCaminhoAnexo,
    montarCaminhoVeiculo
};
