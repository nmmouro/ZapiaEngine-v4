-- PAINEL FROTA - MIGRAÇÃO DE VEÍCULOS
-- Migra a estrutura legada para a estrutura definitiva.
-- Faça backup antes de executar em produção.
--
-- Mapeamentos:
-- data_cadastro              -> data
-- marca + modelo             -> marca_modelo_versao
-- cor                        -> cor_predominante
-- ano                        -> ano_fabricacao_modelo
-- created_at                 -> criado_em
-- updated_at                 -> atualizado_em
-- km_atual                   -> km_atual
--
-- Combustível legado não é inventado.
-- Por isso a coluna combustivel não é preenchida automaticamente.

begin;

create table if not exists public.veiculos_novo (
    id text primary key,
    data date not null default current_date,
    foto text,
    placa text not null,
    renavam text,
    chassi text,
    patrimonio text,
    ano_fabricacao_modelo integer,
    marca_modelo_versao text,
    cor_predominante text,
    combustivel text not null,
    ultima_revisao date,
    proxima_revisao date,
    km_atual numeric not null default 0,
    alerta_revisao text,
    crlv text,
    numero_tag text,
    tag_foto text,
    cartao_neo text,
    foto_neo text,
    codigo_neo text,
    pontos_abastecimento text,
    manual_digital text,
    status text not null default 'ATIVO',
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

-- A migração abaixo exige que os registros tenham combustível válido.
-- Ajuste a origem do combustível se sua tabela legada possuir essa informação.
insert into public.veiculos_novo (
    id, data, foto, placa, renavam, chassi, patrimonio,
    ano_fabricacao_modelo, marca_modelo_versao, cor_predominante,
    combustivel, km_atual, status, criado_em, atualizado_em
)
select
    v.id,
    coalesce(v.data_cadastro, current_date),
    v.foto,
    v.placa,
    null,
    null,
    null,
    v.ano,
    nullif(trim(concat_ws(' ', v.marca, v.modelo)), ''),
    v.cor,
    v.combustivel,
    coalesce(v.km_atual, 0),
    case
        when v.status in ('ATIVO','INATIVO','MANUTENÇÃO') then v.status
        else 'ATIVO'
    end,
    coalesce(v.created_at, now()),
    coalesce(v.updated_at, now())
from public.veiculos v
where v.combustivel in (
    'GASOLINA','ETANOL','FLEX','DIESEL','DIESEL S10','ELÉTRICO'
);

-- Depois de conferir os dados migrados, faça a substituição:
-- alter table public.veiculos rename to veiculos_legacy;
-- alter table public.veiculos_novo rename to veiculos;

commit;
