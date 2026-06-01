---
name: doccontrol-generator
description: "Gera o pacote inicial completo de uma plataforma interna de controle de documentação regulatória com alertas de vencimento (licenças, alvarás, apólices, certificados, CRLV/ANTT/CNH, AVCB) — arquitetura TanStack Start + Supabase + Microsoft Graph: prompt do Lovable, migrations SQL (dados, RLS, triggers), integração Graph (processador diário que agrupa alertas por usuário) e checklist de TI (Entra/Exchange). Use SEMPRE que quiser criar, montar, recriar ou clonar uma plataforma/sistema/portal INTERNO que guarde documentos e avise antes do vencimento — inclusive quando só descrever a dor ('perco prazo de licença/alvará e tomo multa'), informar o domínio de e-mail da empresa, ou pedir 'starter do DocControl'. Dispara sem citar 'Lovable'/'skill'. NÃO use para: organizar arquivos, resumir/extrair UM documento, montar só planilha, repositório/DMS sem controle de vencimento, gestão de contratos/assinatura eletrônica, dúvidas de legislação, ou e-mail/SharePoint genérico sem alertas."
---

# DocControl Generator

Gera o **pacote de partida** de uma plataforma de controle de documentação regulatória, fiel à arquitetura de referência (TanStack Start + Supabase + Microsoft Graph), parametrizada para um novo contexto (empresa, domínio de e-mail, tipos de documento, intervalos de alerta, marca).

## O que esta skill produz e o que NÃO faz

**Produz** (em `/mnt/user-data/outputs/<slug>/`): o prompt inicial do Lovable, as migrations SQL (modelo de dados + funções + triggers + RLS + storage), os arquivos do Microsoft Graph (`graph.server.ts`, `processar.server.ts`, `templates.server.ts`, rota de cron) e o checklist de TI (Entra/Exchange) + um runbook de próximos passos.

**Não faz**: construir/hospedar o app rodando. O Cowork gera os insumos; a montagem acontece no Lovable (frontend + deploy), no Supabase (banco/auth/storage) e no Microsoft Entra (credenciais Graph). Deixe isso claro ao usuário ao entregar.

## Visão da arquitetura (leia antes de gerar)

Antes de gerar qualquer artefato, leia `references/arquitetura.md`. Ele resume o modelo de dados, as funções/triggers do banco, a integração Graph e os fluxos de autenticação — para que qualquer ajuste manual permaneça fiel ao padrão. Não pule esta leitura: as decisões de projeto (lógica no banco via `security definer` + RLS, versionamento imutável, alertas idempotentes, resumo diário agrupado) são o que torna a plataforma robusta, e precisam ser preservadas.

## Passo 1 — Coletar os parâmetros do novo projeto

Reúna os valores abaixo. Em conversa, pergunte de forma objetiva (use o seletor interativo quando disponível, agrupando perguntas); se o usuário já forneceu algo no contexto, aproveite e só confirme o que falta. Cada parâmetro tem um padrão sensato — ofereça-o quando o usuário não tiver preferência.

| Parâmetro | Chave | Padrão | Observação |
|---|---|---|---|
| Nome da plataforma | `nome_app` | `DocControl` | Aparece no cabeçalho dos e-mails e no app |
| Slug (pasta de saída) | `slug` | derivado do nome | minúsculas, hífens, sem acento |
| Domínio de e-mail permitido | `dominio_email` | (obrigatório) | só este domínio pode se cadastrar (ex.: `empresa.com.br`), sem o `@` |
| Tipos de documento | `tipos_documento` | ver lista padrão abaixo | cada item: nome + se exige órgão emissor |
| Intervalos de alerta (dias) | `dias_alerta` | `[45, 30, 15, 7, 0]` | `0` = no dia do vencimento |
| Nome da unidade padrão | `unidade_padrao` | `Matriz` | primeira unidade criada; novos usuários são vinculados a ela |
| CC fixo (opcional) | `cc_fixo` | `[]` | e-mails que recebem cópia de todo resumo (ex.: um gestor central) |
| Cor principal (hex) | `cor_principal` | `#ea580c` | identidade visual dos e-mails |

Lista padrão de `tipos_documento` (use se o usuário não especificar; confirme/edite com ele):
- Licença Ambiental — exige órgão emissor: sim
- Alvará de Bombeiros (AVCB) — sim
- Cartão CNPJ — não
- Validade de Extintores — não
- Apólice de Seguro — não (emitida por seguradora — não há órgão público emissor)
- Certificado Digital — sim

**Como classificar `exige_orgao_emissor`** (inclusive para tipos informados pelo usuário): use `true` apenas quando um **órgão público/regulador** emite o documento — ex.: Detran (CRLV, CNH), ANTT, órgão ambiental/IBAMA (Licença Ambiental), Corpo de Bombeiros (AVCB), ANVISA (Licença Sanitária, BPF), Prefeitura (Alvará). Use `false` para documentos **sem órgão público emissor**: apólices de seguro (emitidas por seguradora — ex.: RCTR-C, RCF-V), certificados/laudos internos, contratos. Na dúvida, `false`.

**Presets por setor** — quando o usuário NÃO listar os tipos, escolha o preset pelo ramo da empresa (e confirme); só caia na lista genérica acima se nenhum setor se aplicar:

| Setor | Tipos sugeridos (exige_orgao_emissor) |
|---|---|
| Transportadora / logística | CRLV (sim), ANTT (sim), CNH dos motoristas (sim), Licença Ambiental (sim), RCTR-C — apólice (não) |
| Farmacêutico / saúde | Licença ANVISA (sim), Alvará Sanitário (sim), AVCB (sim), Certificado de BPF (sim), Licença Ambiental (sim) |
| Engenharia / construção | Alvará de Funcionamento (sim), Licença de Operação / Ambiental (sim), AVCB (sim), ART/RRT (sim), Apólice de Seguro (não) |
| Indústria química | Licença de Operação Ambiental (sim), AVCB (sim), Licenças de produtos controlados — PF/Exército (sim), Apólice (não), Certificado Digital (sim) |

## Passo 2 — Gerar os artefatos

Escreva os parâmetros coletados em um arquivo JSON (ex.: `/tmp/params.json`) com exatamente estas chaves:

```json
{
  "nome_app": "DocControl",
  "slug": "doccontrol-acme",
  "dominio_email": "empresa.com.br",
  "tipos_documento": [
    {"nome": "Licença Ambiental", "exige_orgao_emissor": true},
    {"nome": "Cartão CNPJ", "exige_orgao_emissor": false}
  ],
  "dias_alerta": [45, 30, 15, 7, 0],
  "unidade_padrao": "Matriz",
  "cc_fixo": [],
  "cor_principal": "#ea580c"
}
```

Rode o gerador (ele encontra os assets pela própria localização e preenche todos os placeholders):

```bash
python3 /caminho/para/doccontrol-generator/scripts/gerar_projeto.py \
  --params /tmp/params.json \
  --out /mnt/user-data/outputs/<slug>
```

> Se preferir não usar o script (ou ele falhar), os arquivos em `assets/` são legíveis e contêm placeholders no formato `{{CHAVE}}`. Nesse caso, copie-os para a saída e substitua manualmente conforme o "Mapa de substituição" abaixo. O script é o caminho recomendado por ser determinístico.

### Mapa de substituição (referência)

O gerador troca, em todos os assets, os marcadores abaixo:

- `{{NOME_APP}}` → `nome_app`
- `{{DOMINIO_EMAIL}}` → `dominio_email` (sem `@`)
- `{{DIAS_ALERTA_JSON}}` → `dias_alerta` como JSON (ex.: `[45,30,15,7,0]`)
- `{{UNIDADE_PADRAO}}` → `unidade_padrao`
- `{{COR_PRINCIPAL}}` → `cor_principal`
- `{{CC_FIXO_JS}}` → `cc_fixo` como literal de array JS (ex.: `["gestor@empresa.com"]` ou `[]`)
- `{{TIPOS_DOCUMENTO_SQL}}` → linhas `('Nome', true|false)` separadas por vírgula, geradas a partir de `tipos_documento`

## Passo 3 — Entregar e orientar próximos passos

Use `present_files` para entregar a pasta gerada (apresente primeiro o prompt do Lovable). Em seguida, resuma o **runbook de montagem** (o detalhe completo está no checklist de TI gerado):

1. **Lovable**: criar o projeto colando o prompt gerado; pedir entrega incremental (banco + auth → documentos/versões → alertas in-app → e-mail Graph).
2. **Supabase**: aplicar as migrations na ordem `01_schema.sql` depois `02_seed.sql`; confirmar o bucket privado `documentos`.
3. **Microsoft Entra** (TI): App Registration com permissão de aplicação **Mail.Send** (consentida), gerar tenant/client/secret; criar a caixa remetente (compartilhada, sem licença); recomendado restringir o envio à caixa via Application Access Policy.
4. **Secrets** (no Lovable/hospedagem): `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_SENDER`, além de `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`. Nunca expor o secret em chat/código.
5. **Cron diário**: agendar uma chamada `POST` em `/api/public/hooks/alertas-diarios` 1×/dia.
6. **Validação**: disparar um e-mail de teste para um endereço próprio antes de confiar nos alertas.

Pontos de atenção a reforçar: o **primeiro usuário** que se cadastrar vira admin automaticamente; o cadastro é restrito ao `dominio_email` configurado; e a restrição da caixa (Application Access Policy) deve ser feita antes de considerar produção, porque a permissão Mail.Send é ampla por padrão.

## Estrutura da skill

```
doccontrol-generator/
├── SKILL.md
├── references/
│   └── arquitetura.md          ← leia no Passo 0; modelo de dados, funções, fluxos
├── assets/
│   ├── prompt-lovable.md        ← prompt inicial do Lovable (template)
│   ├── checklist-ti.md          ← checklist Entra/Exchange + runbook (template)
│   ├── migrations/
│   │   ├── 01_schema.sql        ← enums, tabelas, funções, triggers, RLS, storage
│   │   └── 02_seed.sql          ← tipos de documento, unidade padrão, config de alertas
│   └── graph/
│       ├── graph.server.ts                    ← helper sendGraphMail (app-only + cache de token)
│       ├── processar.server.ts                ← processador diário (agrupa + dedup + log)
│       ├── templates.server.ts                ← templates HTML (alertas + auth)
│       └── api.public.hooks.alertas-diarios.ts← endpoint de cron
└── scripts/
    └── gerar_projeto.py         ← preenche os placeholders e escreve a pasta de saída
```
