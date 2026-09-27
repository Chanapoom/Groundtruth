// tests/engine/coverage.test.js
// A workflow with zero enabled checks is a monitoring blind spot, not a
// healthy workflow — it must be flagged, not silently reported healthy.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.resolve(process.cwd(), './server/db/test_coverage.db');
process.env.DB_PATH = TEST_DB_PATH;

describe('Layer 0 — Monitoring Coverage', () => {
  let WorkflowModel;
  let IncidentModel;
  let AlertService;
  let runMonitoring;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }

    await import('../../server/db/database.js');
    const wfMod = await import('../../server/models/workflow.js');
    const inMod = await import('../../server/models/incident.js');
    const alMod = await import('../../server/alerts/alertService.js');
    const monMod = await import('../../server/engine/monitoringEngine.js');

    WorkflowModel = wfMod.WorkflowModel;
    IncidentModel = inMod.IncidentModel;
    AlertService = alMod.AlertService;
    runMonitoring = monMod.runMonitoring;
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  it('flags a workflow with no enabled checks as unmonitored, not healthy', async () => {
    // Deliberately skip CheckModel.createDefaults() — this workflow has
    // zero checks configured, same as if every check were later disabled.
    const wf = WorkflowModel.create({
      name: 'Uncovered Workflow',
      platform: 'n8n',
      description: 'No monitoring checks configured',
      expectedFrequencyMinutes: 60,
    });

    const result = await runMonitoring(wf.id);

    // Must NOT default to healthy just because nothing failed.
    expect(result.status).toBe('warning');
    expect(WorkflowModel.findById(wf.id).status).toBe('warning');

    const activeIncidents = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active');
    expect(activeIncidents.length).toBe(1);
    expect(activeIncidents[0].type).toBe('unmonitored');

    const activeAlerts = AlertService.findActive().filter(a => a.workflow_id === wf.id);
    expect(activeAlerts.length).toBe(1);
  });

  it('does not duplicate the incident on repeated runs', async () => {
    const wf = WorkflowModel.create({
      name: 'Uncovered Workflow 2',
      platform: 'n8n',
      expectedFrequencyMinutes: 60,
    });

    await runMonitoring(wf.id);
    await runMonitoring(wf.id);

    const activeIncidents = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active');
    expect(activeIncidents.length).toBe(1);
  });

  it('resolves the unmonitored incident once checks are added', async () => {
    const wf = WorkflowModel.create({
      name: 'Uncovered Workflow 3',
      platform: 'n8n',
      expectedFrequencyMinutes: 60,
    });

    await runMonitoring(wf.id);
    expect(IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active').length).toBe(1);

    const chMod = await import('../../server/models/check.js');
    chMod.CheckModel.createDefaults(wf.id);

    await runMonitoring(wf.id);

    const stillActive = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active' && i.type === 'unmonitored');
    expect(stillActive.length).toBe(0);
  });
});
