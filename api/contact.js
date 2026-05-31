// Vercel serverless funkce — odešle poptávku z formuláře e-mailem přes SMTP.
// Vyžaduje env vary nastavené v Vercel dashboardu (Settings → Environment Variables).
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { jmeno, telefon, email, sluzba, lokalita, termin, zprava, botcheck } = body;

  // Honeypot — bot vyplní; vrátíme úspěch, ale nic neposíláme.
  if (botcheck) return res.status(200).json({ success: true });

  if (!jmeno || !telefon || !sluzba) {
    return res.status(400).json({ error: 'Chybí povinné údaje' });
  }

  const {
    SMTP_HOST,
    SMTP_PORT = '587',
    SMTP_SECURE = 'false',
    SMTP_USER,
    SMTP_PASS,
    MAIL_TO,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('[contact] Chybí SMTP env vary (SMTP_HOST/SMTP_USER/SMTP_PASS)');
    return res.status(500).json({ error: 'Server není nakonfigurován' });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const text = [
    'Nová poptávka ze stavhor.cz',
    '',
    `Jméno:    ${jmeno}`,
    `Telefon:  ${telefon}`,
    `E-mail:   ${email || '—'}`,
    `Služba:   ${sluzba}`,
    `Lokalita: ${lokalita || '—'}`,
    `Termín:   ${termin || '—'}`,
    '',
    'Popis:',
    zprava || '—',
  ].join('\n');

  try {
    await transporter.sendMail({
      from: `"StavHor formulář" <${SMTP_USER}>`,
      to: MAIL_TO || SMTP_USER,
      replyTo: email || undefined,
      subject: `Nová poptávka: ${sluzba} — ${jmeno}`,
      text,
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[contact] sendMail error:', e?.message || e);
    return res.status(500).json({ error: 'Nepodařilo se odeslat' });
  }
}
