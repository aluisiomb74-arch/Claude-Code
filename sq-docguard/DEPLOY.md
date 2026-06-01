# Deploy do SQ DocGuard (Easypanel / Hostinger via Docker)

O frontend é uma SPA estática (Vite) servida por Nginx. O backend (Supabase) já está
no ar — ver `PIPELINE.md`. Estes arquivos preparam a imagem:

- `Dockerfile` — build com Bun + serve com Nginx (multi-stage)
- `nginx.conf` — fallback de SPA e cache de assets
- `.dockerignore`

As variáveis `VITE_*` são **embutidas no build** (são públicas) com os valores do
projeto SQ DocGuard como padrão. Para apontar para outro Supabase, sobrescreva via
build-args.

## Opção A — Easypanel (recomendado)

1. **Create Service → App**.
2. **Source:** GitHub → repositório `aluisiomb74-arch/Claude-Code`, branch
   `claude/serene-fermi-mljjT` (ou a branch mesclada).
3. **Build:**
   - Método: **Dockerfile**
   - **Build context / Root:** `sq-docguard`
   - Dockerfile: `Dockerfile`
4. **(Opcional) Build args**, só se for trocar de backend:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
5. **Port:** `80` (HTTP).
6. **Domains:** associe um domínio/subdomínio (ex.: `docguard.suaempresa.com`).
   O Easypanel provê TLS automático.
7. **Deploy.** Ao concluir, acesse pela URL/domínio configurado.

## Opção B — Build e run manual (qualquer host com Docker)

```bash
cd sq-docguard
docker build -t sq-docguard .
docker run -d --name sq-docguard -p 8080:80 sq-docguard
# acesse http://SEU_HOST:8080
```

Trocando de backend no build:

```bash
docker build -t sq-docguard \
  --build-arg VITE_SUPABASE_URL=https://SEU.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
  --build-arg VITE_SUPABASE_PROJECT_ID=seu_ref .
```

## Pós-deploy

Atualize o secret `APP_URL` da Edge Function `processar-alertas` para a URL pública
(usada nos links dos e-mails de alerta). Ver `PIPELINE.md`.

## Importante

`localhost:5173` só funciona se o `bun run dev` estiver rodando na **mesma máquina**
do navegador. No fluxo de desenvolvimento na web/remoto, use o deploy acima para obter
uma URL pública acessível pelo navegador.
