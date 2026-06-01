// Templates HTML para alertas de vencimento de documentos e e-mails de autenticação.

interface TemplateData {
  nomeDestinatario: string;
  tituloDocumento: string;
  unidade: string;
  dataVencimento: string; // dd/mm/aaaa
  diasAntecedencia: number; // negativo = vencido
  linkDocumento: string;
}

function baseLayout(opts: { titulo: string; corPrincipal: string; conteudo: string }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>${opts.titulo}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:${opts.corPrincipal};padding:20px 28px;color:#ffffff;font-size:18px;font-weight:bold;">
          {{NOME_APP}}
        </td></tr>
        <tr><td style="padding:28px;">
          ${opts.conteudo}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;">
          E-mail automático do {{NOME_APP}}. Não responda a esta mensagem.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function templateDocumentoVencendo(d: TemplateData): { subject: string; html: string } {
  const subject = `[{{NOME_APP}}] Documento vence em ${d.diasAntecedencia} dia(s): ${d.tituloDocumento}`;
  const conteudo = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Documento vencendo</h2>
    <p style="margin:0 0 12px;">Olá, <strong>${d.nomeDestinatario}</strong>.</p>
    <p style="margin:0 0 16px;">O documento abaixo está próximo do vencimento:</p>
    <table cellpadding="8" cellspacing="0" style="width:100%;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;margin-bottom:20px;">
      <tr><td style="font-size:14px;"><strong>Documento:</strong> ${d.tituloDocumento}</td></tr>
      <tr><td style="font-size:14px;"><strong>Unidade:</strong> ${d.unidade}</td></tr>
      <tr><td style="font-size:14px;"><strong>Vencimento:</strong> ${d.dataVencimento} (${d.diasAntecedencia} dia(s))</td></tr>
    </table>
    <p style="margin:0 0 20px;">Acesse o sistema para providenciar a renovação:</p>
    <p><a href="${d.linkDocumento}" style="display:inline-block;background:{{COR_PRINCIPAL}};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">Abrir documento</a></p>
  `;
  return { subject, html: baseLayout({ titulo: subject, corPrincipal: "{{COR_PRINCIPAL}}", conteudo }) };
}

export function templateDocumentoVencido(d: TemplateData): { subject: string; html: string } {
  const diasVencido = Math.abs(d.diasAntecedencia);
  const subject = `[{{NOME_APP}}] Documento VENCIDO há ${diasVencido} dia(s): ${d.tituloDocumento}`;
  const conteudo = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Documento vencido</h2>
    <p style="margin:0 0 12px;">Olá, <strong>${d.nomeDestinatario}</strong>.</p>
    <p style="margin:0 0 16px;">O documento abaixo está <strong>vencido</strong> e requer ação imediata:</p>
    <table cellpadding="8" cellspacing="0" style="width:100%;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin-bottom:20px;">
      <tr><td style="font-size:14px;"><strong>Documento:</strong> ${d.tituloDocumento}</td></tr>
      <tr><td style="font-size:14px;"><strong>Unidade:</strong> ${d.unidade}</td></tr>
      <tr><td style="font-size:14px;"><strong>Vencido em:</strong> ${d.dataVencimento} (há ${diasVencido} dia(s))</td></tr>
    </table>
    <p><a href="${d.linkDocumento}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">Abrir documento</a></p>
  `;
  return { subject, html: baseLayout({ titulo: subject, corPrincipal: "#dc2626", conteudo }) };
}

export interface DocumentoResumo {
  titulo: string;
  unidade: string;
  dataVencimento: string; // dd/mm/aaaa
  diasAntecedencia: number; // negativo = vencido
  linkDocumento: string;
}

export function templateResumoDiario(args: {
  nomeDestinatario: string;
  documentos: DocumentoResumo[];
}): { subject: string; html: string } {
  const total = args.documentos.length;
  const vencidos = args.documentos.filter((d) => d.diasAntecedencia <= 0).length;
  const vencendo = total - vencidos;

  const subject =
    vencidos > 0
      ? `[{{NOME_APP}}] Resumo diário: ${vencidos} vencido(s) e ${vencendo} a vencer`
      : `[{{NOME_APP}}] Resumo diário: ${vencendo} documento(s) a vencer`;

  const linhas = args.documentos
    .slice()
    .sort((a, b) => a.diasAntecedencia - b.diasAntecedencia)
    .map((d) => {
      const vencido = d.diasAntecedencia <= 0;
      const bg = vencido ? "#fef2f2" : "#fff7ed";
      const border = vencido ? "#fecaca" : "#fed7aa";
      const statusTxt = vencido
        ? `<span style="color:#b91c1c;font-weight:bold;">VENCIDO há ${Math.abs(d.diasAntecedencia)} dia(s)</span>`
        : `<span style="color:#c2410c;">Vence em ${d.diasAntecedencia} dia(s)</span>`;
      return `
        <tr><td style="padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:6px;">
          <div style="font-size:14px;font-weight:bold;color:#111827;margin-bottom:4px;">
            <a href="${d.linkDocumento}" style="color:#111827;text-decoration:none;">${d.titulo}</a>
          </div>
          <div style="font-size:13px;color:#374151;">Unidade: ${d.unidade}</div>
          <div style="font-size:13px;color:#374151;">Vencimento: ${d.dataVencimento}</div>
          <div style="font-size:13px;margin-top:4px;">${statusTxt}</div>
        </td></tr>
        <tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>
      `;
    })
    .join("");

  const cor = vencidos > 0 ? "#dc2626" : "{{COR_PRINCIPAL}}";
  const conteudo = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Resumo diário de documentos</h2>
    <p style="margin:0 0 12px;">Olá, <strong>${args.nomeDestinatario}</strong>.</p>
    <p style="margin:0 0 16px;">Você tem <strong>${total}</strong> documento(s) que requerem atenção:
      <span style="color:#b91c1c;">${vencidos} vencido(s)</span>
      e <span style="color:#c2410c;">${vencendo} a vencer</span>.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:8px;">
      ${linhas}
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">Acesse cada documento clicando no título.</p>
  `;
  return { subject, html: baseLayout({ titulo: subject, corPrincipal: cor, conteudo }) };
}

// ============================================================
// Templates de autenticação (cadastro e reset de senha)
// ============================================================

export function templateConfirmacaoCadastro(args: { nome: string; link: string }): {
  subject: string;
  html: string;
} {
  const subject = "[{{NOME_APP}}] Confirme seu cadastro e defina sua senha";
  const conteudo = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Bem-vindo(a) ao {{NOME_APP}}</h2>
    <p style="margin:0 0 12px;">Olá, <strong>${args.nome}</strong>.</p>
    <p style="margin:0 0 16px;">Recebemos uma solicitação de cadastro com este e-mail. Para concluir, clique no botão abaixo e crie sua senha de acesso:</p>
    <p style="margin:24px 0;"><a href="${args.link}" style="display:inline-block;background:{{COR_PRINCIPAL}};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Confirmar e definir senha</a></p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Este link é válido por 24 horas e só pode ser usado uma vez.</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Se você não solicitou este cadastro, ignore esta mensagem.</p>
  `;
  return { subject, html: baseLayout({ titulo: subject, corPrincipal: "{{COR_PRINCIPAL}}", conteudo }) };
}

export function templateResetSenha(args: { nome: string; link: string }): {
  subject: string;
  html: string;
} {
  const subject = "[{{NOME_APP}}] Redefinição de senha";
  const conteudo = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Redefinir sua senha</h2>
    <p style="margin:0 0 12px;">Olá, <strong>${args.nome}</strong>.</p>
    <p style="margin:0 0 16px;">Recebemos um pedido para redefinir sua senha do {{NOME_APP}}. Para criar uma nova senha, clique no botão abaixo:</p>
    <p style="margin:24px 0;"><a href="${args.link}" style="display:inline-block;background:{{COR_PRINCIPAL}};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Redefinir senha</a></p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Este link é válido por 24 horas e só pode ser usado uma vez.</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Se você não solicitou esta alteração, ignore esta mensagem — sua senha atual continua válida.</p>
  `;
  return { subject, html: baseLayout({ titulo: subject, corPrincipal: "{{COR_PRINCIPAL}}", conteudo }) };
}
