# SQ DocGuard

Plataforma interna de controle de documentação regulatória com alertas de vencimento.
Stack: **React 19 + TanStack Router + Vite + Supabase** (Tailwind CSS 4).

## Estado atual

Implementado e funcional:

- **Autenticação** Supabase (login + cadastro). Restrição de domínio `@sqquimica.com` e
  atribuição de papel (1º usuário = admin) são garantidas por triggers no banco.
- **Dashboard** com KPIs por status e lista de próximos vencimentos (45 dias).
- **Documentos**: listagem com busca, cadastro e tela de detalhe com **histórico de
  versões** e **upload ao Storage** (bucket privado `documentos`).
- **Alertas** in-app: central de notificações com marcar lido/todos e filtros.
- **Relatórios**: exportação PDF e Excel (libs carregadas sob demanda).
- **Administração** (admin): unidades, tipos de documento, configuração de dias de
  alerta e papéis de usuário.
- Status calculado no cliente espelhando a função SQL `calcular_status_documento`.

Backend (Supabase) provisionado e endurecido: 14 tabelas com RLS, funções
`security definer`, triggers de alerta/versão, bucket privado, seed.

**Pipeline de e-mail implantado** (ver `PIPELINE.md`): a integração Microsoft Graph
foi portada para uma **Supabase Edge Function** (`processar-alertas`) agendada via
**pg_cron** (diário). Falta apenas a TI cadastrar os secrets do Graph para o envio
entrar em produção. Os arquivos originais TanStack Start ficam em
`src/lib/email/*.server.ts` como referência.

### Próximas fatias (opcionais)

- Fluxo de cadastro/reset por convite com token (substitui o signup direto), também
  via Edge Function + Graph.
- Edição/exclusão de documentos e gestão de vínculos usuário↔unidade na tela de admin.
- Trilha de auditoria (`log_atividades`) exibida no admin.

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
