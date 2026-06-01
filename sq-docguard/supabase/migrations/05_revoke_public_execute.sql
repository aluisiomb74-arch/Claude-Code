-- ============================================================
-- SQ DocGuard — Remove o EXECUTE herdado de PUBLIC nas funções SECURITY DEFINER
-- e reconcede apenas ao authenticated nas funções usadas pelas políticas RLS.
-- ============================================================

-- Funções de trigger / internas: ninguém precisa de EXECUTE direto.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.validar_dominio_email() from public;
revoke execute on function public.validar_responsavel_email() from public;
revoke execute on function public.atualizar_documento_nova_versao() from public;
revoke execute on function public.trg_regerar_alertas() from public;
revoke execute on function public.regerar_alertas_documento(uuid) from public;

-- Funções usadas nas políticas RLS: removem PUBLIC, mantêm só authenticated.
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.current_user_is_admin() from public;
revoke execute on function public.user_pode_acessar_unidade(uuid, uuid) from public;
revoke execute on function public.user_pode_editar_unidade(uuid, uuid) from public;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.user_pode_acessar_unidade(uuid, uuid) to authenticated;
grant execute on function public.user_pode_editar_unidade(uuid, uuid) to authenticated;
