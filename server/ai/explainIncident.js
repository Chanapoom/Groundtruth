// ============================================================
// ai/explainIncident.js
// Generates a real, per-incident AI explanation + suggested action via
// the Claude API. Silently no-ops if ANTHROPIC_API_KEY is not set, so the
// app keeps working with the deterministic template text (see
// server/engine/monitoringEngine.js) when this isn't configured — same
// graceful-degrade pattern as server/alerts/mailer.js.
//
// AI is explicitly NOT part of deciding whether something is an incident
// (that's the deterministic layer 1-4 logic) — it only explains one that
// has already been detected. See docs/TECH_SPEC.md §8.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const MODEL = 'claude-haiku-4-5-20251001';

export async function generateExplanation({ incident, workflow }) {
  if (!client) {
    console.log('[AI] ANTHROPIC_API_KEY not configured — skipping real AI explanation, using template.');
    return null;
  }

  const prompt = `You are explaining a monitoring incident to the person who owns this automation workflow. Be specific and concrete — reference the actual evidence given, don't write generic advice.

You were not present when this ran and cannot see the workflow's internals — you only have the evidence below. State the CAUSE as a hypothesis, not a fact: use language like "likely", "this pattern usually means", "worth checking whether" rather than asserting what definitely happened. Never claim certainty about a root cause you cannot actually verify from the evidence given.

Workflow: "${workflow.name}" on ${workflow.platform}
Incident type: ${incident.type}
Severity: ${incident.severity}
Detected: ${incident.message}
Evidence:
${(incident.evidence ?? []).map(e => `- ${e}`).join('\n')}

Respond with ONLY a JSON object, no other text, in this exact shape:
{"explanation": "2-3 sentences on what likely happened and why it matters, grounded in the evidence above, phrased as a hypothesis not a verified fact", "suggestedAction": "one concrete, specific next step to VERIFY the hypothesis or fix the symptom — not a claim that this is definitely the cause"}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content?.[0]?.text?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text);
    if (!parsed.explanation || !parsed.suggestedAction) return null;

    console.log(`[AI] Generated real explanation for incident ${incident.id}`);
    return { explanation: parsed.explanation, suggestedAction: parsed.suggestedAction };
  } catch (err) {
    console.error('[AI] Failed to generate explanation:', err.message);
    return null;
  }
}
