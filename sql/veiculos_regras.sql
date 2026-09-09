-- PAINEL FROTA - REGRAS AUTOMÁTICAS DE VEÍCULOS
-- Execute depois de veiculos_create.sql/schema.sql.
-- As regras abaixo cuidam de alerta de revisão, auditoria e KM.

create or replace function public.fn_atualizar_alerta_revisao()
returns trigger
language plpgsql
as $$
begin
    if new.proxima_revisao is null then
        new.alerta_revisao := 'SEM DATA';
    elsif new.proxima_revisao < current_date then
        new.alerta_revisao := 'VENCIDA';
    elsif new.proxima_revisao <= current_date + interval '30 days' then
        new.alerta_revisao := 'ATENÇÃO';
    else
        new.alerta_revisao := 'EM DIA';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_veiculos_alerta_revisao on public.veiculos;

create trigger trg_veiculos_alerta_revisao
before insert or update of proxima_revisao
on public.veiculos
for each row
execute function public.fn_atualizar_alerta_revisao();


create or replace function public.fn_veiculos_auditoria()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        new.criado_em := coalesce(new.criado_em, now());
        new.atualizado_em := coalesce(new.atualizado_em, now());
    else
        new.criado_em := old.criado_em;
        new.atualizado_em := now();
    end if;

    return new;
end;
$$;

drop trigger if exists trg_veiculos_auditoria on public.veiculos;

create trigger trg_veiculos_auditoria
before insert or update
on public.veiculos
for each row
execute function public.fn_veiculos_auditoria();


create or replace function public.fn_lancamento_km_inicial_automatico()
returns trigger
language plpgsql
as $$
declare
    ultimo_km numeric;
begin
    if new.km_inicial is null and new.id_veiculo is not null then
        select max(l.km_final)
          into ultimo_km
          from public.lancamentos l
         where l.id_veiculo = new.id_veiculo
           and l.km_final is not null;

        new.km_inicial := coalesce(ultimo_km, 0);
    end if;

    return new;
end;
$$;

drop trigger if exists trg_lancamento_km_inicial_automatico
on public.lancamentos;

create trigger trg_lancamento_km_inicial_automatico
before insert on public.lancamentos
for each row
execute function public.fn_lancamento_km_inicial_automatico();


create or replace function public.fn_lancamento_atualiza_km_veiculo()
returns trigger
language plpgsql
as $$
begin
    if new.id_veiculo is not null and new.km_final is not null then
        update public.veiculos
           set km_atual = greatest(coalesce(km_atual, 0), new.km_final)
         where id = new.id_veiculo;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_lancamento_atualiza_km_veiculo
on public.lancamentos;

create trigger trg_lancamento_atualiza_km_veiculo
after insert or update of id_veiculo, km_final
on public.lancamentos
for each row
execute function public.fn_lancamento_atualiza_km_veiculo();


create index if not exists idx_lancamentos_veiculo_km_final
    on public.lancamentos(id_veiculo, km_final);


-- Storage público para os arquivos vinculados aos veículos.
-- A aplicação grava somente a URL/caminho no banco.
insert into storage.buckets (id, name, public)
values ('veiculos', 'veiculos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "veiculos_storage_select" on storage.objects;
create policy "veiculos_storage_select"
on storage.objects
for select
using (bucket_id = 'veiculos');

drop policy if exists "veiculos_storage_insert" on storage.objects;
create policy "veiculos_storage_insert"
on storage.objects
for insert
with check (bucket_id = 'veiculos');

drop policy if exists "veiculos_storage_update" on storage.objects;
create policy "veiculos_storage_update"
on storage.objects
for update
using (bucket_id = 'veiculos')
with check (bucket_id = 'veiculos');

drop policy if exists "veiculos_storage_delete" on storage.objects;
create policy "veiculos_storage_delete"
on storage.objects
for delete
using (bucket_id = 'veiculos');
