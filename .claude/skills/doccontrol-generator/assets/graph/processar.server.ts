import { createClient } from "@supabase/supabase-js";
import { sendGraphMail } from "@/lib/email/graph.server";
import { templateResumoDiario } from "@/lib/email/templates.server";

// E-mails que recebem cópia (CC) de TODOS os resumos diários. Pode ser [].
const CC_FIXO: string[] = {{CC_FIXO_JS}};

function formatBR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export async function processarAlertasDiarios(): Promise<{
  processados: number;
  enviados: number;
  erros: number;
}> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const today = new Date().toISOString().slice(0, 10);
  const appUrl =
    process.env.APP_URL ??
    `https://project--${process.env.VITE_SUPABASE_PROJECT_ID ?? ""}.lovable.app`;

  const { data: alertas, error } = await supabase
    .from("alertas")
    .select(
      `id, dias_antecedencia, data_alerta, user_id, documento_id,
       documentos(id, titulo, data_vencimento, responsavel_email, responsavel_nome, unidades(nome))`,
    )
    .lte("data_alerta", today)
    .eq("enviado", false)
    .eq("lido", false)
    .limit(2000);

  if (error) throw new Error(error.message);
  if (!alertas || alertas.length === 0) {
    return { processados: 0, enviados: 0, erros: 0 };
  }

  // Agrupa por usuário
  type AlertaRow = (typeof alertas)[number] & { documentos: any };
  const porUsuario = new Map<string, AlertaRow[]>();
  for (const a of alertas as AlertaRow[]) {
    if (!a.documentos) continue;
    if (!porUsuario.has(a.user_id)) porUsuario.set(a.user_id, []);
    porUsuario.get(a.user_id)!.push(a);
  }

  const userIds = Array.from(porUsuario.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome, email")
    .in("id", userIds);
  const profileMap = new Map<string, { id: string; nome: string; email: string }>(
    (profiles ?? []).map((p: any) => [p.id, p]),
  );

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
    const porDoc = new Map<string, AlertaRow>();
    for (const r of rows) {
      const cur = porDoc.get(r.documento_id);
      if (!cur || r.dias_antecedencia < cur.dias_antecedencia) porDoc.set(r.documento_id, r);
    }

    const documentos = Array.from(porDoc.values()).map((r) => ({
      titulo: r.documentos.titulo as string,
      unidade: (r.documentos.unidades?.nome ?? "—") as string,
      dataVencimento: r.documentos.data_vencimento ? formatBR(r.documentos.data_vencimento) : "—",
      diasAntecedencia: r.dias_antecedencia,
      linkDocumento: `${appUrl}/documentos/${r.documentos.id}`,
    }));

    const tpl = templateResumoDiario({
      nomeDestinatario: profile.nome ?? profile.email,
      documentos,
    });

    // CC: fixo + responsáveis externos dos documentos deste resumo (sem o destinatário e sem duplicados)
    const ccDinamicos = Array.from(
      new Set(
        Array.from(porDoc.values())
          .map((r) => (r.documentos?.responsavel_email as string | null) ?? null)
          .filter((e): e is string => !!e && e.toLowerCase() !== profile.email.toLowerCase()),
      ),
    );
    const ccFinal = Array.from(new Set([...CC_FIXO, ...ccDinamicos]));

    try {
      await sendGraphMail({ to: profile.email, cc: ccFinal, subject: tpl.subject, html: tpl.html });

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
    } catch (e: any) {
      erros++;
      // Não marca como enviado → retenta no próximo ciclo
      await supabase.from("email_envios").insert({
        destinatario: profile.email,
        assunto: tpl.subject,
        status: "erro",
        erro: String(e?.message ?? e).slice(0, 1000),
      });
    }
  }

  return { processados: alertas.length, enviados, erros };
}
