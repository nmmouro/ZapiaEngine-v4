-- ============================================================
-- PAINEL FROTA
-- STORAGE DE ANEXOS — TODAS AS ENTIDADES
--
-- Bucket único mantido por compatibilidade:
--     veiculos
--
-- Novo padrão:
--     entidade/ID/campo/arquivo
--
-- Exemplos:
--     veiculos/VEI000001/foto/...
--     empregados/EMP000001/foto/...
--     abastecimento/ABA000001/imagem/...
--     avarias/AVA000001/vista_frontal/...
--     manutencao/MAN000001/imagem/...
--
-- Os arquivos antigos de veículos no padrão:
--     VEI000001/foto/...
-- continuam válidos e não precisam ser migrados.
-- ============================================================

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'veiculos',
    'veiculos',
    true,
    20971520,
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ]
)
on conflict (id) do update
set
    public = true,
    file_size_limit = 20971520,
    allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- Limpeza das policies anteriores
-- ------------------------------------------------------------

drop policy if exists "veiculos_storage_select_public"
    on storage.objects;

drop policy if exists "veiculos_storage_insert_anon"
    on storage.objects;

drop policy if exists "veiculos_storage_update_anon"
    on storage.objects;

drop policy if exists "veiculos_storage_delete_anon"
    on storage.objects;

drop policy if exists "storage_anexos_select_public"
    on storage.objects;

drop policy if exists "storage_anexos_insert"
    on storage.objects;

drop policy if exists "storage_anexos_update"
    on storage.objects;

drop policy if exists "storage_anexos_delete"
    on storage.objects;

-- ============================================================
-- SELECT
-- Bucket público.
-- ============================================================

create policy "storage_anexos_select_public"
on storage.objects
for select
to public
using (
    bucket_id = 'veiculos'
);

-- ============================================================
-- INSERT
--
-- Entidades atualmente suportadas:
-- veiculos
-- empregados
-- abastecimento / abastecimentos
-- avarias
-- manutencao / manutencoes
-- lancamentos
-- checklist
-- lava_car
--
-- Estrutura:
-- entidade/ID/campo/arquivo
--
-- Compatibilidade:
-- VEI000001/campo/arquivo
-- ============================================================

create policy "storage_anexos_insert"
on storage.objects
for insert
to anon, authenticated
with check (
    bucket_id = 'veiculos'
    and (
        (
            storage.foldername(name)[1] = 'veiculos'
            and storage.foldername(name)[2] ~ '^VEI[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] = 'empregados'
            and storage.foldername(name)[2] ~ '^EMP[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] in ('abastecimento', 'abastecimentos')
            and storage.foldername(name)[2] ~ '^ABA[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] = 'avarias'
            and storage.foldername(name)[2] ~ '^AVA[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] in ('manutencao', 'manutencoes')
            and storage.foldername(name)[2] ~ '^MAN[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] = 'lancamentos'
            and storage.foldername(name)[2] ~ '^LAN[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] = 'checklist'
            and storage.foldername(name)[2] ~ '^CHE[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] = 'lava_car'
            and storage.foldername(name)[2] ~ '^LAV[0-9]{6}$'
        )
        or
        (
            storage.foldername(name)[1] ~ '^VEI[0-9]{6}$'
            and storage.foldername(name)[2] is not null
        )
    )
);

-- ============================================================
-- UPDATE
-- ============================================================

create policy "storage_anexos_update"
on storage.objects
for update
to anon, authenticated
using (
    bucket_id = 'veiculos'
)
with check (
    bucket_id = 'veiculos'
);

-- ============================================================
-- DELETE
-- ============================================================

create policy "storage_anexos_delete"
on storage.objects
for delete
to anon, authenticated
using (
    bucket_id = 'veiculos'
    and (
        storage.foldername(name)[1] in (
            'veiculos',
            'empregados',
            'abastecimento',
            'abastecimentos',
            'avarias',
            'manutencao',
            'manutencoes',
            'lancamentos',
            'checklist',
            'lava_car'
        )
        or storage.foldername(name)[1] ~ '^VEI[0-9]{6}$'
    )
);

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================

select
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
from storage.buckets
where id = 'veiculos';

select
    policyname,
    cmd,
    roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'storage_anexos_%'
order by policyname;
