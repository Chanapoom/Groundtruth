import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * StatusBadge — renders a colored badge for workflow/incident status
 * Props:
 *   status: 'healthy' | 'warning' | 'failed' | 'inactive'
 *   size: 'sm' | 'md' (default md)
 */
export function StatusBadge({ status }) {
  const { t } = useLanguage();
  return (
    <span className={`status-badge ${status}`}>
      <span className="dot" />
      {t(`status.${status}`, null, status)}
    </span>
  );
}

/**
 * SeverityBadge — renders severity pill for incidents
 */
export function SeverityBadge({ severity }) {
  return (
    <span className={`severity-badge ${severity}`}>
      {severity.toUpperCase()}
    </span>
  );
}
