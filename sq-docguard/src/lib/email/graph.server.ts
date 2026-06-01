// Helper para envio de e-mails via Microsoft Graph API (app-only).
// NUNCA importar este arquivo do código cliente (sufixo .server.ts garante isso).

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now + 60_000) return cache.token;

  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
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
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MS Graph token error ${res.status}: ${txt}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return cache.token;
}

export interface SendGraphMailParams {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string[];
}

export async function sendGraphMail(params: SendGraphMailParams): Promise<void> {
  const sender = process.env.MS_GRAPH_SENDER;
  if (!sender) throw new Error("MS_GRAPH_SENDER não configurado");

  const token = await getAccessToken();
  const toList = Array.isArray(params.to) ? params.to : [params.to];

  const message = {
    message: {
      subject: params.subject,
      body: { contentType: "HTML", content: params.html },
      toRecipients: toList.map((address) => ({ emailAddress: { address } })),
      ccRecipients: (params.cc ?? []).map((address) => ({ emailAddress: { address } })),
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

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MS Graph sendMail error ${res.status}: ${txt}`);
  }
}
