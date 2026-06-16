import nodemailer from 'nodemailer';

let cached = null;

function getTransport() {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host) throw new Error('SMTP_HOST is not configured');
  cached = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cached;
}

function fromAddress() {
  const email = process.env.EMAIL_FROM || 'web@codars.dev';
  const name = process.env.EMAIL_FROM_NAME || 'Oveikals POS';
  return `"${name}" <${email}>`;
}

export async function sendResetEmail(to, resetUrl) {
  const transport = getTransport();
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#c8102e">Oveikals POS — paroles atjaunošana</h2>
      <p>Tu (vai kāds) pieprasīja paroles atjaunošanu šim kontam.</p>
      <p>Spied uz pogas, lai uzstādītu jaunu paroli. Saite ir derīga 1 stundu.</p>
      <p style="margin:28px 0">
        <a href="${resetUrl}"
           style="background:#c8102e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">
          Uzstādīt jaunu paroli
        </a>
      </p>
      <p style="font-size:13px;color:#666">Ja poga nestrādā, kopē šo saiti:<br>
        <a href="${resetUrl}" style="color:#c8102e">${resetUrl}</a>
      </p>
      <p style="font-size:13px;color:#666">Ja tu šo nepieprasīji, vienkārši ignorē šo e-pastu.</p>
    </div>
  `;
  await transport.sendMail({
    from: fromAddress(),
    to,
    subject: 'Oveikals POS — paroles atjaunošana',
    html,
    text: `Paroles atjaunošana. Atver šo saiti (derīga 1h): ${resetUrl}`,
  });
}
