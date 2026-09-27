// ============================================================
// alerts/mailer.js
// Sends alert emails via SMTP (Gmail App Password by default).
// Silently no-ops if SMTP env vars are not configured, so the
// app keeps working in demo/dev mode without email set up.
// ============================================================

import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_TO } = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && ALERT_EMAIL_TO);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: Number(SMTP_PORT) !== 587,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendAlertEmail(alert) {
  if (!isConfigured) {
    console.log('[Mailer] SMTP not configured — skipping email send. Set SMTP_HOST/SMTP_USER/SMTP_PASS/ALERT_EMAIL_TO in .env to enable.');
    return { sent: false, reason: 'not_configured' };
  }

  const subject = `[AutoHealth] ${alert.severity.toUpperCase()}: ${alert.workflow_name}`;
  const evidenceList = (alert.evidence ?? []).map((e) => `- ${e}`).join('\n');

  const text = [
    `Workflow: ${alert.workflow_name}`,
    `Severity: ${alert.severity}`,
    '',
    `Problem:`,
    alert.problem,
    '',
    evidenceList ? `Evidence:\n${evidenceList}` : null,
    alert.suggested_action ? `\nSuggested action:\n${alert.suggested_action}` : null,
  ].filter(Boolean).join('\n');

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: ALERT_EMAIL_TO,
      subject,
      text,
    });
    console.log(`[Mailer] ✉️  Alert email sent to ${ALERT_EMAIL_TO}`);
    return { sent: true };
  } catch (err) {
    console.error('[Mailer] Failed to send alert email:', err.message);
    return { sent: false, reason: err.message };
  }
}
