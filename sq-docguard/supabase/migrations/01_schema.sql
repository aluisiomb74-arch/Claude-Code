-- ============================================================
-- SQ DocGuard — Schema completo (estado consolidado)
-- Aplicar este arquivo PRIMEIRO, depois 02_seed.sql
-- Plataforma de controle de documentação com alertas de vencimento.
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
create type public.app_role as enum ('admin', 'gestor', 'visualizador');
create type public.documento_status as enum ('vigente', 'vencendo', 'vencido', 'sem_validade');
create type public.alerta_canal as enum ('in_app', 'email', 'teams');

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ============================================================
-- USER ROLES (papéis em tabela separada — padrão seguro)
-- ============================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  criado_em timestamptz not null default now(),
  unique (user_id, role)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- ============================================================
-- UNIDADES
-- ============================================================
create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  cidade text,
  estado text,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null
);
grant select, insert, update, delete on public.unidades to authenticated;
grant all on public.unidades to service_role;
alter table public.unidades enable row level security;

-- ============================================================
-- UNIDADE_USUARIOS (N:N — base da segmentação de acesso)
-- ============================================================
create table public.unidade_usuarios (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (unidade_id, user_id)
);
grant select, insert, delete on public.unidade_usuarios to authenticated;
grant all on public.unidade_usuarios to service_role;
alter table public.unidade_usuarios enable row level security;

create or replace function public.user_pode_acessar_unidade(_user_id uuid, _unidade_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
      or exists (select 1 from public.unidade_usuarios where user_id = _user_id and unidade_id = _unidade_id)
$$;

create or replace function public.user_pode_editar_unidade(_user_id uuid, _unidade_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
      or (public.has_role(_user_id, 'gestor')
          and exists (select 1 from public.unidade_usuarios where user_id = _user_id and unidade_id = _unidade_id))
$$;

-- ============================================================
-- TIPOS_DOCUMENTO
-- ============================================================
create table public.tipos_documento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  exige_orgao_emissor boolean not null default false,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.tipos_documento to authenticated;
grant all on public.tipos_documento to service_role;
alter table public.tipos_documento enable row level security;

-- ============================================================
-- DOCUMENTOS
-- ============================================================
create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo_documento_id uuid not null references public.tipos_documento(id) on delete restrict,
  unidade_id uuid not null references public.unidades(id) on delete restrict,
  numero_documento text,
  orgao_emissor text,
  data_emissao date,
  data_vencimento date,
  sem_validade boolean not null default false,
  responsavel_id uuid references auth.users(id) on delete set null,
  responsavel_nome text,
  responsavel_email text,
  observacoes text,
  versao_atual integer not null default 0,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index documentos_unidade_idx on public.documentos(unidade_id);
create index documentos_vencimento_idx on public.documentos(data_vencimento);
grant select, insert, update, delete on public.documentos to authenticated;
grant all on public.documentos to service_role;
alter table public.documentos enable row level security;

create or replace function public.calcular_status_documento(_data_vencimento date, _sem_validade boolean)
returns public.documento_status language sql immutable as $$
  select case
    when _sem_validade then 'sem_validade'::public.documento_status
    when _data_vencimento is null then 'sem_validade'::public.documento_status
    when _data_vencimento < current_date then 'vencido'::public.documento_status
    when _data_vencimento <= current_date + interval '30 days' then 'vencendo'::public.documento_status
    else 'vigente'::public.documento_status
  end
$$;

-- Valida formato do e-mail do responsável externo, se informado
create or replace function public.validar_responsavel_email()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.responsavel_email is not null and new.responsavel_email <> '' then
    if new.responsavel_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
      raise exception 'E-mail do responsável inválido.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_validar_responsavel_email on public.documentos;
create trigger trg_validar_responsavel_email
before insert or update on public.documentos
for each row execute function public.validar_responsavel_email();

-- ============================================================
-- VERSOES_DOCUMENTO (histórico imutável)
-- ============================================================
create table public.versoes_documento (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos(id) on delete cascade,
  numero_versao integer not null,
  arquivo_path text not null,
  arquivo_nome text not null,
  data_emissao date,
  data_vencimento date,
  comentario text,
  enviado_por uuid references auth.users(id) on delete set null,
  enviado_em timestamptz not null default now(),
  unique (documento_id, numero_versao)
);
create index versoes_documento_doc_idx on public.versoes_documento(documento_id);
grant select, insert on public.versoes_documento to authenticated;
grant all on public.versoes_documento to service_role;
alter table public.versoes_documento enable row level security;

-- Ao inserir nova versão, ela vira a vigente no documento
create or replace function public.atualizar_documento_nova_versao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.documentos
  set versao_atual = new.numero_versao,
      data_emissao = coalesce(new.data_emissao, data_emissao),
      data_vencimento = coalesce(new.data_vencimento, data_vencimento),
      atualizado_em = now()
  where id = new.documento_id;
  return new;
end;
$$;
create trigger trg_atualizar_documento_nova_versao
after insert on public.versoes_documento
for each row execute function public.atualizar_documento_nova_versao();

-- ============================================================
-- CONFIGURACOES (chave/valor)
-- ============================================================
create table public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);
grant select, insert, update on public.configuracoes to authenticated;
grant all on public.configuracoes to service_role;
alter table public.configuracoes enable row level security;

-- ============================================================
-- ALERTAS (idempotentes via unique + flag enviado)
-- ============================================================
create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dias_antecedencia integer not null,
  data_alerta date not null,
  canal public.alerta_canal not null default 'in_app',
  lido boolean not null default false,
  lido_em timestamptz,
  enviado boolean not null default false,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (documento_id, user_id, dias_antecedencia, canal)
);
create index alertas_user_idx on public.alertas(user_id, lido);
create index alertas_data_idx on public.alertas(data_alerta);
grant select, update on public.alertas to authenticated;
grant all on public.alertas to service_role;
alter table public.alertas enable row level security;

-- Gera alertas para um documento (responsável + admins + gestores da unidade)
create or replace function public.regerar_alertas_documento(_documento_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _doc record; _dias_list jsonb; _dia integer; _data_alerta date;
  _admins record; _gestores record;
begin
  select * into _doc from public.documentos where id = _documento_id;
  if _doc is null or _doc.sem_validade or _doc.data_vencimento is null then
    delete from public.alertas where documento_id = _documento_id and enviado = false;
    return;
  end if;

  select valor into _dias_list from public.configuracoes where chave = 'alertas_dias_antecedencia';
  if _dias_list is null then _dias_list := '[45, 30, 15, 7, 0]'::jsonb; end if;

  delete from public.alertas where documento_id = _documento_id and canal = 'in_app' and enviado = false;

  for _dia in select (jsonb_array_elements_text(_dias_list))::int loop
    _data_alerta := _doc.data_vencimento - _dia;

    if _doc.responsavel_id is not null then
      insert into public.alertas (documento_id, user_id, dias_antecedencia, data_alerta, canal)
      values (_documento_id, _doc.responsavel_id, _dia, _data_alerta, 'in_app') on conflict do nothing;
    end if;

    for _admins in select user_id from public.user_roles where role = 'admin' loop
      insert into public.alertas (documento_id, user_id, dias_antecedencia, data_alerta, canal)
      values (_documento_id, _admins.user_id, _dia, _data_alerta, 'in_app') on conflict do nothing;
    end loop;

    for _gestores in
      select uu.user_id from public.unidade_usuarios uu
      join public.user_roles ur on ur.user_id = uu.user_id and ur.role = 'gestor'
      where uu.unidade_id = _doc.unidade_id
    loop
      insert into public.alertas (documento_id, user_id, dias_antecedencia, data_alerta, canal)
      values (_documento_id, _gestores.user_id, _dia, _data_alerta, 'in_app') on conflict do nothing;
    end loop;
  end loop;
end;
$$;

create or replace function public.trg_regerar_alertas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.regerar_alertas_documento(new.id);
  return new;
end;
$$;
create trigger trg_documentos_alertas
after insert or update of data_vencimento, sem_validade, responsavel_id, unidade_id
on public.documentos
for each row execute function public.trg_regerar_alertas();

-- ============================================================
-- EMAIL_ENVIOS (log de auditoria / retentativa)
-- ============================================================
create table public.email_envios (
  id uuid primary key default gen_random_uuid(),
  alerta_id uuid references public.alertas(id) on delete set null,
  documento_id uuid,
  destinatario text not null,
  assunto text not null,
  status text not null default 'enviado',
  erro text,
  enviado_em timestamptz not null default now()
);
create index idx_email_envios_alerta on public.email_envios(alerta_id);
create index idx_email_envios_data on public.email_envios(enviado_em desc);
grant select on public.email_envios to authenticated;
grant all on public.email_envios to service_role;
alter table public.email_envios enable row level security;

-- ============================================================
-- LOG_ATIVIDADES (trilha de auditoria)
-- ============================================================
create table public.log_atividades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  detalhe jsonb,
  data_hora timestamptz not null default now()
);
create index log_atividades_data_idx on public.log_atividades(data_hora desc);
grant select, insert on public.log_atividades to authenticated;
grant all on public.log_atividades to service_role;
alter table public.log_atividades enable row level security;

-- ============================================================
-- CONVITES (cadastro e reset via token próprio — e-mail pelo Graph)
-- ============================================================
create table public.convites_cadastro (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nome text,                       -- opcional: convites emitidos pelo admin podem não ter nome ainda
  token_hash text not null unique,
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_por uuid references auth.users(id) on delete set null,  -- admin que emitiu o convite (null = auto-cadastro)
  role public.app_role,            -- papel pré-atribuído ao aceitar o convite (null = visualizador padrão)
  criado_em timestamptz not null default now()
);
create index idx_convites_cadastro_email on public.convites_cadastro (lower(email));

create table public.convites_reset_senha (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index idx_convites_reset_email on public.convites_reset_senha (lower(email));

grant all on public.convites_cadastro to service_role;
grant all on public.convites_reset_senha to service_role;
alter table public.convites_cadastro enable row level security;
alter table public.convites_reset_senha enable row level security;
-- Sem políticas: acessadas apenas pelo service_role (server functions).

-- Unidades concedidas por um convite (admin define o acesso antes do aceite)
create table public.convite_unidades (
  id uuid primary key default gen_random_uuid(),
  convite_id uuid not null references public.convites_cadastro(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (convite_id, unidade_id)
);
grant all on public.convite_unidades to service_role;
alter table public.convite_unidades enable row level security;
-- Sem políticas: acessada apenas pelo service_role (server functions).

-- ============================================================
-- VALIDAÇÃO DE DOMÍNIO DE E-MAIL NO CADASTRO
-- ============================================================
create or replace function public.validar_dominio_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) not like '%@sqquimica.com' then
    raise exception 'Apenas e-mails do domínio @sqquimica.com são permitidos.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_validar_dominio_email on auth.users;
create trigger trg_validar_dominio_email
before insert on auth.users
for each row execute function public.validar_dominio_email();

-- ============================================================
-- HANDLE NEW USER: cria profile, dá admin ao 1º usuário,
-- vincula à unidade padrão
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _count integer; _unidade_default uuid;
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;

  select count(*) into _count from public.user_roles;
  if _count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'visualizador') on conflict do nothing;
  end if;

  select id into _unidade_default from public.unidades where nome ilike 'Matriz'
  order by criado_em asc limit 1;
  if _unidade_default is not null then
    insert into public.unidade_usuarios (user_id, unidade_id) values (new.id, _unidade_default)
    on conflict do nothing;
  end if;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================
-- profiles
create policy "Usuários veem próprio profile, admin vê todos"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.current_user_is_admin());
create policy "Usuário atualiza próprio profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Admin/own pode inserir profile"
  on public.profiles for insert to authenticated
  with check (public.current_user_is_admin() or auth.uid() = id);

-- user_roles
create policy "Ver próprio papel ou admin vê todos"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());
create policy "Admin insere papéis"
  on public.user_roles for insert to authenticated with check (public.current_user_is_admin());
create policy "Admin atualiza papéis"
  on public.user_roles for update to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "Admin remove papéis"
  on public.user_roles for delete to authenticated using (public.current_user_is_admin());

-- unidades
create policy "Ver unidades vinculadas ou admin"
  on public.unidades for select to authenticated
  using (public.current_user_is_admin()
    or exists (select 1 from public.unidade_usuarios where unidade_id = unidades.id and user_id = auth.uid()));
create policy "Admin cria unidades" on public.unidades for insert to authenticated
  with check (public.current_user_is_admin());
create policy "Admin atualiza unidades" on public.unidades for update to authenticated
  using (public.current_user_is_admin());
create policy "Admin deleta unidades" on public.unidades for delete to authenticated
  using (public.current_user_is_admin());

-- unidade_usuarios
create policy "Ver vínculos próprios ou admin"
  on public.unidade_usuarios for select to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());
create policy "Admin gerencia vínculos"
  on public.unidade_usuarios for insert to authenticated with check (public.current_user_is_admin());
create policy "Admin remove vínculos"
  on public.unidade_usuarios for delete to authenticated using (public.current_user_is_admin());

-- tipos_documento
create policy "Authenticated lê tipos"
  on public.tipos_documento for select to authenticated using (true);
create policy "Admin gerencia tipos"
  on public.tipos_documento for insert to authenticated with check (public.current_user_is_admin());
create policy "Admin atualiza tipos"
  on public.tipos_documento for update to authenticated using (public.current_user_is_admin());
create policy "Admin deleta tipos"
  on public.tipos_documento for delete to authenticated using (public.current_user_is_admin());

-- documentos
create policy "Ver documentos das unidades permitidas"
  on public.documentos for select to authenticated
  using (public.user_pode_acessar_unidade(auth.uid(), unidade_id));
create policy "Gestor/admin cria documentos"
  on public.documentos for insert to authenticated
  with check (public.user_pode_editar_unidade(auth.uid(), unidade_id));
create policy "Gestor/admin atualiza documentos"
  on public.documentos for update to authenticated
  using (public.user_pode_editar_unidade(auth.uid(), unidade_id));
create policy "Admin deleta documentos"
  on public.documentos for delete to authenticated using (public.current_user_is_admin());

-- versoes_documento
create policy "Ver versões dos documentos permitidos"
  on public.versoes_documento for select to authenticated
  using (exists (select 1 from public.documentos d where d.id = versoes_documento.documento_id
    and public.user_pode_acessar_unidade(auth.uid(), d.unidade_id)));
create policy "Gestor/admin sobe versões"
  on public.versoes_documento for insert to authenticated
  with check (exists (select 1 from public.documentos d where d.id = versoes_documento.documento_id
    and public.user_pode_editar_unidade(auth.uid(), d.unidade_id)));

-- alertas
create policy "Ver próprios alertas"
  on public.alertas for select to authenticated using (user_id = auth.uid());
create policy "Marcar próprios alertas como lidos"
  on public.alertas for update to authenticated using (user_id = auth.uid());

-- configuracoes
create policy "Authenticated lê configurações"
  on public.configuracoes for select to authenticated using (true);
create policy "Admin atualiza configurações"
  on public.configuracoes for update to authenticated using (public.current_user_is_admin());
create policy "Admin insere configurações"
  on public.configuracoes for insert to authenticated with check (public.current_user_is_admin());

-- email_envios
create policy "Admin lê envios de e-mail"
  on public.email_envios for select to authenticated using (public.current_user_is_admin());

-- log_atividades
create policy "Admin lê log"
  on public.log_atividades for select to authenticated using (public.current_user_is_admin());
create policy "Authenticated grava próprio log"
  on public.log_atividades for insert to authenticated
  with check (auth.uid() is not null and user_id = auth.uid());

-- ============================================================
-- STORAGE: bucket privado "documentos"
-- Convenção de path: {unidade_id}/{documento_id}/{versao}-{arquivo}
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "Autenticados leem documentos de suas unidades"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos'
    and public.user_pode_acessar_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid));

create policy "Autenticados sobem arquivos para unidades acessíveis"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos'
    and public.user_pode_acessar_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid));

create policy "Gestores e admins atualizam arquivos da unidade"
  on storage.objects for update to authenticated
  using (bucket_id = 'documentos'
    and public.user_pode_editar_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid));

create policy "Admins excluem arquivos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.current_user_is_admin());
