# SQ DocGuard — Estado do pipeline implantado

Registro do que já está provisionado no ambiente real (Supabase) e o que falta
para o envio de e-mails entrar em produção.

## Projeto Supabase

- **Nome:** SQ DocGuard
- **Project ref:** `ehqvmxdduvzsdcvyslml`
- **URL:** `https://ehqvmxdduvzsdcvyslml.supabase.co`
- **Região:** us-east-2
- **Organização:** SQ Quimica

## Banco de dados (aplicado)

| Migration | Conteúdo |
|---|---|
| `01_schema.sql` | 14 tabelas, enums, funções `security definer`, triggers, RLS, bucket `documentos` |
| `02_seed.sql` | Unidade "Matriz", 5 tipos (preset químico), alertas `[45,30,15,7,0]` |
| `03_cron_pipeline.sql` | Schema `private`, segredo do cron, `verificar_cron_secret`, pg_cron + pg_net, job diário |
| `04_hardening_funcoes.sql` | `search_path` fixo + revogações de EXECUTE |
| `05_revoke_public_execute.sql` | Remove EXECUTE de PUBLIC; reconcede só ao `authenticated` nas funções de RLS |

Status de segurança (advisors): sem avisos de `anon`; restam apenas itens
intencionais (tabelas service-role-only; `pg_net`; e as 4 funções de RLS que o
`authenticated` precisa executar — padrão documentado do Supabase).

## Edge Function (implantada)

- **Nome:** `processar-alertas` · `verify_jwt = false` · status ACTIVE
- **URL:** `https://ehqvmxdduvzsdcvyslml.supabase.co/functions/v1/processar-alertas`
- **Autenticação:** header `x-cron-secret` validado via `verificar_cron_secret`
  (segredo em `private.cron_config`, nunca exposto).
- **Testado:** segredo correto → `200 {processados:0,enviados:0,erros:0}`;
  segredo errado → `401 unauthorized`.
- Lógica: busca alertas `in_app` vencendo, agrupa por usuário, dedup por documento
  (mais urgente), envia resumo via Microsoft Graph, marca `enviado` e registra em
  `email_envios`. Em falha, não marca → retenta no próximo ciclo.

## Agendamento (ativo)

- **pg_cron job:** `processar-alertas-diario` · `0 11 * * *` (08:00 BRT) · ativo.
- Chama a Edge Function via `pg_net` lendo o segredo do banco.

## Pendências para produção (tarefa de TI — fora do código)

1. **App Registration no Microsoft Entra** com permissão de aplicação **Mail.Send**
   (consentida). Gera tenant/client/secret.
2. **Caixa remetente** (compartilhada, sem licença) = `MS_GRAPH_SENDER`.
3. **(Recomendado) Application Access Policy** restringindo o app à caixa remetente.
4. **Secrets da Edge Function** (painel Supabase → Edge Functions → Secrets):
   - `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`,
     `MS_GRAPH_SENDER`, `APP_URL` (URL pública do app).
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente.
5. **Validação:** após os secrets, cadastrar um documento com vencimento próximo,
   invocar a função manualmente e confirmar o recebimento do e-mail de teste.

Enquanto os secrets do Graph não existirem, a função roda sem erro mas não envia
(os alertas continuam pendentes e são retentados).

## Reimplantar a Edge Function (fora deste ambiente)

```bash
supabase functions deploy processar-alertas --no-verify-jwt --project-ref ehqvmxdduvzsdcvyslml
```
