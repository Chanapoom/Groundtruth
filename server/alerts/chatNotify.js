// ============================================================
// alerts/chatNotify.js
// Sends alert notifications to Slack and/or Discord via incoming
// webhooks. Each channel is independently optional — silently no-ops if
// its URL isn't set in .env, same graceful-degrade pattern as
// server/alerts/mailer.js.
// ============================================================

const SEVERITY_EMOJI = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' };

function formatText(alert) {
  const evidenceList = (alert.evidence ?? []).map((e) => `• ${e}`).join('\n');
  return [
    `*${alert.severity.toUpperCase()}* — ${alert.workflow_name}`,
    alert.problem,
    evidenceList,
    alert.suggested_action ? `*Suggested action:* ${alert.suggested_action}` : null,
  ].filter(Boolean).join('\n\n');
}

export async function sendSlackAlert(alert) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { sent: false, reason: 'not_configured' };

  const emoji = SEVERITY_EMOJI[alert.severity] ?? '⚠️';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} [AutoHealth] ${alert.workflow_name}: ${alert.problem}`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `${emoji} ${formatText(alert)}` } },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Slack responded ${res.status}`);
    console.log(`[Slack] Alert sent for ${alert.workflow_name}`);
    return { sent: true };
  } catch (err) {
    console.error('[Slack] Failed to send alert:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendDiscordAlert(alert) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { sent: false, reason: 'not_configured' };

  const colorBySeverity = { critical: 0xef4444, high: 0xf59e0b, medium: 0xeab308, low: 0x94a3b8 };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `${alert.severity.toUpperCase()} — ${alert.workflow_name}`,
          description: alert.problem,
          color: colorBySeverity[alert.severity] ?? 0x94a3b8,
          fields: [
            ...(alert.evidence ?? []).slice(0, 5).map((e) => ({ name: '​', value: e })),
            ...(alert.suggested_action ? [{ name: 'Suggested action', value: alert.suggested_action }] : []),
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Discord responded ${res.status}`);
    console.log(`[Discord] Alert sent for ${alert.workflow_name}`);
    return { sent: true };
  } catch (err) {
    console.error('[Discord] Failed to send alert:', err.message);
    return { sent: false, reason: err.message };
  }
}
