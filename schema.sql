-- PAINEL FROTA - SUPABASE / POSTGRESQL
-- Schema atualizado para o módulo de veículos.
-- Execute no SQL Editor do Supabase.

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

-- Demais tabelas existentes do Painel Frota permanecem abaixo.
create table if not exists public.empregados (
    id text primary key,
    data_cadastro date not null default current_date,
    foto text,
    empregado text not null,
    matricula text,
    diretoria text,
    setor text,
    usuario text,
    condicao text,
    status text not null default 'ATIVO',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.abastecimentos (
    id text primary key,
    data date not null default current_date,
    hora time not null default localtime,
    id_veiculo text not null references public.veiculos(id),
    veiculo text,
    combustivel text not null,
    km numeric not null,
    litros numeric(12,3) not null,
    valor_litro numeric(12,3),
    valor_total numeric(12,2),
    posto text,
    nota_fiscal text,
    observacoes text,
    usuario text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.lancamentos (
    id text primary key,
    data date not null default current_date,
    hora time not null default localtime,
    id_empregado text not null references public.empregados(id),
    id_veiculo text not null references public.veiculos(id),
    empregado_matricula text,
    veiculo text,
    passageiro_setor_motivo text not null,
    itinerario text not null,
    horario_inicial time,
    horario_final time,
    km_inicial numeric,
    km_final numeric,
    distancia_percorrida numeric,
    combustivel numeric(12,3),
    media_consumo_combustivel numeric(12,3),
    checklist text not null default 'NÃO REGISTRADO',
    avaliacao_visual text,
    avarias_registradas text,
    lava_car numeric(12,2),
    valor_higienizacao numeric(12,2),
    notas_abastecimento numeric(12,2),
    notas_manutencao numeric(12,2),
    status text not null default 'AGENDADO',
    horas_extras numeric(12,2),
    revisao text,
    usuario text,
    classificacao text,
    localizacao text,
    duracao_atendimento time,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.manutencao (
    id text primary key,
    id_lancamento text not null references public.lancamentos(id),
    data date not null default current_date,
    hora time not null default localtime,
    empregado_matricula text,
    veiculo text,
    odometro numeric(12,1) not null,
    usuario text,
    imagem text,
    observacoes text,
    descricao_manutencao text not null,
    valor_total_nota numeric(12,2) not null,
    localizacao text,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);
