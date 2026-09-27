import React, { useState, useEffect, useMemo } from "react";
import { StatusBadge, SeverityBadge } from "./StatusBadge";
import { WorkflowAPI, ExecutionAPI, IncidentAPI } from "../api/client";
import { formatRelativeTime } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";

const RESULT_ICON = {
  passed: { icon: "✓", cls: "check-pass" },
  failed: { icon: "✗", cls: "check-fail" },
  null:   { icon: "—", cls: "check-skip" },
};

export function WorkflowDetailModal({ workflow: initialWorkflow, onClose, onDelete, onResolveIncident, onRefresh }) {
  const { t } = useLanguage();
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [executions, setExecutions] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loadingExecs, setLoadingExecs] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [detail, execs, incs] = await Promise.all([
          WorkflowAPI.get(initialWorkflow.id),
          ExecutionAPI.list(initialWorkflow.id),
          IncidentAPI.listAll().then(all => all.filter(i => i.workflow_id === initialWorkflow.id)),
        ]);
        if (!cancelled) {
          setWorkflow({ ...detail, checks: detail.checks ?? initialWorkflow.checks });
          setExecutions(execs);
          setIncidents(incs);
        }
      } catch {
        // Use prop data as fallback
      } finally {
        if (!cancelled) setLoadingExecs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [initialWorkflow.id]);

  const checks = workflow.checks ?? [];
  const activeIncidents = incidents.filter(i => i.status === "active");

  const handleDelete = async () => {
    if (!window.confirm(t("workflowDetail.deleteConfirm", { name: workflow.name }))) return;
    setDeleting(true);
    await onDelete(workflow.id, workflow.name);
  };

  const handleResolve = async (incId) => {
    await onResolveIncident(incId);
    // Reload incidents
    try {
      const incs = await IncidentAPI.listAll().then(all => all.filter(i => i.workflow_id === workflow.id));
      setIncidents(incs);
      const detail = await WorkflowAPI.get(workflow.id);
      setWorkflow(prev => ({ ...prev, ...detail }));
    } catch {}
    onRefresh();
  };

  const tabLabels = {
    overview: t("workflowDetail.tabOverview"),
    connect: t("workflowDetail.tabConnect"),
    history: t("workflowDetail.tabHistory"),
    incidents: t("workflowDetail.tabIncidents"),
    report: t("workflowDetail.tabReport"),
  };

  const webhookUrl = useMemo(() => {
    // In dev, the page is served by Vite (5173) which proxies /api to the
    // real backend (3001) — but external tools like n8n/Make don't go
    // through that proxy, so show the actual backend origin they'll hit.
    const apiOrigin = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
    return `${apiOrigin}/api/webhook/${workflow.id}`;
  }, [workflow.id]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} aria-modal="true" role="dialog" aria-label={`${workflow.name} details`}>
      <div className="modal-panel modal-wide">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 className="modal-title">{workflow.name}</h2>
              <StatusBadge status={workflow.status} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              {workflow.platform} · {t("workflowDetail.every", { n: workflow.expected_frequency_minutes })}
              {workflow.last_run_at && ` ${t("workflowDetail.lastRun", { time: formatRelativeTime(workflow.last_run_at) })}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="btn-danger-sm" onClick={handleDelete} disabled={deleting} title={t("workflowDetail.delete")}>
              {deleting ? "…" : t("workflowDetail.delete")}
            </button>
            <button className="modal-close" onClick={onClose} aria-label={t("workflowDetail.close")}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {["overview", "connect", "history", "incidents", "report"].map(tab => (
            <button key={tab} className={`modal-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}>
              {tabLabels[tab]}
              {tab === "incidents" && activeIncidents.length > 0 && (
                <span style={{ marginLeft: "6px", background: "var(--color-failed)", color: "#fff", borderRadius: "10px", padding: "1px 6px", fontSize: "10px" }}>
                  {activeIncidents.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ overflowY: "auto", maxHeight: "calc(90vh - 200px)" }}>

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <div>
              {workflow.description && (
                <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>{workflow.description}</p>
              )}

              {!workflow.last_run_at && (
                <div className="waiting-for-data">
                  <div className="waiting-for-data-title">{t("workflowDetail.waitingTitle")}</div>
                  <p className="waiting-for-data-desc">{t("workflowDetail.waitingDesc")}</p>
                  <button className="section-action" onClick={() => setActiveTab("connect")}>
                    {t("workflowDetail.waitingCta")}
                  </button>
                </div>
              )}

              <h3 className="detail-section-title">{t("workflowDetail.monitoringChecks")}</h3>
              {checks.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t("workflowDetail.noChecks")}</p>
              ) : (
                <div className="checks-list">
                  {checks.map(check => {
                    const resultKey = check.last_result ?? "null";
                    const ri = RESULT_ICON[resultKey] ?? RESULT_ICON.null;
                    return (
                      <div key={check.id} className={`check-item ${ri.cls}`}>
                        <div className="check-result-icon" aria-label={resultKey}>{ri.icon}</div>
                        <div className="check-info">
                          <div className="check-label">{check.label}</div>
                          <div className="check-type">{t(`workflowDetail.checkTypes.${check.type}`, null, check.type)}</div>
                          {check.last_reason && (
                            <div className="check-reason">{check.last_reason}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Active Incidents summary */}
              {activeIncidents.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <h3 className="detail-section-title">{t("workflowDetail.activeIssues")}</h3>
                  {activeIncidents.map(inc => (
                    <IncidentCard key={inc.id} incident={inc} onResolve={handleResolve} workflow={workflow} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Connect Tab ── */}
          {activeTab === "connect" && (
            <ConnectPanel webhookUrl={webhookUrl} />
          )}

          {/* ── Report Tab ── */}
          {activeTab === "report" && (
            <ReportPanel workflowId={workflow.id} />
          )}

          {/* ── History Tab ── */}
          {activeTab === "history" && (
            <div>
              <h3 className="detail-section-title">{t("workflowDetail.executionHistory")}</h3>
              {loadingExecs ? (
                <div>
                  {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-block" style={{ height: "40px", marginBottom: "8px" }} />)}
                </div>
              ) : executions.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t("workflowDetail.noExecutions")}</p>
              ) : (
                <div className="history-list">
                  {executions.map(exec => (
                    <ExecutionRow key={exec.id} exec={exec} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Incidents Tab ── */}
          {activeTab === "incidents" && (
            <div>
              <h3 className="detail-section-title">{t("workflowDetail.allIncidents")}</h3>
              {incidents.length === 0 ? (
                <div className="empty-state" style={{ padding: "32px 0" }}>
                  <p className="empty-state-title">{t("workflowDetail.noIncidents")}</p>
                </div>
              ) : (
                incidents.map(inc => (
                  <IncidentCard key={inc.id} incident={inc} showResolved onResolve={handleResolve} workflow={workflow} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — user can still select the text */ }
  };
  return (
    <div className="copy-field">
      <code className="copy-field-value">{value}</code>
      <button type="button" className="copy-field-btn" onClick={handleCopy}>
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}

function ConnectPanel({ webhookUrl }) {
  const { t } = useLanguage();
  const examplePayload = JSON.stringify(
    { status: "success", outputCount: 1, note: "e.g. 1 email sent" },
    null, 2
  );

  return (
    <div>
      <h3 className="detail-section-title">{t("workflowDetail.connectTitle")}</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", lineHeight: 1.6, marginBottom: "20px" }}>
        {t("workflowDetail.connectDesc")}
      </p>

      <div style={{ marginBottom: "22px" }}>
        <div className="detail-section-title" style={{ marginBottom: "8px" }}>{t("workflowDetail.webhookUrl")}</div>
        <CopyField value={webhookUrl} />
      </div>

      <div style={{ marginBottom: "22px" }}>
        <div className="detail-section-title" style={{ marginBottom: "8px" }}>{t("workflowDetail.authHeader")}</div>
        <CopyField value="Authorization: Bearer <WEBHOOK_SECRET from your server's .env>" />
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>{t("workflowDetail.authNote")}</p>
      </div>

      <div style={{ marginBottom: "22px" }}>
        <div className="detail-section-title" style={{ marginBottom: "8px" }}>{t("workflowDetail.examplePayload")}</div>
        <pre className="code-block">{examplePayload}</pre>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>{t("workflowDetail.statusValues")}</p>
      </div>

      <div className="connect-note">
        <strong>{t("workflowDetail.reachableTitle")}</strong> {t("workflowDetail.reachableDesc")}
      </div>
    </div>
  );
}

function ReportPanel({ workflowId }) {
  const { t } = useLanguage();
  const [days, setDays] = useState(30);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    WorkflowAPI.report(workflowId, days)
      .then(data => { if (!cancelled) setReport(data); })
      .catch(() => { if (!cancelled) setReport(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workflowId, days]);

  if (loading) {
    return <div className="skeleton skeleton-block" style={{ height: "220px" }} />;
  }
  if (!report) {
    return <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t("workflowDetail.reportError")}</p>;
  }

  const { workflow, executions, reliabilityScore, incidents } = report;
  const periodLabel = t("workflowDetail.reportPeriod", {
    days,
    since: new Date(report.period.since).toLocaleDateString(),
    until: new Date(report.period.until).toLocaleDateString(),
  });

  return (
    <div>
      <div className="report-toolbar">
        <div className="report-days-select">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              className={`report-days-btn ${days === d ? "active" : ""}`}
              onClick={() => setDays(d)}
            >
              {t("workflowDetail.reportDays", { n: d })}
            </button>
          ))}
        </div>
        <button className="btn-secondary" onClick={() => window.print()}>{t("workflowDetail.printReport")}</button>
      </div>

      <div className="report-print-area">
        <div className="report-print-header">
          <div className="report-print-brand">Groundtruth</div>
          <div className="report-print-generated">{t("workflowDetail.generatedOn", { date: new Date().toLocaleString() })}</div>
        </div>

        <h2 className="report-title">{workflow.name}</h2>
        <p className="report-sub">{workflow.platform}{workflow.description ? ` · ${workflow.description}` : ""}</p>
        <p className="report-period">{periodLabel}</p>

        <div className="report-score-row">
          <div className="report-score">
            <div className="report-score-num">{reliabilityScore == null ? "—" : `${reliabilityScore}%`}</div>
            <div className="report-score-label">{t("workflowDetail.reliabilityScore")}</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-num">{executions.total}</div>
            <div className="report-stat-label">{t("workflowDetail.totalRuns")}</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-num">{executions.verifiedCorrect}</div>
            <div className="report-stat-label">{t("workflowDetail.verifiedCorrect")}</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-num" style={{ color: "var(--color-warning)" }}>{executions.silentFailures}</div>
            <div className="report-stat-label">{t("workflowDetail.silentFailures")}</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-num" style={{ color: "var(--color-failed)" }}>{executions.technicalFailures}</div>
            <div className="report-stat-label">{t("workflowDetail.technicalFailures")}</div>
          </div>
        </div>

        <p className="report-explain">{t("workflowDetail.reliabilityExplain")}</p>

        <div className="detail-section-title" style={{ marginTop: "24px" }}>
          {t("workflowDetail.reportIncidents", { total: incidents.total, resolved: incidents.resolved, open: incidents.open })}
        </div>
        {incidents.list.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t("workflowDetail.reportNoIncidents")}</p>
        ) : (
          <div className="report-incident-list">
            {incidents.list.map(inc => (
              <div key={inc.id} className="report-incident-row">
                <div>
                  <div className="report-incident-msg">{inc.message}</div>
                  <div className="report-incident-meta">
                    {new Date(inc.detected_at).toLocaleString()}
                    {inc.resolution_minutes != null
                      ? ` · ${t("workflowDetail.resolvedIn", { minutes: inc.resolution_minutes })}`
                      : ` · ${t("workflowDetail.stillOpen")}`}
                  </div>
                </div>
                <SeverityBadge severity={inc.severity} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentCard({ incident, showResolved = false, onResolve, workflow }) {
  const { t, tIncident, lang } = useLanguage();
  const [resolving, setResolving] = useState(false);
  if (!showResolved && incident.status === "resolved") return null;
  // In English, prefer whatever the backend sent — it may be a real,
  // per-incident AI explanation (see server/ai/explainIncident.js), which
  // is richer than the static template. In Thai, prefer the curated
  // translation, since the AI explanation is only ever generated in
  // English; fall back to the backend text for an unrecognized type.
  const explanation = lang === "en"
    ? (incident.ai_explanation ?? tIncident(incident.type, "aiExplanation"))
    : (tIncident(incident.type, "aiExplanation") ?? incident.ai_explanation);
  const action = lang === "en"
    ? (incident.suggested_action ?? tIncident(incident.type, "suggestedAction", { platform: workflow?.platform }))
    : (tIncident(incident.type, "suggestedAction", { platform: workflow?.platform }) ?? incident.suggested_action);

  const handleResolve = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      await onResolve(incident.id);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className={`incident-card severity-${incident.severity}`} style={{ marginBottom: "12px" }}>
      <div className="incident-header">
        <div style={{ flex: 1 }}>
          <div className="incident-title">{incident.message}</div>
          <div className="incident-meta" style={{ marginTop: "6px" }}>
            <SeverityBadge severity={incident.severity} />
            <span className="incident-time">{t("workflowDetail.detected", { time: formatRelativeTime(incident.detected_at) })}</span>
            {incident.status === "resolved" && (
              <span style={{ color: "var(--color-healthy)", fontSize: "11px", fontWeight: 600 }}>{t("workflowDetail.resolved")}</span>
            )}
          </div>
        </div>
        {incident.status === "active" && onResolve && (
          <button className="btn-resolve" onClick={handleResolve} disabled={resolving} title={t("workflowDetail.resolve")}>
            {resolving ? "…" : t("workflowDetail.resolve")}
          </button>
        )}
      </div>
      {(incident.evidence ?? []).length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("workflowDetail.evidence")}</p>
          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {incident.evidence.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
      {explanation && (
        <div className="ai-explanation" style={{ marginTop: "14px" }}>
          <div style={{ marginBottom: "6px" }}>
            <div className="ai-title">{t("workflowDetail.whyUnhealthy")}</div>
            <div className="ai-subtitle">{t("workflowDetail.aiDisclaimer")}</div>
          </div>
          <p className="ai-text" style={{ margin: 0 }}>{explanation}</p>
        </div>
      )}
      {action && (
        <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{t("workflowDetail.suggestedAction")}</strong> {action}
        </div>
      )}
    </div>
  );
}

function ExecutionRow({ exec }) {
  const { t } = useLanguage();
  const statusColor = exec.status === "success" ? "var(--color-healthy)" : exec.status.startsWith("success") ? "var(--color-warning)" : "var(--color-failed)";
  const statusLabel = exec.status === "success" ? "SUCCESS" : exec.status === "success_silent_fail" ? "SUCCESS*" : exec.status === "success_anomaly" ? "SUCCESS†" : "FAILED";
  return (
    <div className="history-row">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        <span style={{ color: statusColor, fontWeight: 700, fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.05em" }}>{statusLabel}</span>
        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{formatRelativeTime(exec.started_at)}</span>
        {exec.output_count != null && <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{t("workflowDetail.records", { n: exec.output_count })}</span>}
        {exec.duration_ms && <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{(exec.duration_ms / 1000).toFixed(1)}s</span>}
      </div>
      {exec.note && <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>{t("workflowDetail.note", { note: exec.note })}</p>}
    </div>
  );
}
