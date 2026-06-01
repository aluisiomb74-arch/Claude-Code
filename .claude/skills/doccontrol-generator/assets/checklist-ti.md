# Checklist de TI — Envio de e-mail via Microsoft Graph ({{NOME_APP}})

**Para:** Equipe de TI / Administrador do Microsoft 365.
**Objetivo:** Habilitar o envio automático de e-mails da plataforma {{NOME_APP}} (alertas de vencimento + e-mails de cadastro/reset) usando o Microsoft Graph, a partir do domínio corporativo, sem SMTP nem DNS.

---

## Parte A — App Registration no Entra (Mail.Send)

1. **entra.microsoft.com** → Identidade → Aplicações → **Registos de aplicações** → **Novo registo**.
2. Nome: `{{NOME_APP}} - Alertas`. Tipo: **single tenant**. Sem Redirect URI.
3. **Certificados e segredos** → Novo segredo do cliente → validade 24 meses → copiar o **Valor** (aparece uma vez) = `MS_GRAPH_CLIENT_SECRET`.
4. **Permissões de API** → Adicionar → Microsoft Graph → **Permissões de aplicação** → **Mail.Send** → Adicionar → **Conceder consentimento de administrador** (status deve ficar com ✓ verde).
5. **Descrição geral**: copiar **Application (client) ID** = `MS_GRAPH_CLIENT_ID` e **Directory (tenant) ID** = `MS_GRAPH_TENANT_ID`.

## Parte B — Caixa remetente

Criar uma **caixa de correio compartilhada** (sem licença) que será o remetente: `MS_GRAPH_SENDER` (ex.: `notificacoes@{{DOMINIO_EMAIL}}`).
Caminho: **admin.microsoft.com** → Equipas e grupos → Caixas de correio partilhadas → Adicionar. Não é preciso adicionar membros nem fazer login nela.

## Parte C — Restringir o envio à caixa (recomendado, antes de produção)

Por padrão, Mail.Send (aplicação) permite enviar como **qualquer** caixa do tenant. Restrinja o app à caixa remetente via **Application Access Policy** no Exchange Online (PowerShell): criar um grupo de segurança com correio contendo só a caixa remetente e aplicar `New-ApplicationAccessPolicy ... -AccessRight RestrictAccess` para o `MS_GRAPH_CLIENT_ID`. Validar com `Test-ApplicationAccessPolicy` (a policy pode levar até 1h para propagar).

---

## Segredos a cadastrar na plataforma (Lovable/hospedagem)

| Segredo | Origem |
|---|---|
| `MS_GRAPH_TENANT_ID` | Parte A (Directory/tenant ID) |
| `MS_GRAPH_CLIENT_ID` | Parte A (Application/client ID) |
| `MS_GRAPH_CLIENT_SECRET` | Parte A (Valor do segredo) |
| `MS_GRAPH_SENDER` | Parte B (caixa remetente) |
| `SUPABASE_URL` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (secret — só servidor) |
| `APP_URL` | URL pública da aplicação |
| `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) | Supabase — usada pelo cron para autenticar no endpoint de alertas |

O `MS_GRAPH_CLIENT_SECRET` e o `SUPABASE_SERVICE_ROLE_KEY` nunca devem ser colados em chat ou commitados no código.

---

## Runbook de montagem (ordem)

1. **Supabase**: aplicar `01_schema.sql`, depois `02_seed.sql`. Confirmar o bucket privado `documentos`.
2. **Lovable**: criar o projeto colando o prompt gerado; implementar os arquivos do Graph (`graph.server.ts`, `processar.server.ts`, `templates.server.ts`, rota de cron) em `src/lib/email/` e `src/routes/`.
3. **Entra/Exchange**: Partes A–C acima.
4. **Secrets**: cadastrar os valores da tabela.
5. **Cron**: agendar `POST https://<app>/api/public/hooks/alertas-diarios` 1×/dia, enviando o header `apikey: <SUPABASE_PUBLISHABLE_KEY>` (ou `Authorization: Bearer <chave>`). Sem o header válido o endpoint responde **401** — isso impede que terceiros disparem os e-mails.
6. **Teste**: disparar um e-mail de teste para um endereço próprio; conferir inbox e spam (primeiro envio de remetente novo pode cair em lixo).

## Lembretes

- O **primeiro usuário** cadastrado vira admin.
- Cadastro é restrito ao domínio **@{{DOMINIO_EMAIL}}** (ajustável no schema).
- Documentos marcados "sem validade" não geram alertas.
