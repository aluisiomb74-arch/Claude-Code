# SQ DocGuard

Plataforma interna de controle de documentação regulatória com alertas de vencimento.
Stack: **React 19 + TanStack Router + Vite + Supabase** (Tailwind CSS 4).

## Estado atual — Fatia 1 (MVP)

Implementado e funcional:

- **Autenticação** Supabase (login + cadastro). Restrição de domínio `@sqquimica.com` e
  atribuição de papel (1º usuário = admin) são garantidas por triggers no banco.
- **Dashboard** com KPIs por status e lista de próximos vencimentos (45 dias).
- **Documentos**: listagem com busca e cadastro (tipo, unidade, datas, responsável,
  órgão emissor condicional, sem-validade).
- Status calculado no cliente espelhando a função SQL `calcular_status_documento`.

Backend (Supabase) já provisionado: 14 tabelas com RLS, funções `security definer`,
triggers de alerta/versão, bucket privado `documentos`, seed de tipos e unidade "Matriz".

### Próximas fatias (ver `LEIA-ME.md` e `checklist-ti.md`)

- Versões de documento (upload para o Storage) e tela de detalhe.
- Central de alertas in-app.
- Envio de e-mail via Microsoft Graph (arquivos em `src/lib/email/*.server.ts` e o
  endpoint de cron em `src/routes/` — exigem migrar para TanStack **Start** / runtime de servidor).
- Relatórios (PDF/Excel) e administração (unidades, tipos, usuários, configurações).
- Fluxo de cadastro/reset por convite com token (substitui o signup direto da Fatia 1).

## Rodar localmente

```bash
bun install
cp .env.example .env   # já preenchido para o projeto SQ DocGuard
bun run dev            # http://localhost:5173
```

Scripts: `bun run build` (produção), `bun run typecheck`.

## Variáveis de ambiente

Públicas (cliente), em `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Segredos de servidor (Graph/service role) só entram na fatia de e-mail — nunca no `.env` público.

## Primeiro acesso

Cadastre-se com um e-mail `@sqquimica.com`. **O primeiro usuário vira administrador**
automaticamente e é vinculado à unidade "Matriz".
