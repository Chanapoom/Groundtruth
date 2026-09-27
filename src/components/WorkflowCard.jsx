import React from "react";
import { StatusBadge } from "./StatusBadge";
import { formatRelativeTime, getFrequencyLabel } from "../data/mockData";

/**
 * WorkflowCard — clickable card for one workflow
 */
export function WorkflowCard({ workflow, onClick }) {
  // The API already returns full incident objects here, not ids.
  const activeIncident = workflow.activeIncidents?.[0] ?? null;

  return (
    <div
      className={`workflow-card ${workflow.status}`}
      onClick={() => onClick(workflow)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(workflow)}
      aria-label={`View details for ${workflow.name}`}
    >
      <div className="workflow-card-header">
        <div>
          <div className="workflow-card-name">{workflow.name}</div>
          <span className="workflow-card-platform">
            {workflow.platform}
          </span>
        </div>
        <StatusBadge status={workflow.status} />
      </div>

      <div className="workflow-card-meta">
        <div className="meta-item">
          <span className="meta-label">Last Run</span>
          <span className="meta-value">{formatRelativeTime(workflow.last_run_at)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Frequency</span>
          <span className="meta-value">{getFrequencyLabel(workflow.expected_frequency_minutes)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Checks</span>
          <span className="meta-value">
            {(workflow.checks ?? []).filter((c) => c.last_result === "passed").length}/
            {(workflow.checks ?? []).filter((c) => c.last_result != null).length} passing
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Incidents</span>
          <span className="meta-value">{workflow.activeIncidents?.length ?? 0} active</span>
        </div>
      </div>

      {/* Show incident message if workflow is unhealthy */}
      {activeIncident && workflow.status !== "healthy" && (
        <div className={`workflow-card-incident ${workflow.status}`}>
          {activeIncident.message}
        </div>
      )}
    </div>
  );
}
