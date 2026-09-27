// tests/engine/alert-resolution.test.js
// Resolving an incident must resolve the alert it created — these were
// tracked completely independently before, so an alert stayed "active"
// forever even after its incident was marked resolved, and each new
// detection of the same unresolved problem piled another alert on top.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.resolve(process.cwd(), './server/db/test_alert_resolution.db');
process.env.DB_PATH = TEST_DB_PATH;

describe('Incident resolution cascades to its alert', () => {
  let WorkflowModel;
  let ExecutionModel;
  let CheckModel;
  let IncidentModel;
  let AlertService;
  let runMonitoring;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }

    await import('../../server/db/database.js');
    const wfMod = await import('../../server/models/workflow.js');
    const exMod = await import('../../server/models/execution.js');
    const chMod = await import('../../server/models/check.js');
    const inMod = await import('../../server/models/incident.js');
    const alMod = await import('../../server/alerts/alertService.js');
    const monMod = await import('../../server/engine/monitoringEngine.js');

    WorkflowModel = wfMod.WorkflowModel;
    ExecutionModel = exMod.ExecutionModel;
    CheckModel = chMod.CheckModel;
    IncidentModel = inMod.IncidentModel;
    AlertService = alMod.AlertService;
    runMonitoring = monMod.runMonitoring;
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  it('resolveByIncident resolves the matching active alert', () => {
    const wf = WorkflowModel.create({ name: 'Alert Resolution Test', platform: 'n8n', expectedFrequencyMinutes: 60 });
    const inc = IncidentModel.create({
      workflowId: wf.id,
      type: 'inactivity',
      severity: 'high',
      message: 'Workflow has not run within its expected window.',
      evidence: [],
    });
    const alert = AlertService.createFromIncident(inc, wf.name);
    expect(alert.status).toBe('active');

    IncidentModel.resolve(inc.id);
    AlertService.resolveByIncident(inc.id);

    const refetched = AlertService.findById(alert.id);
    expect(refetched.status).toBe('resolved');
    expect(AlertService.findActive().some(a => a.id === alert.id)).toBe(false);
  });

  it('leaves other workflows\' alerts untouched', () => {
    const wfA = WorkflowModel.create({ name: 'WF A', platform: 'n8n', expectedFrequencyMinutes: 60 });
    const wfB = WorkflowModel.create({ name: 'WF B', platform: 'n8n', expectedFrequencyMinutes: 60 });
    const incA = IncidentModel.create({ workflowId: wfA.id, type: 'inactivity', severity: 'high', message: 'A down', evidence: [] });
    const incB = IncidentModel.create({ workflowId: wfB.id, type: 'inactivity', severity: 'high', message: 'B down', evidence: [] });
    const alertA = AlertService.createFromIncident(incA, wfA.name);
    const alertB = AlertService.createFromIncident(incB, wfB.name);

    IncidentModel.resolve(incA.id);
    AlertService.resolveByIncident(incA.id);

    expect(AlertService.findById(alertA.id).status).toBe('resolved');
    expect(AlertService.findById(alertB.id).status).toBe('active');
  });

  it('the engine auto-resolving an incident also resolves its alert (not just the manual Resolve button)', async () => {
    const wf = WorkflowModel.create({ name: 'Auto-resolve Test', platform: 'n8n', expectedFrequencyMinutes: 5 });
    CheckModel.createDefaults(wf.id);

    // Stale — heartbeat fails, inactivity incident + alert created.
    const stale = new Date(Date.now() - 60 * 60000).toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: stale, completedAt: stale, outputCount: 1 });
    await runMonitoring(wf.id);
    const activeAlertsBefore = AlertService.findActive().filter(a => a.workflow_id === wf.id);
    expect(activeAlertsBefore.length).toBe(1);
    expect(activeAlertsBefore[0].type).toBe('inactivity');

    // Workflow runs again, on time — the engine should auto-resolve the
    // inactivity incident AND its alert, without anyone clicking Resolve.
    const now = new Date().toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: now, completedAt: now, outputCount: 1 });
    await runMonitoring(wf.id);

    const stillActiveAlerts = AlertService.findActive().filter(a => a.workflow_id === wf.id && a.type === 'inactivity');
    expect(stillActiveAlerts.length).toBe(0);
  });
});
