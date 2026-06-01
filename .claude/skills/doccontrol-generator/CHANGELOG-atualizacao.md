# doccontrol-generator — atualização (base: SQ DocGuard, 31/05/2026)

Sincroniza os assets da skill com as mudanças feitas no código do Lovable.

## 1. Segurança — endpoint de cron (CRÍTICO)
`assets/graph/api.public.hooks.alertas-diarios.ts`: adicionado `isAuthorized()`.
O endpoint passa a exigir a chave anon/publishable do Supabase no header
`apikey` (ou `Authorization: Bearer`) e retorna **401** sem ela — impede que
terceiros disparem envios de e-mail em massa e corrompam o estado dos alertas.

## 2. Schema — nova tabela `convite_unidades`
`assets/migrations/01_schema.sql`: tabela N:N convite→unidade, para o admin
definir o escopo de acesso de um convite antes do aceite. Sem RLS (só service_role).

## 3. Schema — colunas em `convites_cadastro`
Adicionados `criado_por uuid` e `role public.app_role`; `nome` agora é opcional.
Habilita convites emitidos por admin já com papel e unidades pré-atribuídos.

## 4. Schema — RLS endurecida
- `user_roles` SELECT: de `USING (true)` para "próprio papel ou admin".
- `log_atividades` INSERT: passa a exigir `user_id = auth.uid()`.

## 5. `processar.server.ts` — fallback de `APP_URL`
Sem `APP_URL`, usa `https://project--${VITE_SUPABASE_PROJECT_ID}.lovable.app`
(antes caía em string vazia, gerando links quebrados nos e-mails).

## Docs atualizados
- `prompt-lovable.md`: `convite_unidades` incluída na lista de tabelas.
- `checklist-ti.md`: cron passa a enviar header `apikey`; novo segredo na tabela.
- `references/arquitetura.md`: convites por admin (role+unidades), endpoint protegido, env var do cron.

## Validação
Gerador `scripts/gerar_projeto.py` executado com params de teste: 0 placeholders
remanescentes na saída e todos os novos trechos presentes.
