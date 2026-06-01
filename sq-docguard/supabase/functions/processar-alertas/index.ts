// Supabase Edge Function (Deno) — processamento diário de alertas de vencimento.
// Porta a lógica de src/lib/email/{graph,processar,templates}.server.ts para o runtime Edge.
//
// Autenticação: header `x-cron-secret` deve bater com o segredo guardado em
// private.cron_config (chave='cron_secret'). Implantada com verify_jwt = false.
//
// Secrets necessários (definir no painel Supabase → Edge Functions → Secrets):
//   MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_SENDER
//   APP_URL (URL pública do app, para os links dos documentos)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ---------------------------------------------------------------------------
// Microsoft Graph (app-only) com cache de token em memória
// ---------------------------------------------------------------------------
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token;

  const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
  const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
  const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("MS Graph: credenciais não configuradas");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
  );
  if (!res.ok) throw new Error(`MS Graph token error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return tokenCache.token;
}

async function sendGraphMail(p: { to: string; cc?: string[]; subject: string; html: string }): Promise<void> {
  const sender = Deno.env.get("MS_GRAPH_SENDER");
  if (!sender) throw new Error("MS_GRAPH_SENDER não configurado");
  const token = await getAccessToken();

  const message = {
    message: {
      subject: p.subject,
      body: { contentType: "HTML", content: p.html },
      toRecipients: [{ emailAddress: { address: p.to } }],
      ccRecipients: (p.cc ?? []).map((address) => ({ emailAddress: { address } })),
    },
    saveToSentItems: true,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(message),
    },
  );
  if (!res.ok) throw new Error(`MS Graph sendMail error ${res.status}: ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Template de resumo diário
// ---------------------------------------------------------------------------
interface DocResumo {
  titulo: string;
  unidade: string;
  dataVencimento: string;
  diasAntecedencia: number;
  linkDocumento: string;
}

function templateResumoDiario(nome: string, docs: DocResumo[]): { subject: string; html: string } {
  const total = docs.length;
  const vencidos = docs.filter((d) => d.diasAntecedencia <= 0).length;
  const vencendo = total - vencidos;
  const subject =
    vencidos > 0
      ? `[SQ DocGuard] Resumo diário: ${vencidos} vencido(s) e ${vencendo} a vencer`
      : `[SQ DocGuard] Resumo diário: ${vencendo} documento(s) a vencer`;

  const linhas = docs
    .slice()
    .sort((a, b) => a.diasAntecedencia - b.diasAntecedencia)
    .map((d) => {
      const vencido = d.diasAntecedencia <= 0;
      const bg = vencido ? "#fef2f2" : "#fff7ed";
      const border = vencido ? "#fecaca" : "#fed7aa";
      const status = vencido
        ? `<span style="color:#b91c1c;font-weight:bold;">VENCIDO há ${Math.abs(d.diasAntecedencia)} dia(s)</span>`
        : `<span style="color:#c2410c;">Vence em ${d.diasAntecedencia} dia(s)</span>`;
      return `<tr><td style="padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:6px;">
        <div style="font-size:14px;font-weight:bold;color:#111827;margin-bottom:4px;">
          <a href="${d.linkDocumento}" style="color:#111827;text-decoration:none;">${d.titulo}</a></div>
        <div style="font-size:13px;color:#374151;">Unidade: ${d.unidade}</div>
        <div style="font-size:13px;color:#374151;">Vencimento: ${d.dataVencimento}</div>
        <div style="font-size:13px;margin-top:4px;">${status}</div>
      </td></tr><tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>`;
    })
    .join("");

  const cor = vencidos > 0 ? "#dc2626" : "#ea580c";
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <tr><td style="background:${cor};padding:20px 28px;color:#fff;font-size:18px;font-weight:bold;">SQ DocGuard</td></tr>
      <tr><td style="padding:28px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Resumo diário de documentos</h2>
        <p style="margin:0 0 12px;">Olá, <strong>${nome}</strong>.</p>
        <p style="margin:0 0 16px;">Você tem <strong>${total}</strong> documento(s) que requerem atenção:
          <span style="color:#b91c1c;">${vencidos} vencido(s)</span> e <span style="color:#c2410c;">${vencendo} a vencer</span>.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:8px;">${linhas}</table>
        <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">Acesse cada documento clicando no título.</p>
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;">
        E-mail automático do SQ DocGuard. Não responda a esta mensagem.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject, html };
}

function formatBR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Autenticação por segredo compartilhado: validado via RPC security-definer
  // (o segredo fica em private.cron_config, não exposto pela API).
  const recebido = req.headers.get("x-cron-secret") ?? "";
  const { data: autorizado } = await supabase.rpc("verificar_cron_secret", { _secret: recebido });
  if (autorizado !== true) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const appUrl = Deno.env.get("APP_URL") ?? "https://sq-docguard.local";

  const { data: alertas, error } = await supabase
    .from("alertas")
    .select(
      `id, dias_antecedencia, data_alerta, user_id, documento_id,
       documentos(id, titulo, data_vencimento, responsavel_email, unidades(nome))`,
    )
    .lte("data_alerta", today)
    .eq("enviado", false)
    .eq("lido", false)
    .eq("canal", "in_app")
    .limit(2000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!alertas || alertas.length === 0) {
    return new Response(JSON.stringify({ processados: 0, enviados: 0, erros: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // deno-lint-ignore no-explicit-any
  type Row = any;
  const porUsuario = new Map<string, Row[]>();
  for (const a of alertas as Row[]) {
    if (!a.documentos) continue;
    if (!porUsuario.has(a.user_id)) porUsuario.set(a.user_id, []);
    porUsuario.get(a.user_id)!.push(a);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome, email")
    .in("id", Array.from(porUsuario.keys()));
  const profileMap = new Map<string, { nome: string; email: string }>(
    (profiles ?? []).map((p: Row) => [p.id, p]),
  );

  const CC_FIXO: string[] = [];
  let enviados = 0;
  let erros = 0;

  for (const [userId, rows] of porUsuario.entries()) {
    const profile = profileMap.get(userId);
    if (!profile?.email) {
      await supabase
        .from("alertas")
        .update({ enviado: true, enviado_em: new Date().toISOString() })
        .in("id", rows.map((r) => r.id));
      continue;
    }

    // Dedup por documento: mantém o alerta mais urgente (menor dias_antecedencia)
    const porDoc = new Map<string, Row>();
    for (const r of rows) {
      const cur = porDoc.get(r.documento_id);
      if (!cur || r.dias_antecedencia < cur.dias_antecedencia) porDoc.set(r.documento_id, r);
    }

    const docs: DocResumo[] = Array.from(porDoc.values()).map((r) => ({
      titulo: r.documentos.titulo,
      unidade: r.documentos.unidades?.nome ?? "—",
      dataVencimento: r.documentos.data_vencimento ? formatBR(r.documentos.data_vencimento) : "—",
      diasAntecedencia: r.dias_antecedencia,
      linkDocumento: `${appUrl}/documentos/${r.documentos.id}`,
    }));

    const tpl = templateResumoDiario(profile.nome ?? profile.email, docs);

    const ccDinamicos = Array.from(
      new Set(
        Array.from(porDoc.values())
          .map((r) => r.documentos?.responsavel_email as string | null)
          .filter((e): e is string => !!e && e.toLowerCase() !== profile.email.toLowerCase()),
      ),
    );
    const cc = Array.from(new Set([...CC_FIXO, ...ccDinamicos]));

    try {
      await sendGraphMail({ to: profile.email, cc, subject: tpl.subject, html: tpl.html });
      await supabase
        .from("alertas")
        .update({ enviado: true, enviado_em: new Date().toISOString() })
        .in("id", rows.map((r) => r.id));
      await supabase.from("email_envios").insert({
        destinatario: profile.email,
        assunto: tpl.subject,
        status: "enviado",
      });
      enviados++;
    } catch (e) {
      erros++;
      await supabase.from("email_envios").insert({
        destinatario: profile.email,
        assunto: tpl.subject,
        status: "erro",
        erro: String(e instanceof Error ? e.message : e).slice(0, 1000),
      });
    }
  }

  return new Response(JSON.stringify({ processados: alertas.length, enviados, erros }), {
    headers: { "Content-Type": "application/json" },
  });
});
