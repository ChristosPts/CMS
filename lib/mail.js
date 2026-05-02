import nodemailer from 'nodemailer';
import prisma from './prisma';

// ── Provider selection ─────────────────────────────────────────────────────
// Priority: Setting in DB → MAIL_PROVIDER ENV → 'gmail'
// Normalises legacy values: 'google' → 'gmail', 'ms' → 'graph'

async function getProvider() {
  const row = await prisma.setting.findUnique({ where: { key: 'mail_provider' } });
  const raw = row?.value || process.env.MAIL_PROVIDER || 'gmail';
  if (raw === 'ms' || raw === 'graph') return 'graph';
  return 'gmail';
}

// ── Gmail SMTP ─────────────────────────────────────────────────────────────

async function sendViaGmail({ to, subject, html, fromName }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Gmail credentials are not configured (GMAIL_USER / GMAIL_APP_PASSWORD).');
  }

  const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   587,
    secure: false, // STARTTLS
    auth:   { user, pass },
  });

  await transporter.sendMail({
    from:    `"${fromName || 'Noreply'}" <${user}>`,
    to,
    subject,
    html,
  });
}

// ── Microsoft Graph API (client credentials flow) ──────────────────────────

async function getGraphAccessToken() {
  const tenantId     = process.env.MS_TENANT_ID;
  const clientId     = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('MS Graph credentials are not configured (MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET).');
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'https://graph.microsoft.com/.default',
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Graph token error: ${data.error_description ?? data.error ?? res.status}`);
  }

  return data.access_token;
}

async function sendViaGraph({ to, subject, html, fromName }) {
  const fromEmail = process.env.MS_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('MS_FROM_EMAIL is not configured.');
  }

  const token = await getGraphAccessToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body:         { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          from:         { emailAddress: { name: fromName || 'Noreply', address: fromEmail } },
        },
        saveToSentItems: false,
      }),
    }
  );

  // Graph sendMail returns 202 Accepted on success
  if (res.status !== 202) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Graph send error (${res.status}): ${err.error?.message ?? 'unknown'}`);
  }
}

// ── Public interface ────────────────────────────────────────────────────────

/**
 * Sends an email via the configured provider (Gmail SMTP or MS Graph).
 * All callers should wrap this in try/catch to ensure email failures
 * don't break the user-facing operation.
 */
export async function sendMail({ to, subject, html, fromName }) {
  const provider = await getProvider();

  if (provider === 'graph') {
    await sendViaGraph({ to, subject, html, fromName });
  } else {
    await sendViaGmail({ to, subject, html, fromName });
  }
}

// ── Convenience wrappers ───────────────────────────────────────────────────

export async function sendVerificationEmail(email, token, siteName, baseUrl) {
  const link = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
  return sendMail({
    to:       email,
    fromName: siteName,
    subject:  `Verify your email — ${siteName}`,
    html: `
      <p>Hello,</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link does not expire. If you did not register, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email, token, siteName, baseUrl) {
  const link = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail({
    to:       email,
    fromName: siteName,
    subject:  `Reset your password — ${siteName}`,
    html: `
      <p>Hello,</p>
      <p>Click the link below to reset your password. This link is valid for <strong>1 hour</strong>.</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    `,
  });
}

export async function sendContactNotification({ to, from, subject, message, siteName }) {
  return sendMail({
    to,
    fromName: siteName,
    subject:  `New contact message: ${subject} — ${siteName}`,
    html: `
      <p><strong>From:</strong> ${from.name} &lt;${from.email}&gt;</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr />
      <p style="white-space:pre-wrap">${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    `,
  });
}
