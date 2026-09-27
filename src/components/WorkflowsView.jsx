import React from "react";
import { WorkflowCard } from "./WorkflowCard";
import { getFrequencyLabel, formatRelativeTime, STATUS } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * WorkflowsView — full list of all workflows with filter tabs
 */
export function WorkflowsView({ workflows, onWorkflowClick, onAddWorkflow }) {
  const { t } = useLanguage();
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const filteredWorkflows = workflows.filter((wf) => {
    if (filter !== "all" && wf.status !== filter) return false;
    if (query.trim() && !wf.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: workflows.length,
    [STATUS.HEALTHY]: workflows.filter((w) => w.status === STATUS.HEALTHY).length,
    [STATUS.WARNING]: workflows.filter((w) => w.status === STATUS.WARNING).length,
    [STATUS.FAILED]: workflows.filter((w) => w.status === STATUS.FAILED).length,
    [STATUS.INACTIVE]: workflows.filter((w) => w.status === STATUS.INACTIVE).length,
  };

  const tabs = [
    { key: "all", label: t("workflows.all") },
    { key: STATUS.HEALTHY, label: t("workflows.healthy") },
    { key: STATUS.WARNING, label: t("workflows.warning") },
    { key: STATUS.FAILED, label: t("workflows.failed") },
    { key: STATUS.INACTIVE, label: t("workflows.inactive") },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title">{t("workflows.title")}</h1>
            <p className="page-subtitle">{t("workflows.subtitle")}</p>
          </div>
          <div className="workflow-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("workflows.searchPlaceholder")}
              aria-label={t("workflows.searchPlaceholder")}
            />
            {query && (
              <button className="workflow-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "22px",
          marginBottom: "28px",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border-default)",
          paddingBottom: "2px",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "0 0 10px",
              borderRadius: 0,
              fontSize: "13px",
              fontWeight: filter === tab.key ? 600 : 500,
              color: filter === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              background: "transparent",
              border: "none",
              borderBottom: filter === tab.key ? "2px solid var(--text-primary)" : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              transition: "all 150ms ease",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {tab.label}
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Workflow Grid */}
      {filteredWorkflows.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-state-title">{query ? t("workflows.noSearchResults", { query }) : t("workflows.emptyTitle")}</h3>
          <p className="empty-state-desc">{query ? t("workflows.noSearchResultsDesc") : t("workflows.emptyDesc")}</p>
        </div>
      ) : (
        <div className="workflow-grid">
          {filteredWorkflows.map((wf) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              onClick={onWorkflowClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
