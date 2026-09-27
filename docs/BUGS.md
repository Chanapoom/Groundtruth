# BUGS.md

Running log of bugs found during testing (real n8n/Make connections, manual
UI checks, code review) — not a general TODO list, just confirmed defects
and what fixed them. Add a new entry every time a real bug is found, even
small ones; skip anything that was just a misunderstanding or expected
behavior.

**Entry format:**
```
## YYYY-MM-DD — short title
**Found by:** how it was discovered (manual test, real n8n connection, code review, ...)
**Symptom:** what was observed
**Root cause:** why it happened
**Fix:** what changed, and where
**Status:** Fixed / Open / Won't fix (with reason)
```

---

## 2026-09-17 — Technical failure invisible when reported on schedule

**Found by:** Real n8n connection — sent `"status":"failed"` via webhook right on the workflow's schedule.
**Symptom:** Workflow showed `HEALTHY` with 0 incidents, even though the most recent execution was `FAILED`.
**Root cause:** `checkHeartbeat()` only measures timing (did it run on schedule?), never the execution's `status`. Technical-failure detection was nested inside the "run was late" branch, so an on-time failure never tripped it — and the "heartbeat OK" branch actively auto-resolved any existing `technical_failure` incident.
**Fix:** Decoupled technical-failure detection from timing in `server/engine/monitoringEngine.js` — now checks the latest execution's `status` independently of whether it arrived on schedule. Added regression test `tests/engine/technical-failure.test.js`.
**Status:** Fixed.

---

## 2026-09-17 — Workflow card showed wrong data for every real workflow

**Found by:** Manual UI check right after the above fix — dashboard showed "Last Run: Never", "Checks: 0/4 passing", "Every NaN days" for workflows that had real, recent executions.
**Symptom:** Dashboard workflow cards displayed stale/empty values that didn't match the API response.
**Root cause:** `src/components/WorkflowCard.jsx` was never updated after the app switched from mock data to the real API. It read `workflow.lastRunAt` / `workflow.expectedFrequencyMinutes` (camelCase, mock-data shape) instead of the real API's `last_run_at` / `expected_frequency_minutes` (snake_case). Checks were filtered on `c.passed` instead of the real `c.last_result`. The active-incident lookup searched a leftover mock `incidents` array by id instead of using the API's already-inlined incident objects.
**Fix:** Rewrote the field reads in `WorkflowCard.jsx` to match the real API shape; removed the dead `mockData` incidents/STATUS import.
**Status:** Fixed.

---

## 2026-09-17 — Dashboard intro line claimed "everything is fine" while workflows were failed/inactive

**Found by:** Same manual check — intro banner read "...every one of them is doing what it's supposed to" while 2 of 2 workflows were `failed`/`inactive` with active incidents.
**Symptom:** Misleading reassurance text shown on the dashboard.
**Root cause:** `DashboardView.jsx` only checked `status === "warning"` to decide whether to show the "healthy" message; `failed` and `inactive` statuses weren't considered "a problem" by that logic.
**Fix:** Added an `unhealthyCount` check (any status !== "healthy") with its own message (`dashboard.ledeProblems`) between the silent-failure and all-healthy cases.
**Status:** Fixed.

---

## 2026-09-17 — Webhook URL shown to the user pointed at the wrong port

**Found by:** Manual check while setting up the Connect tab for a real n8n workflow.
**Symptom:** The Connect tab showed `http://localhost:5173/api/webhook/...` (the frontend dev server) instead of the real backend (`:3001`) — confusing when trying to swap the host for an ngrok domain.
**Root cause:** `WorkflowDetailModal.jsx` built the URL from `window.location.origin`, which in dev is the Vite dev server, not the backend. It happens to work locally only because Vite proxies `/api` — but that's misleading to show verbatim.
**Fix:** In dev (`import.meta.env.DEV`), hardcode the API origin to `http://localhost:3001`; keep `window.location.origin` for production (same-origin reverse proxy assumed).
**Status:** Fixed.

---

## 2026-09-17 — Deleting a workflow left orphaned alerts behind

**Found by:** Code review while clearing demo data.
**Symptom:** N/A directly observed, but `alerts` rows for a deleted workflow would remain in the database forever (unlike executions/checks/incidents, which cascade-delete via a DB foreign key).
**Root cause:** The `alerts` table has no `REFERENCES workflows(id)` foreign key, so `DELETE FROM workflows` never cascades to it.
**Fix:** Added `AlertService.deleteByWorkflow()`, called explicitly in the `DELETE /api/workflows/:id` route before the workflow row is deleted.
**Status:** Fixed.

---

## 2026-09-17 — Resolve button could double-submit and error

**Found by:** Manual click testing in the Alerts view.
**Symptom:** Browser console showed `404 Not Found` and `400 Bad Request` on `POST /api/incidents/:id/resolve`.
**Root cause:** Two separate issues: (1) a stale, already-deleted incident id still shown in a cached UI list → 404; (2) the Resolve button wasn't disabled while a request was in flight, so a fast double-click fired two resolve calls → the second got `400 Incident already resolved`.
**Fix:** `App.jsx`'s `handleResolveIncident` now treats "not found" / "already resolved" as a silent resync instead of an error toast. `AlertsView.jsx` and `WorkflowDetailModal.jsx` resolve buttons now track a `resolving` state and disable themselves mid-request.
**Status:** Fixed.

---

## 2026-09-17 — Monitoring blind spot: workflow with zero checks reported "healthy"

**Found by:** Code review — asked "what if the system itself can't identify a problem?"
**Symptom:** N/A directly observed (can't happen via the current UI, which always creates default checks), but a workflow with all checks disabled/deleted would silently default to `healthy` with no way to tell it apart from a genuinely healthy one.
**Root cause:** No layer checked whether any checks were actually enabled before computing `finalStatus`.
**Fix:** Added a coverage check in `monitoringEngine.js` — zero enabled checks now creates an `unmonitored` incident and marks the workflow `warning` instead of defaulting to healthy. Required a DB migration (`incidents.type` CHECK constraint didn't allow `'unmonitored'`) and 3 new tests in `tests/engine/coverage.test.js`.
**Status:** Fixed (preventive — not yet triggered by a real scenario).

---

## 2026-09-17 — Resolving an alert on the Alerts page never actually cleared it

**Found by:** Real usage — clicked "Resolve" on an alert, it kept reappearing (with a new id each time). Traced back to an even deeper bug: an incident that the *monitoring engine itself* auto-resolved (workflow ran again on schedule, no one clicked anything) still left its alert active forever.
**Symptom:** Active alert count only ever grew, never shrank, even for incidents that were genuinely fixed.
**Root cause:** Two separate DB tables (`incidents`, `alerts`) with no foreign key between them. The earlier 2026-09-17 fix only covered the manual "Resolve" button route (`POST /api/incidents/:id/resolve`). But `monitoringEngine.js` also auto-resolves incidents in 6 separate places (heartbeat recovering, output passing again, anomaly clearing, etc.) by calling `IncidentModel.resolveForWorkflow()` directly — none of those ever touched `AlertService`.
**Fix:** Added `AlertService.resolveForWorkflowType(workflowId, type)` and a local `resolveType()` helper in `monitoringEngine.js` that resolves both the incident and its alert together; replaced all 6 call sites to use it. Added `tests/engine/alert-resolution.test.js` covering both the manual-resolve and auto-resolve paths. Manually cleaned up 18 orphaned alerts left over from before the fix.
**Status:** Fixed.
