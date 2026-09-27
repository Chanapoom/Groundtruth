# Groundtruth

**What automations report vs. what they actually did.**

Groundtruth watches n8n / Make / Zapier / custom automation workflows and
detects *silent failures* — a workflow reports `SUCCESS` while quietly
producing empty, wrong, or missing output. Traditional monitoring checks
whether a workflow ran. Groundtruth checks whether it did what it was
supposed to.

## The core idea

```
Reported:               SUCCESS
Actually happened:      no confirmation email was created

Groundtruth shows:      WARNING — silent failure
```

A workflow can run exactly on schedule, throw no technical error, and
still fail the thing it exists to do. Standard monitoring has no way to
catch that. Groundtruth does, by validating what a workflow's own
execution reports about its output — not just whether it ran.

## How it works

Four deterministic layers run before any AI is involved:

1. **Heartbeat** — did the workflow run within its expected window?
2. **Output validation** — did it produce the expected output (not just
   "no error")?
3. **Data validation** — does the output meet configured rules (required
   fields, types, ranges)?
4. **Anomaly detection** — is output volume/duration within its normal
   historical range?

A fifth layer flags workflows that have **zero active checks** —
`unmonitored` is itself a first-class incident type, because a coverage
gap is the same blind spot this product exists to close, one level up.

AI (optional, via the Claude API) only explains an incident *after* the
deterministic layers have already decided it's one — it never decides
what counts as a failure, and every AI-generated explanation is labeled
in the UI as a hypothesis to verify, not a confirmed cause.

## Stack

- **Backend**: Node.js, Express, better-sqlite3 (SQLite), node-cron
- **Frontend**: React 19, Vite
- **i18n**: English / Thai, no external library
- **Tests**: Vitest (engine logic + full acceptance scenario)

## Getting started

```bash
npm install
cp .env.example .env      # fill in WEBHOOK_SECRET at minimum
npm start                 # runs backend (3001) + frontend (5173) together
```

Open `http://localhost:5173`.

## Connecting a real automation

See [`docs/CONNECT_GUIDE.md`](docs/CONNECT_GUIDE.md) for a full walkthrough:
creating a workflow, getting its webhook URL, wiring it into an n8n/Make
workflow (including an **Error Trigger** branch — a plain end-of-workflow
webhook alone won't fire if the workflow fails partway through), and a
curl-based smoke test you can run before touching n8n at all.

## Project docs

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — product requirements
- [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md) — technical design
- [`docs/CONNECT_GUIDE.md`](docs/CONNECT_GUIDE.md) — connecting real n8n/Make workflows

## Known limitations

- **AI explanations are hypotheses, not verified diagnoses.** The UI
  labels this explicitly. The deterministic layers decide *whether*
  something is an incident from the numbers reported; AI only
  speculates about *why*, from limited evidence, and can be wrong.
- **Trusts what's reported to it.** Like any monitoring tool,
  Groundtruth is only as accurate as the `status`/`outputCount` values
  the workflow sends — it can't independently verify them.
- **Auth is cosmetic**, built for demo purposes: any email/password is
  accepted, nothing is persisted server-side. Not meant for real user
  accounts yet.
- **Not validated with real users beyond the author.** The monitoring
  engine has been tested end-to-end against a live n8n workflow (real
  webhook, real silent-failure and technical-failure cases), but no one
  outside this project has used it on their own automations yet.
