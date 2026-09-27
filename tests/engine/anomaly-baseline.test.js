// tests/engine/anomaly-baseline.test.js
// The anomaly baseline must be computed from execution history BEFORE the
// run being evaluated — including the run itself skews the average toward
// itself and can fabricate an anomaly out of nothing.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.resolve(process.cwd(), './server/db/test_anomaly_baseline.db');
process.env.DB_PATH = TEST_DB_PATH;

describe('Layer 4 — Anomaly baseline excludes the current run', () => {
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

  it('does not flag an anomaly using a baseline that includes the run itself', async () => {
    const wf = WorkflowModel.create({
      name: 'Baseline Self-Reference Test',
      platform: 'n8n',
      expectedFrequencyMinutes: 5,
    });
    CheckModel.createDefaults(wf.id);

    // Two prior runs (outputs 1 and 0), then a third run (output 1) — with
    // the buggy inclusive baseline this averages (1+0+1)/3 = 0.667 and
    // flags the third run's output of 1 as a "50% spike" against itself.
    const t1 = new Date(Date.now() - 20 * 60000).toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: t1, completedAt: t1, outputCount: 1 });
    const t2 = new Date(Date.now() - 10 * 60000).toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: t2, completedAt: t2, outputCount: 0 });
    const t3 = new Date().toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: t3, completedAt: t3, outputCount: 1 });

    await runMonitoring(wf.id);

    // Only 2 prior runs exist once the current one is excluded — below the
    // 3-sample minimum, so anomaly detection must skip, not fire on itself.
    const activeIncidents = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active');
    expect(activeIncidents.some(i => i.type === 'anomaly')).toBe(false);
  });

  it('excludes the given execution id from the computed baseline', async () => {
    const wf = WorkflowModel.create({
      name: 'getBaseline exclusion test',
      platform: 'n8n',
      expectedFrequencyMinutes: 5,
    });

    const t1 = new Date(Date.now() - 20 * 60000).toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: t1, completedAt: t1, outputCount: 100 });
    const t2 = new Date(Date.now() - 10 * 60000).toISOString();
    ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: t2, completedAt: t2, outputCount: 100 });
    const current = ExecutionModel.create({ workflowId: wf.id, status: 'success', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), outputCount: 9999 });

    const baseline = ExecutionModel.getBaseline(wf.id, 30, current.id);
    expect(baseline.sampleSize).toBe(2);
    expect(baseline.avgOutputCount).toBe(100);
  });
});
