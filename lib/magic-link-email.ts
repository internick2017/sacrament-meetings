// The sign-in e-mail, written in Portuguese because that is the language of the
// ward and the site's default. Next-auth's stock template (English, a lone
// "Sign in" button, no sender context) lands in Gmail's spam folder: this one
// names the unit, says why the reader got it, and carries the link as plain
// text too.
export interface MagicLinkEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildMagicLinkEmail({ url, unitName }: { url: string; unitName: string }): MagicLinkEmail {
  const unit = unitName.trim() || 'nossa unidade';
  const subject = `Seu link de acesso ao site da ${unit}`;

  const text = [
    'Olá!',
    '',
    `Você pediu para entrar no site da ${unit}. Abra este link para entrar:`,
    '',
    url,
    '',
    'O link vale por 24 horas e só pode ser usado uma vez.',
    'Se não foi você quem pediu, é só ignorar este e-mail.',
  ].join('\n');

  const safeUnit = escapeHtml(unit);
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px">
      <p style="margin:0 0 16px">Olá!</p>
      <p style="margin:0 0 16px">Você pediu para entrar no site da <strong>${safeUnit}</strong>.</p>
      <p style="margin:0 0 24px">
        <a href="${safeUrl}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px">Entrar no site</a>
      </p>
      <p style="margin:0 0 8px;font-size:14px">Se o botão não funcionar, copie este link no navegador:</p>
      <p style="margin:0 0 16px;font-size:13px;word-break:break-all"><a href="${safeUrl}">${safeUrl}</a></p>
      <p style="margin:0;font-size:13px;color:#475569">O link vale por 24 horas e só pode ser usado uma vez. Se não foi você quem pediu, é só ignorar este e-mail.</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
