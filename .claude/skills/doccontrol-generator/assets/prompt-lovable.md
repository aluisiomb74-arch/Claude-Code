# Prompt para o Lovable — {{NOME_APP}}

> Cole o conteúdo abaixo (a partir de "VISÃO GERAL") no Lovable como primeira mensagem. Peça entrega incremental: primeiro banco + autenticação + dashboard + cadastro de documento; depois versões; depois alertas in-app; por fim e-mail via Microsoft Graph.

---

## VISÃO GERAL

Construa uma aplicação web completa, robusta e responsiva chamada **{{NOME_APP}}** para gestão e controle de documentação regulatória de uma empresa. O objetivo central é centralizar todos os documentos com prazo de validade, controlar suas versões e **avisar automaticamente quando a data de vencimento estiver se aproximando**, para que a equipe renove os documentos junto aos órgãos competentes antes de expirarem.

Prioridades, nesta ordem: **confiabilidade dos alertas de vencimento**, **facilidade de uso (interface intuitiva)**, **organização visual clara** e **segurança dos dados**.

## STACK TÉCNICA

- Frontend: React + TanStack Start + Tailwind CSS, com shadcn/ui; totalmente responsivo.
- Backend e banco: Supabase (PostgreSQL), com Row Level Security em todas as tabelas.
- Autenticação: Supabase Auth. Cadastro restrito ao domínio **@{{DOMINIO_EMAIL}}**. O envio de e-mails de cadastro e reset de senha usa o Microsoft Graph (mesmo remetente dos alertas), via fluxo próprio de convites por token — sem SMTP/DNS.
- Armazenamento: Supabase Storage, bucket privado `documentos` (path `{unidade_id}/{documento_id}/{versao}-{arquivo}`).
- Idioma: Português do Brasil. Datas em DD/MM/AAAA. Cor principal da identidade: {{COR_PRINCIPAL}}.

## PERFIS E PERMISSÕES

1. **Administrador** — acesso total; gerencia usuários, tipos, unidades e configurações. O primeiro usuário cadastrado é admin automaticamente.
2. **Gestor** — cadastra, edita e sobe versões dos documentos das unidades às quais tem acesso; recebe alertas.
3. **Visualizador** — apenas consulta e baixa arquivos.

Papéis ficam em tabela separada (`user_roles`), nunca no profile. Acesso a documentos é segmentado por unidade.

## MODELO DE DADOS

Use exatamente o schema fornecido nas migrations SQL deste projeto (tabelas: profiles, user_roles, unidades, unidade_usuarios, tipos_documento, documentos, versoes_documento, configuracoes, alertas, email_envios, log_atividades, convites_cadastro, convites_reset_senha, convite_unidades). Status do documento é calculado (Vigente/Vencendo/Vencido/Sem validade) a partir da data de vencimento.

## FUNCIONALIDADES

1. **Dashboard**: cartões de totais (Total, Vigentes, Vencendo em 30 dias, Vencidos), lista de vencimentos próximos com indicador colorido (verde/amarelo/vermelho), gráficos por status e por unidade, filtro por unidade.
2. **Cadastro de documentos**: formulário completo, seleção de tipo e unidade, upload (PDF/JPG/PNG), status automático; documentos sem validade não geram alerta.
3. **Controle de versões**: botão "Subir nova versão" cria nova versão (arquivo + datas), que passa a ser a vigente; histórico completo, imutável, com download de cada versão.
4. **Alertas de vencimento**: gerados automaticamente em {{DIAS_ALERTA_JSON}} dias antes do vencimento (0 = no dia). Central de notificações in-app (sino + contador). E-mail via Microsoft Graph (resumo diário agrupado por usuário) acionado por cron diário. Intervalos configuráveis pelo admin. Sem envios duplicados.
5. **Listagem e filtros**: busca por título/número; filtros por tipo, unidade, status e faixa de vencimento; ordenação por vencimento (padrão); cada linha mostra cor de status e dias restantes.
6. **Relatórios**: exportar a lista filtrada em Excel e PDF; relatório de vencidos/vencendo para auditoria.
7. **Administração**: CRUD de unidades, tipos de documento e usuários; configurações dos intervalos de alerta; visualização da trilha de auditoria.
8. **Segurança (LGPD)**: RLS por unidade/perfil; arquivos acessíveis só a autenticados; ações sensíveis registradas em log.

## EXPERIÊNCIA E DESIGN

Interface limpa e corporativa, navegação lateral fixa (Dashboard, Documentos, Alertas, Relatórios, Administração, Configurações). Linguagem simples. Código de cores verde/amarelo/vermelho consistente. Feedback visual (toasts, loaders) e estados vazios com instruções.

## ENTREGA INICIAL

Comece pelo banco, autenticação (login + cadastro restrito ao domínio), dashboard e cadastro de documento com upload e status automático. Depois implemente versões, então alertas in-app, e por fim o envio de e-mail via Microsoft Graph com cron diário.

Pré-cadastre os tipos de documento conforme o seed fornecido.
