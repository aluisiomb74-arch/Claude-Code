# SQ DocGuard — Ponto de retomada

Última sessão: 2026-06-01. Tudo abaixo já está commitado/enviado na branch
`claude/serene-fermi-mljjT` (PR #1).

## Onde paramos (pronto e funcional)

- **Frontend** (React 19 + TanStack Router + Vite + Tailwind): login/cadastro,
  dashboard, documentos (lista/cadastro/detalhe + upload de versões), alertas in-app,
  relatórios PDF/Excel, administração (unidades, tipos, config, papéis). Typecheck e
  build limpos.
- **Backend Supabase** (projeto `ehqvmxdduvzsdcvyslml`): migrations 01–05 aplicadas
  (14 tabelas + RLS + seed + hardening). Advisors saneados (restam itens intencionais).
- **Pipeline de e-mail**: Edge Function `processar-alertas` (ACTIVE) + pg_cron diário
  (08:00 BRT). Testado: 200 com segredo correto, 401 sem. Detalhes em `PIPELINE.md`.
- **Deploy**: Dockerfile + nginx + `DEPLOY.md` (Easypanel/Hostinger). Ver `DEPLOY.md`.
- **CI**: `.github/workflows/ci.yml` (typecheck + build). Sessão inscrita no PR #1.

## Próximos passos (a decidir)

1. **Publicar no Easypanel** seguindo `DEPLOY.md` para obter URL pública de teste.
   Depois, atualizar o secret `APP_URL` da Edge Function.
2. **Secrets do Graph** (TI) para o e-mail entrar em produção: `MS_GRAPH_TENANT_ID`,
   `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_SENDER`, `APP_URL`.
   Pré-requisito: App Registration no Entra com Mail.Send. Ver `checklist-ti.md`.
3. **Primeiro acesso**: cadastrar-se com e-mail `@sqquimica.com` (vira admin).
4. **Fatias opcionais**: convite/reset por token; edição/exclusão de documentos;
   vínculos usuário↔unidade no admin; trilha de auditoria (`log_atividades`).

## Lembretes do ambiente

- Container efêmero: só persiste o que está no git. Branch de trabalho:
  `claude/serene-fermi-mljjT`.
- `localhost:5173` só funciona rodando `bun run dev` na própria máquina; no fluxo
  remoto, usar o deploy (URL pública).
