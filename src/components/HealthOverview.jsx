import React, { useMemo } from "react";
import { getHealthSummary, getHealthScore, STATUS } from "../data/mockData";

/**
 * HealthOverview — top-of-dashboard health score ring + stat counters
 */
export function HealthOverview({ workflows }) {
  const summary = useMemo(() => getHealthSummary(workflows), [workflows]);
  const score = useMemo(() => getHealthScore(summary), [summary]);

  // Ring math
  const r = 44;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;

  const scoreColor =
    score >= 80 ? "var(--color-healthy)"
    : score >= 50 ? "var(--color-warning)"
    : "var(--color-failed)";

  const scoreLabel =
    score >= 80 ? "All Good"
    : score >= 50 ? "Attention"
    : "Critical";

  return (
    <div className="health-overview">
      {/* Ring */}
      <div className="health-score-ring" title={`Health score: ${score}%`}>
        <svg viewBox="0 0 120 120">
          <circle className="score-track" cx="60" cy="60" r={r} />
          <circle
            className="score-fill"
            cx="60"
            cy="60"
            r={r}
            stroke={scoreColor}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeDashoffset="0"
          />
        </svg>
        <div className="score-center">
          <span className="score-number" style={{ color: scoreColor }}>
            {score}
          </span>
          <span className="score-label">{scoreLabel}</span>
        </div>
      </div>

      {/* Counters */}
      <div className="health-stats">
        <StatItem
          number={summary.total}
          label="Total"
          color="var(--text-primary)"
        />
        <StatItem
          number={summary.healthy}
          label="Healthy"
          color="var(--color-healthy)"
        />
        <StatItem
          number={summary.warning}
          label="Warning"
          color="var(--color-warning)"
        />
        <StatItem
          number={summary.failed + summary.inactive}
          label="Failed / Inactive"
          color="var(--color-failed)"
        />
      </div>
    </div>
  );
}

function StatItem({ number, label, color }) {
  return (
    <div className="stat-item">
      <span className="stat-number" style={{ color }}>
        {number}
      </span>
      <span className="stat-label">
        <span
          className="stat-dot"
          style={{ background: color }}
        />
        {label}
      </span>
    </div>
  );
}
