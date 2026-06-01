-- ============================================================
-- SQ DocGuard — Endurecimento de funções (advisors de segurança)
-- search_path fixo + remoção de EXECUTE indevido.
-- ============================================================

-- search_path fixo em calcular_status_documento
create or replace function public.calcular_status_documento(_data_vencimento date, _sem_validade boolean)
returns public.documento_status
language sql
immutable
set search_path = public
as $$
  select case
    when _sem_validade then 'sem_validade'::public.documento_status
    when _data_vencimento is null then 'sem_validade'::public.documento_status
    when _data_vencimento < current_date then 'vencido'::public.documento_status
    when _data_vencimento <= current_date + interval '30 days' then 'vencendo'::public.documento_status
    else 'vigente'::public.documento_status
  end
$$;

-- (Defesa em profundidade: revoga de anon/authenticated; o 05 remove o PUBLIC.)
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.current_user_is_admin() from anon;
revoke execute on function public.user_pode_acessar_unidade(uuid, uuid) from anon;
revoke execute on function public.user_pode_editar_unidade(uuid, uuid) from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.validar_dominio_email() from anon;
revoke execute on function public.validar_responsavel_email() from anon;
revoke execute on function public.atualizar_documento_nova_versao() from anon;
revoke execute on function public.trg_regerar_alertas() from anon;
revoke execute on function public.regerar_alertas_documento(uuid) from anon;

revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.validar_dominio_email() from authenticated;
revoke execute on function public.validar_responsavel_email() from authenticated;
revoke execute on function public.atualizar_documento_nova_versao() from authenticated;
revoke execute on function public.trg_regerar_alertas() from authenticated;
revoke execute on function public.regerar_alertas_documento(uuid) from authenticated;
