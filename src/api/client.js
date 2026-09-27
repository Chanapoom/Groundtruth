// ============================================================
// src/api/client.js — Fetch wrappers for all API endpoints
// Replace this file's BASE_URL when deploying to production.
// ============================================================

const BASE_URL = '/api'; // Proxied by Vite to http://localhost:3001

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Workflows ─────────────────────────────────────────────────
export const WorkflowAPI = {
  list: ()       => request('GET', '/workflows').then(r => r.data),
  get: (id)      => request('GET', `/workflows/${id}`).then(r => r.data),
  create: (data) => request('POST', '/workflows', data).then(r => r.data),
  update: (id, data) => request('PUT', `/workflows/${id}`, data).then(r => r.data),
  delete: (id)   => request('DELETE', `/workflows/${id}`),
  monitor: (id)  => request('POST', `/workflows/${id}/monitor`).then(r => r.data),
  report: (id, days = 30) => request('GET', `/workflows/${id}/report?days=${days}`).then(r => r.data),
};

// ── Executions ────────────────────────────────────────────────
export const ExecutionAPI = {
  list: (workflowId, limit = 20) =>
    request('GET', `/workflows/${workflowId}/executions?limit=${limit}`).then(r => r.data),
  record: (workflowId, data) =>
    request('POST', `/workflows/${workflowId}/executions`, data).then(r => r.data),
};

// ── Incidents ─────────────────────────────────────────────────
export const IncidentAPI = {
  listActive: ()  => request('GET', '/incidents').then(r => r.data),
  listAll: ()     => request('GET', '/incidents?all=true').then(r => r.data),
  resolve: (id)   => request('POST', `/incidents/${id}/resolve`).then(r => r.data),
};

// ── Alerts ────────────────────────────────────────────────────
export const AlertAPI = {
  listActive: () => request('GET', '/alerts').then(r => r.data),
  resolve: (id)  => request('POST', `/alerts/${id}/resolve`).then(r => r.data),
};

// ── Demo ──────────────────────────────────────────────────────
export const DemoAPI = {
  seed: () => request('POST', '/demo/seed').then(r => r.data),
};

// ── Settings / integration status ───────────────────────────────
export const SettingsAPI = {
  status: () => request('GET', '/settings/status').then(r => r.data),
};
