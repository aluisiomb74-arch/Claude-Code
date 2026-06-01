-- ============================================================
-- {{NOME_APP}} — Seed inicial
-- Aplicar DEPOIS de 01_schema.sql
-- ============================================================

-- Configuração dos intervalos de alerta (dias antes do vencimento; 0 = no dia)
insert into public.configuracoes (chave, valor) values
  ('alertas_dias_antecedencia', '{{DIAS_ALERTA_JSON}}'::jsonb)
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();

-- Unidade padrão (novos usuários são vinculados automaticamente a ela)
insert into public.unidades (nome)
select '{{UNIDADE_PADRAO}}'
where not exists (select 1 from public.unidades where nome ilike '{{UNIDADE_PADRAO}}');

-- Tipos de documento controlados
insert into public.tipos_documento (nome, exige_orgao_emissor) values
{{TIPOS_DOCUMENTO_SQL}}
on conflict (nome) do nothing;
