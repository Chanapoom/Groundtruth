// tests/engine/technical-failure.test.js
// A "failed" execution reported ON TIME must still be flagged. The
// heartbeat check only measures timing, so technical-failure detection
// must not depend on the run being late.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.resolve(process.cwd(), './server/db/test_technical_failure.db');
process.env.DB_PATH = TEST_DB_PATH;

describe('Layer 1 — Technical failure reported on schedule', () => {
  let WorkflowModel;
  let ExecutionModel;
  let CheckModel;
  let IncidentModel;
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
    const monMod = await import('../../server/engine/monitoringEngine.js');

    WorkflowModel = wfMod.WorkflowModel;
    ExecutionModel = exMod.ExecutionModel;
    CheckModel = chMod.CheckModel;
    IncidentModel = inMod.IncidentModel;
    runMonitoring = monMod.runMonitoring;
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  it('flags a prompt "failed" report as failed, not healthy', async () => {
    const wf = WorkflowModel.create({
      name: 'On-time Failure Workflow',
      platform: 'n8n',
      expectedFrequencyMinutes: 5,
    });
    CheckModel.createDefaults(wf.id);

    const now = new Date().toISOString();
    ExecutionModel.create({
      workflowId: wf.id,
      status: 'failed', // reported right on schedule — not late at all
      startedAt: now,
      completedAt: now,
      outputCount: 0,
      note: 'API returned 500',
    });

    const result = await runMonitoring(wf.id);

    expect(result.status).toBe('failed');
    expect(WorkflowModel.findById(wf.id).status).toBe('failed');

    const activeIncidents = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active');
    expect(activeIncidents.some(i => i.type === 'technical_failure')).toBe(true);
  });

  it('resolves the technical_failure incident once a run succeeds', async () => {
    const wf = WorkflowModel.create({
      name: 'Recovers After Failure',
      platform: 'n8n',
      expectedFrequencyMinutes: 5,
    });
    CheckModel.createDefaults(wf.id);

    const t1 = new Date().toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'failed', startedAt: t1, completedAt: t1, outputCount: 0 });
    await runMonitoring(wf.id);
    expect(WorkflowModel.findById(wf.id).status).toBe('failed');

    const t2 = new Date().toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: t2, completedAt: t2, outputCount: 3 });
    await runMonitoring(wf.id);

    expect(WorkflowModel.findById(wf.id).status).toBe('healthy');
    const stillActive = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active' && i.type === 'technical_failure');
    expect(stillActive.length).toBe(0);
  });
});
