import React, { useState } from "react";
import { SeverityBadge } from "./StatusBadge";
import { formatRelativeTime } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";

export function AlertsView({ alerts = [], workflows, onWorkflowClick, onResolve }) {
  const { t } = useLanguage();

  if (alerts.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">{t("alerts.title")}</h1>
          <p className="page-subtitle">{t("alerts.subtitle")}</p>
        </div>
        <div className="empty-state">
          <h3 className="empty-state-title">{t("alerts.emptyTitle")}</h3>
          <p className="empty-state-desc">{t("alerts.emptyDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("alerts.title")} <span className="section-count">{alerts.length}</span></h1>
        <p className="page-subtitle">{t("alerts.subtitle")}</p>
      </div>
      <div className="alerts-list">
        {alerts.map(alert => {
          const wf = workflows.find(w => w.id === alert.workflow_id);
          return (
            <AlertCard
              key={alert.id}
              alert={alert}
              platform={wf?.platform}
              onWorkflowClick={() => { if (wf) onWorkflowClick(wf); }}
              onResolve={onResolve}
            />
          );
        })}
      </div>
    </div>
  );
}

function AlertCard({ alert, platform, onWorkflowClick, onResolve }) {
  const { t, tIncident, lang } = useLanguage();
  const [resolving, setResolving] = useState(false);
  // See WorkflowDetailModal's IncidentCard for why English prefers the
  // backend value (possibly a real AI-generated suggestion) while Thai
  // prefers the curated static translation.
  const action = lang === "en"
    ? (alert.suggested_action ?? tIncident(alert.type, "suggestedAction", { platform }))
    : (tIncident(alert.type, "suggestedAction", { platform }) ?? alert.suggested_action);

  const handleResolve = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      await onResolve(alert.incident_id ?? alert.id);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className={`alert-card severity-${alert.severity}`}>
      <div className="alert-card-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <SeverityBadge severity={alert.severity} />
            <span className="incident-workflow-tag" style={{ cursor: "pointer" }} onClick={onWorkflowClick}>{alert.workflow_name}</span>
            <span className="incident-time">· {formatRelativeTime(alert.created_at)}</span>
          </div>
          <p className="alert-message">{alert.problem}</p>
        </div>
        {onResolve && (
          <button className="btn-resolve" onClick={handleResolve} disabled={resolving} title="Resolve alert">
            {resolving ? "…" : t("alerts.resolve")}
          </button>
        )}
      </div>

      {(alert.evidence ?? []).length > 0 && (
        <div className="alert-evidence">
          <p className="evidence-label">{t("alerts.evidence")}</p>
          <ul className="evidence-list">
            {alert.evidence.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {action && (
        <div className="alert-action">
          <strong>{t("alerts.suggestedAction")}</strong> {action}
        </div>
      )}
    </div>
  );
}
