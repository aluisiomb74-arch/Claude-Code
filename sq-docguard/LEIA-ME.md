# SQ DocGuard — Pacote inicial gerado

Gerado pela skill doccontrol-generator. Onde cada arquivo entra:

- `prompt-lovable.md` — cole no Lovable como primeira mensagem (entrega incremental).
- `supabase/migrations/01_schema.sql` — aplicar no Supabase PRIMEIRO.
- `supabase/migrations/02_seed.sql` — aplicar DEPOIS (tipos, unidade padrão, intervalos de alerta).
- `src/lib/email/graph.server.ts` — helper de envio via Microsoft Graph.
- `src/lib/email/processar.server.ts` — processador do resumo diário de alertas.
- `src/lib/email/templates.server.ts` — templates HTML de e-mail (alertas + auth).
- `src/routes/api.public.hooks.alertas-diarios.ts` — endpoint acionado pelo cron diário.
- `checklist-ti.md` — passo a passo para o TI (Entra/Exchange) + runbook + secrets.

## Parâmetros usados
- Domínio de e-mail permitido: @sqquimica.com
- Intervalos de alerta (dias): [45, 30, 15, 7, 0]
- Unidade padrão: Matriz
- Cor principal: #ea580c
- CC fixo: nenhum

## Próximos passos
1. Supabase: aplicar as duas migrations na ordem.
2. Lovable: colar o prompt; adicionar os 4 arquivos do Graph nos caminhos acima.
3. TI: seguir o checklist (App Registration Mail.Send + caixa remetente + restrição).
4. Cadastrar os secrets e agendar o cron diário.
5. Disparar e-mail de teste antes de produção.
