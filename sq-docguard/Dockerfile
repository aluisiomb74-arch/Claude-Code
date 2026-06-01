# ---------- Estágio 1: build (Bun + Vite) ----------
FROM oven/bun:1.3 AS build
WORKDIR /app

# Variáveis públicas embutidas no bundle (override via --build-arg se necessário).
ARG VITE_SUPABASE_URL=https://ehqvmxdduvzsdcvyslml.supabase.co
ARG VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mz4_MPx6k7WrGuMf_yw2hA_7Zy9NSJt
ARG VITE_SUPABASE_PROJECT_ID=ehqvmxdduvzsdcvyslml

# Dependências (cache eficiente)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Código + build. Vite lê as variáveis VITE_ do .env gerado abaixo.
COPY . .
RUN printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\nVITE_SUPABASE_PROJECT_ID=%s\n' \
      "$VITE_SUPABASE_URL" "$VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_PROJECT_ID" > .env \
    && bun run build

# ---------- Estágio 2: runtime (Nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
