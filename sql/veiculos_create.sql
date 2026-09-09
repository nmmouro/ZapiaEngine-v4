-- PAINEL FROTA - VEÍCULOS
-- Instalação limpa da tabela public.veiculos.
-- Use este arquivo quando a tabela ainda não existir.

create table if not exists public.veiculos (
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
    atualizado_em timestamptz not null default now(),
    constraint veiculos_combustivel_chk check (
        combustivel in ('GASOLINA','ETANOL','FLEX','DIESEL','DIESEL S10','ELÉTRICO')
    ),
    constraint veiculos_status_chk check (
        status in ('ATIVO','INATIVO','MANUTENÇÃO')
    ),
    constraint veiculos_ano_chk check (
        ano_fabricacao_modelo is null
        or ano_fabricacao_modelo between 1900 and 2100
    ),
    constraint veiculos_km_chk check (km_atual >= 0)
);

create index if not exists idx_veiculos_placa
    on public.veiculos(placa);

create index if not exists idx_veiculos_status
    on public.veiculos(status);

create index if not exists idx_veiculos_proxima_revisao
    on public.veiculos(proxima_revisao);
