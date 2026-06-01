import { createFileRoute } from "@tanstack/react-router";

// Autentica o chamador do cron via Supabase anon/publishable key no header
// `apikey` (padrão canônico do pg_cron) ou `Authorization: Bearer`. Sem chave
// válida o endpoint retorna 401, impedindo que terceiros disparem envios de
// e-mail em massa e corrompam o estado dos alertas.
function isAuthorized(request: Request): boolean {
  const expected =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!expected) return false;
  const provided =
    request.headers.get("apikey") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return provided === expected;
}

// Rota acionada por um agendador (cron) 1x/dia: POST /api/public/hooks/alertas-diarios
async function handle(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { processarAlertasDiarios } = await import("@/lib/email/processar.server");
    const result = await processarAlertasDiarios();
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[alertas-diarios] erro:", e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/hooks/alertas-diarios")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});
