# Blueprint de Recriação — Plataforma de Controle de Documentação (SQ DocGuard)

Documento de referência técnica para **recriar esta plataforma do zero** em outro projeto (Lovable ou qualquer stack equivalente). Descreve a arquitetura, o modelo de dados, os fluxos e as decisões de projeto — sem expor segredos.

---

## 1. O que a plataforma faz (resumo funcional)

Repositório central de documentos com validade (licenças, alvarás, apólices, extintores, certificados). Cada documento tem versões com arquivo anexo; o sistema calcula o status por cor e dispara, todo dia, e-mails de aviso de vencimento para os responsáveis. Acesso por perfis (admin/gestor/visualizador), segmentado por unidade, com trilha de auditoria e relatórios exportáveis.

---

## 2. Stack tecnológica

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | **TanStack Start** (React 19 + TanStack Router) | App full-stack com rotas de servidor; gerado pelo Lovable |
| Build | Vite 7 + Bun | — |
| UI | Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react | Componentes em `src/components/ui` |
| Gráficos | Recharts | Dashboard |
| Formulários | react-hook-form + Zod | Validação de schemas |
| Datas | date-fns (locale ptBR) | Formato DD/MM/AAAA |
| Exportação | jspdf + jspdf-autotable + xlsx (SheetJS) | Relatórios PDF/Excel |
| Backend/DB | **Supabase** (PostgreSQL + Auth + Storage) | RLS em todas as tabelas |
| E-mail | **Microsoft Graph API** (app-only) | Sem SMTP/DNS próprio |

Princípio-chave de segurança no código: arquivos com sufixo **`.server.ts`** nunca são empacotados para o cliente — segredos (Graph, service role) vivem só ali. Variáveis públicas usam prefixo `VITE_`.

---

## 3. Modelo de dados (PostgreSQL / Supabase)

### Enums
- `app_role`: `admin` | `gestor` | `visualizador`
- `documento_status`: `vigente` | `vencendo` | `vencido` | `sem_validade`
- `alerta_canal`: `in_app` | `email` | `teams`

### Tabelas

**profiles** — espelho de `auth.users`. Campos: `id` (FK auth.users), `nome`, `email`, timestamps. Criada automaticamente por trigger no cadastro.

**user_roles** — papel de cada usuário. `user_id`, `role` (enum), único por (user_id, role). Modelo separado de papéis (não guardar role no profile) por segurança — é o padrão recomendado do Supabase.

**unidades** — filiais/CNPJs. `nome`, `cnpj`, `cidade`, `estado`, `criado_por`.

**unidade_usuarios** — quais usuários acessam quais unidades (N:N). Base da segmentação de acesso.

**tipos_documento** — catálogo. `nome` (único), `exige_orgao_emissor` (bool).

**documentos** — registro principal. Campos relevantes: `titulo`, `tipo_documento_id`, `unidade_id`, `numero_documento`, `orgao_emissor`, `data_emissao`, `data_vencimento`, `sem_validade` (bool), `responsavel_id` (FK auth.users), `responsavel_nome`, `responsavel_email` (responsável externo opcional), `observacoes`, `versao_atual` (int), `criado_por`, timestamps. Índices em `unidade_id` e `data_vencimento`.

**versoes_documento** — histórico imutável. `documento_id`, `numero_versao` (único por documento), `arquivo_path`, `arquivo_nome`, `data_emissao`, `data_vencimento`, `comentario`, `enviado_por`, `enviado_em`. Nenhuma versão é apagada.

**configuracoes** — chave/valor JSONB. Guarda `alertas_dias_antecedencia` (ex.: `[45,30,15,7,0]`), editável pelo admin.

**alertas** — um registro por (documento, usuário, dias_antecedencia, canal). Campos: `data_alerta` (= vencimento − dias), `canal`, `lido`/`lido_em`, `enviado`/`enviado_em`. Único por (documento_id, user_id, dias_antecedencia, canal) — evita duplicar.

**email_envios** — log de auditoria de e-mails. `destinatario`, `assunto`, `status` (`enviado`/`erro`), `erro`, `enviado_em`. Para retentativa e auditoria.

**log_atividades** — trilha geral. `user_id`, `acao`, `entidade`, `entidade_id`, `detalhe` (jsonb), `data_hora`.

**convites_cadastro** e **convites_reset_senha** — fluxo próprio de cadastro/reset por token (ver seção 6). `email`, `token_hash` (SHA-256), `expira_em`, `usado_em`. Sem políticas RLS: acessíveis só pelo service_role. Em convites emitidos pelo admin, `convites_cadastro` também guarda `criado_por` e o `role` pré-atribuído (e `nome` é opcional).

**convite_unidades** — unidades concedidas por um convite pendente (N:N convite→unidade). Permite ao admin definir, antes do aceite, a quais unidades o novo usuário terá acesso. Sem políticas RLS: só service_role.

---

## 4. Lógica de negócio no banco (funções e triggers)

A inteligência do sistema fica em funções PostgreSQL `security definer`, não só no frontend — isso garante consistência independentemente de quem grava.

- **`calcular_status_documento(data_vencimento, sem_validade)`** — retorna o enum de status: sem validade → `sem_validade`; vencido (< hoje) → `vencido`; ≤ 30 dias → `vencendo`; senão `vigente`.
- **`has_role` / `current_user_is_admin`** — checagem de papel, usadas nas políticas RLS.
- **`user_pode_acessar_unidade` / `user_pode_editar_unidade`** — admin acessa tudo; gestor edita só unidades vinculadas; demais só leem o vinculado.
- **`atualizar_documento_nova_versao`** (trigger AFTER INSERT em `versoes_documento`) — ao subir versão, atualiza `versao_atual`, datas e `atualizado_em` no documento. A versão nova vira a vigente automaticamente.
- **`regerar_alertas_documento`** (+ trigger em `documentos`) — sempre que muda vencimento/sem_validade/responsável/unidade, recria os alertas in-app para responsável + admins + gestores da unidade, conforme os dias configurados. Documentos sem validade não geram alerta.
- **`handle_new_user`** (trigger em `auth.users`) — cria o profile, dá `admin` ao **primeiro** usuário do sistema e `visualizador` aos demais, e vincula à unidade padrão.
- **`validar_dominio_email`** (trigger em `auth.users`) — bloqueia cadastro fora do domínio corporativo (`@sqquimica.com`). **Para reuso: troque o domínio.**
- **`validar_responsavel_email`** — valida formato do e-mail do responsável externo.

Segurança: **RLS ativado em todas as tabelas**, com políticas por perfil. Storage tem bucket privado `documentos` com convenção de path `{unidade_id}/{documento_id}/{versao}-{arquivo}` e políticas que espelham o acesso por unidade.

---

## 5. Integração de e-mail (Microsoft Graph) — o núcleo dos alertas

Três peças, todas server-side:

**`graph.server.ts` — o helper `sendGraphMail()`**
- Obtém token via *client credentials*: POST em `login.microsoftonline.com/{TENANT}/oauth2/v2.0/token`, scope `https://graph.microsoft.com/.default`.
- **Cacheia o token em memória** até ~1 min antes de expirar (evita pedir token a cada e-mail).
- Envia via POST em `graph.microsoft.com/v1.0/users/{SENDER}/sendMail` com corpo HTML, suportando `to` e `cc`.
- Lê credenciais de `process.env` (nunca hardcoded): `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_SENDER`.

**`processar.server.ts` — o processador diário**
- Usa o **service role** do Supabase (ignora RLS, roda sem usuário logado).
- Busca alertas com `data_alerta <= hoje`, `enviado=false`, `lido=false`.
- **Agrupa por usuário** e faz **dedup por documento** (mantém o alerta mais urgente — menor `dias_antecedencia`), de modo que cada pessoa recebe **um resumo** em vez de vários e-mails.
- Monta CC (fixo + responsáveis externos dos documentos do resumo, sem duplicar o destinatário).
- Envia via `sendGraphMail`, marca os alertas como `enviado` e grava em `email_envios` (sucesso ou erro). Em caso de falha, **não** marca como enviado → retenta no próximo ciclo.

**`api.public.hooks.alertas-diarios.ts` — o endpoint de cron**
- Rota `POST/GET /api/public/hooks/alertas-diarios` que chama o processador.
- **Protegida**: exige a chave anon/publishable do Supabase no header `apikey` (ou `Authorization: Bearer`); sem chave válida retorna **401**. Evita que terceiros disparem envios em massa e corrompam o estado dos alertas.
- Acionada por um **agendador diário** (cron) — no Lovable/hosting, configurar um job que bate nessa URL 1×/dia com o header de autenticação.

**`templates.server.ts`** — templates HTML (resumo diário, documento vencendo/vencido, e — no fluxo de auth — confirmação de cadastro e reset de senha), todos com a identidade visual da plataforma.

---

## 6. Autenticação e fluxo de cadastro (decisão de projeto importante)

Em vez de usar os e-mails nativos do Supabase Auth, **todo o envio passa pelo Graph**, reaproveitando `sendGraphMail`. O cadastro e o reset de senha usam **tokens próprios**:

- **Cadastro:** usuário pede acesso → server valida domínio, gera token (32 bytes), grava `token_hash` (SHA-256) em `convites_cadastro` (expira em 24h) e envia link por Graph. Ao abrir o link, define a senha; o servidor cria o usuário já confirmado (`email_confirm:true`, via service role) — o clique no link já prova posse do e-mail.
- **Reset:** mesmo padrão com `convites_reset_senha`; resposta sempre neutra ("se o e-mail existir, enviamos um link") para não vazar quais e-mails existem.
- **Convite por admin:** o admin pode emitir convites já com o `role` e as unidades de acesso definidos (gravados em `convites_cadastro.role`/`criado_por` e `convite_unidades`); ao aceitar, o usuário entra com o papel e o escopo corretos.
- **Signups públicos desabilitados** — só o fluxo de convite cria usuários.

Segurança dos tokens: o token cru só existe no e-mail; no banco fica apenas o hash.

---

## 7. Telas (rotas)

Layout autenticado com sidebar fixa. Rotas:

- `index.tsx` — login / pedir acesso (público)
- `esqueci-senha`, `redefinir-senha`, `definir-senha` — fluxos de senha (público, por token)
- `_authenticated.dashboard` — KPIs, vencimentos próximos, gráficos por status/unidade
- `_authenticated.documentos.index` — listagem com busca e filtros
- `_authenticated.documentos.novo` — cadastro com upload
- `_authenticated.documentos.$id` — detalhe + histórico de versões + subir nova versão
- `_authenticated.alertas` — central de notificações in-app
- `_authenticated.relatorios` — exportação PDF/Excel
- `_authenticated.admin` — CRUD de unidades, tipos, usuários, configurações
- `_authenticated.ajuda` — ajuda

Utilitários de UI (`documentos-utils.ts`): `calcularStatus`, `diasRestantes`, `formatDate`, e o mapa de cores de status (verde/amarelo/vermelho/cinza) — espelham a função SQL para feedback imediato no cliente.

---

## 8. Variáveis de ambiente necessárias

**Públicas (prefixo VITE_, vão ao cliente):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

**Servidor (segredos, nunca expostas):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_SENDER`, `APP_URL`. O endpoint de cron lê ainda `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) para validar o header do agendador.

---

## 9. Pré-requisitos externos (fora do código)

1. **App Registration no Microsoft Entra** com permissão de aplicação **Mail.Send** (consentida pelo admin). Gera client/tenant/secret.
2. **Caixa de correio remetente** (idealmente compartilhada — sem licença) = `MS_GRAPH_SENDER`.
3. **(Recomendado) Application Access Policy** no Exchange Online restringindo o app a enviar só pela caixa remetente.
4. **Agendador (cron)** diário batendo em `/api/public/hooks/alertas-diarios`.
5. Projeto **Supabase** (banco, Auth, Storage com bucket privado `documentos`).

---

## 10. Roteiro de recriação para um NOVO projeto

1. Gerar app base no Lovable com TanStack Start + Supabase.
2. Rodar as migrations na ordem: enums/tabelas/funções/RLS → validação de domínio → seeds de tipos → storage policies → log de e-mail → campos de responsável → políticas de user_roles → ajuste de configurações/unidade padrão → tabelas de convite.
3. **Trocar o domínio** em `validar_dominio_email` e os tipos de documento no seed conforme o novo contexto.
4. Implementar `graph.server.ts`, `processar.server.ts`, `templates.server.ts` e o endpoint de cron.
5. Cadastrar os secrets (Supabase + Graph).
6. Configurar o cron diário.
7. Ajustar identidade visual (cores de status, logo).

---

## 11. Pontos fortes desta arquitetura (vale manter ao recriar)

- Lógica crítica no banco (status, alertas, permissões) via funções `security definer` + RLS — consistência e segurança independentes do frontend.
- Versionamento imutável com a versão vigente derivada por trigger.
- Alertas idempotentes (constraint de unicidade + flag `enviado`) — sem duplicação e com retentativa natural.
- Resumo diário agrupado por usuário com dedup — evita inundar a caixa de e-mail.
- E-mail 100% via Graph, dispensando DNS/SMTP próprios e reaproveitado também na autenticação.
- Separação rígida cliente/servidor via sufixo `.server.ts`.
