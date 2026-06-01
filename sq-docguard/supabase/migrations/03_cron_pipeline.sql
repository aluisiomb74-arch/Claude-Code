-- ============================================================
-- SQ DocGuard — Pipeline de alertas por e-mail (cron)
-- Schema privado com segredo, função de validação, extensões e agendamento.
-- Aplicar DEPOIS de 01_schema.sql e 02_seed.sql.
-- ============================================================

create schema if not exists private;

create table if not exists private.cron_config (
  chave text primary key,
  valor text not null,
  criado_em timestamptz not null default now()
);
alter table private.cron_config enable row level security;
-- Sem políticas: inacessível via API; apenas service_role / SQL interno.

-- Segredo compartilhado para autenticar o agendador na Edge Function.
insert into private.cron_config (chave, valor)
values (
  'cron_secret',
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
)
on conflict (chave) do nothing;

-- Validação do segredo, sem expor o valor. Só o service_role pode executar.
create or replace function public.verificar_cron_secret(_secret text)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from private.cron_config
    where chave = 'cron_secret' and valor = _secret
  )
$$;
revoke all on function public.verificar_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verificar_cron_secret(text) to service_role;

-- Extensões para agendamento e chamada HTTP
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Agendamento diário (08:00 BRT = 11:00 UTC). A função processar-alertas
-- precisa estar implantada antes de executar este trecho.
select cron.unschedule('processar-alertas-diario')
where exists (select 1 from cron.job where jobname = 'processar-alertas-diario');

select cron.schedule(
  'processar-alertas-diario',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://ehqvmxdduvzsdcvyslml.supabase.co/functions/v1/processar-alertas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select valor from private.cron_config where chave = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
