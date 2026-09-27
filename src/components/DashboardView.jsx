import React, { useState } from "react";
import { HealthOverview } from "./HealthOverview";
import { WorkflowCard } from "./WorkflowCard";
import { SeverityBadge } from "./StatusBadge";
import { formatRelativeTime } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";

const INTRO_DISMISSED_KEY = "groundtruth.introDismissed";

/**
 * DashboardView — real incidents passed as prop (from API)
 */
const STATUS_PRIORITY = { failed: 0, inactive: 1, warning: 2, healthy: 3 };
const SEVERITY_PRIORITY = { critical: 0, high: 1, medium: 2, low: 3 };
const DASHBOARD_WORKFLOW_LIMIT = 5;
const DASHBOARD_INCIDENT_LIMIT = 5;

export function DashboardView({ workflows, incidents = [], onWorkflowClick, onAddWorkflow, onViewAllWorkflows, onViewAllAlerts }) {
  const { t } = useLanguage();
  const activeIncidents = incidents
    .filter(i => i.status === "active")
    .sort((a, b) => (SEVERITY_PRIORITY[a.severity] ?? 9) - (SEVERITY_PRIORITY[b.severity] ?? 9));
  const visibleIncidents = activeIncidents.slice(0, DASHBOARD_INCIDENT_LIMIT);
  const remainingIncidentCount = activeIncidents.length - visibleIncidents.length;
  const [introDismissed, setIntroDismissed] = useState(() => {
    try { return localStorage.getItem(INTRO_DISMISSED_KEY) === "true"; } catch { return false; }
  });

  const sortedWorkflows = [...workflows].sort((a, b) =>
    (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9)
  );
  const visibleWorkflows = sortedWorkflows.slice(0, DASHBOARD_WORKFLOW_LIMIT);
  const remainingCount = workflows.length - visibleWorkflows.length;

  const dismissIntro = () => {
    setIntroDismissed(true);
    try { localStorage.setItem(INTRO_DISMISSED_KEY, "true"); } catch { /* ignore */ }
  };

  const silentCount = workflows.filter(w => w.status === "warning").length;
  const unhealthyCount = workflows.filter(w => w.status !== "healthy").length;
  const noneHaveRun = workflows.length > 0 && workflows.every(w => !w.last_run_at);
  const lede = workflows.length === 0 || noneHaveRun
    ? null
    : silentCount > 0
      ? t("dashboard.ledeSilent", { count: workflows.length, silentCount })
      : unhealthyCount > 0
        ? t("dashboard.ledeProblems", { count: workflows.length, unhealthyCount })
        : t("dashboard.ledeHealthy", { count: workflows.length });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("dashboard.title")}</h1>
        <p className="page-subtitle">{t("dashboard.subtitle")}</p>
      </div>

      {noneHaveRun && (
        <OnboardingChecklist workflowCount={workflows.length} onWorkflowClick={() => onWorkflowClick(workflows[0])} />
      )}

      {!introDismissed && lede && (
        <div className="demo-banner">
          {lede}
          <button className="demo-banner-dismiss" onClick={dismissIntro} aria-label="Dismiss">✕</button>
        </div>
      )}

      <HealthOverview workflows={workflows} />

      <div className="section-header">
        <h2 className="section-title">{t("dashboard.workflows")} <span className="section-count">{workflows.length}</span></h2>
      </div>

      {workflows.length === 0 ? (
        <div className="empty-state onboarding-empty-state">
          <h3 className="empty-state-title">{t("dashboard.emptyTitle")}</h3>
          <p className="empty-state-desc">{t("dashboard.emptyDesc")}</p>

          <div className="example-scenario" aria-label="Example scenario">
            <div className="example-scenario-row">
              <span className="example-scenario-label">{t("dashboard.exampleReported")}</span>
              <span className="status-badge healthy">SUCCESS</span>
            </div>
            <div className="example-scenario-arrow">{t("dashboard.exampleArrow")}</div>
            <div className="example-scenario-row">
              <span className="example-scenario-label">{t("dashboard.exampleShows")}</span>
              <span className="status-badge warning">{t("dashboard.exampleFail")}</span>
            </div>
          </div>

          <div className="onboarding-actions">
            <button className="btn-primary" onClick={onAddWorkflow}>
              {t("dashboard.addFirst")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="workflow-grid">
            {visibleWorkflows.map(wf => (
              <WorkflowCard key={wf.id} workflow={wf} onClick={onWorkflowClick} />
            ))}
          </div>
          {remainingCount > 0 && (
            <div className="dashboard-view-all">
              <button className="section-action" onClick={onViewAllWorkflows}>
                {t("dashboard.viewAll", { count: workflows.length })}
              </button>
            </div>
          )}
        </>
      )}

      <div className="section-header">
        <h2 className="section-title">{t("dashboard.activeIncidents")} <span className="section-count">{activeIncidents.length}</span></h2>
      </div>
      {activeIncidents.length > 0 ? (
        <>
          <div className="incidents-list">
            {visibleIncidents.map(inc => (
              <IncidentRow key={inc.id} incident={inc} onWorkflowClick={() => {
                const wf = workflows.find(w => w.id === inc.workflow_id);
                if (wf) onWorkflowClick(wf);
              }} />
            ))}
          </div>
          {remainingIncidentCount > 0 && (
            <div className="dashboard-view-all">
              <button className="section-action" onClick={onViewAllAlerts}>
                {t("dashboard.viewAllIncidents", { count: activeIncidents.length })}
              </button>
            </div>
          )}
        </>
      ) : workflows.length > 0 && (
        <p className="dashboard-no-incidents">{t("dashboard.noIncidents")}</p>
      )}
    </div>
  );
}

function OnboardingChecklist({ workflowCount, onWorkflowClick }) {
  const { t } = useLanguage();
  return (
    <div className="onboarding-checklist">
      <div className="onboarding-checklist-title">{t("dashboard.checklistTitle")}</div>
      <div className="onboarding-step onboarding-step-done">
        <span className="onboarding-step-mark">✓</span>
        <span>{t("dashboard.checklistStep1", { count: workflowCount })}</span>
      </div>
      <div className="onboarding-step">
        <span className="onboarding-step-mark">2</span>
        <span>
          {t("dashboard.checklistStep2")}{" "}
          <button className="section-action" onClick={onWorkflowClick}>{t("dashboard.checklistStep2Cta")}</button>
        </span>
      </div>
      <div className="onboarding-step onboarding-step-pending">
        <span className="onboarding-step-mark">3</span>
        <span>{t("dashboard.checklistStep3")}</span>
      </div>
    </div>
  );
}

function IncidentRow({ incident, onWorkflowClick }) {
  return (
    <div className={`incident-card severity-${incident.severity}`} onClick={onWorkflowClick} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onWorkflowClick()}>
      <div className="incident-header">
        <div>
          <div className="incident-title">{incident.message}</div>
          <div className="incident-meta">
            <SeverityBadge severity={incident.severity} />
            <span className="incident-workflow-tag">{incident.workflow_name}</span>
            <span className="incident-time">Detected {formatRelativeTime(incident.detected_at)}</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {(incident.evidence ?? []).slice(0, 3).map((e, i) => (
          <span key={i} style={{ background: "var(--bg-elevated)", padding: "3px 8px", borderRadius: "var(--radius-full)" }}>{e}</span>
        ))}
        {(incident.evidence ?? []).length > 3 && (
          <span style={{ color: "var(--brand-primary)" }}>+{incident.evidence.length - 3} more</span>
        )}
      </div>
    </div>
  );
}
