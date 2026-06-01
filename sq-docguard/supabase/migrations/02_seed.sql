-- ============================================================
-- SQ DocGuard — Seed inicial
-- Aplicar DEPOIS de 01_schema.sql
-- ============================================================

-- Configuração dos intervalos de alerta (dias antes do vencimento; 0 = no dia)
insert into public.configuracoes (chave, valor) values
  ('alertas_dias_antecedencia', '[45, 30, 15, 7, 0]'::jsonb)
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();

-- Unidade padrão (novos usuários são vinculados automaticamente a ela)
insert into public.unidades (nome)
select 'Matriz'
where not exists (select 1 from public.unidades where nome ilike 'Matriz');

-- Tipos de documento controlados
insert into public.tipos_documento (nome, exige_orgao_emissor) values
  ('Licença de Operação Ambiental', true),
  ('Alvará de Bombeiros (AVCB)', true),
  ('Licença de Produtos Controlados (PF/Exército)', true),
  ('Apólice de Seguro', false),
  ('Certificado Digital', true)
on conflict (nome) do nothing;
