import React, { useState, useCallback, useEffect, useRef } from "react";
import { WorkflowAPI, IncidentAPI, AlertAPI } from "./api/client";
import { DashboardView } from "./components/DashboardView";
import { WorkflowsView } from "./components/WorkflowsView";
import { AlertsView } from "./components/AlertsView";
import { WorkflowDetailModal } from "./components/WorkflowDetailModal";
import { AddWorkflowModal } from "./components/AddWorkflowModal";
import { AuthGate, hasSession, clearSession } from "./components/AuthGate";
import { LandingPage } from "./components/LandingPage";
import { SettingsView } from "./components/SettingsView";
import { LanguageToggle } from "./components/LanguageToggle";
import { useLanguage } from "./i18n/LanguageContext";

const VIEWS = { DASHBOARD: "dashboard", WORKFLOWS: "workflows", ALERTS: "alerts", SETTINGS: "settings" };
const POLL_INTERVAL_MS = 30000; // 30s polling

const NAV_ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  workflows: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
  alerts: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
};

function NavIcon({ name }) {
  return (
    <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {NAV_ICON_PATHS[name]}
    </svg>
  );
}

export default function App() {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(hasSession);
  const [preAuthScreen, setPreAuthScreen] = useState("landing"); // "landing" | "login" | "register"
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [workflows, setWorkflows] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const pollRef = useRef(null);

  // ── Data fetching ────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      const [wfs, incs, als] = await Promise.all([
        WorkflowAPI.list(),
        IncidentAPI.listActive(),
        AlertAPI.listActive(),
      ]);
      setWorkflows(wfs);
      setIncidents(incs);
      setAlerts(als);

      // Update selected workflow if open
      if (selectedWorkflow) {
        const updated = wfs.find(w => w.id === selectedWorkflow.id);
        if (updated) setSelectedWorkflow(updated);
      }
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflow?.id]); // eslint-disable-line

  // Initial load + polling
  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line

  // ── Toast system ────────────────────────────────────────────
  const pushToast = useCallback((message, icon = "✅") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  // ── Handlers ────────────────────────────────────────────────
  const handleWorkflowClick = useCallback((wf) => setSelectedWorkflow(wf), []);
  const handleCloseDetail = useCallback(() => setSelectedWorkflow(null), []);

  const handleAddWorkflow = useCallback(async (formData) => {
    try {
      await WorkflowAPI.create(formData);
      await fetchData(true);
      pushToast(`"${formData.name}" added successfully!`, "✅");
    } catch (err) {
      pushToast(`Failed to add workflow: ${err.message}`, "❌");
    }
  }, [fetchData, pushToast]);

  const handleDeleteWorkflow = useCallback(async (wfId, wfName) => {
    try {
      await WorkflowAPI.delete(wfId);
      if (selectedWorkflow?.id === wfId) setSelectedWorkflow(null);
      await fetchData(true);
      pushToast(`"${wfName}" deleted`, "🗑️");
    } catch (err) {
      pushToast(`Failed to delete: ${err.message}`, "❌");
    }
  }, [fetchData, pushToast, selectedWorkflow]);

  const handleResolveIncident = useCallback(async (incidentId) => {
    try {
      await IncidentAPI.resolve(incidentId);
      await fetchData(true);
      pushToast("Incident resolved", "✅");
    } catch (err) {
      // A stale UI list can point at an incident that is already resolved
      // or gone (double-click, or the underlying workflow was deleted).
      // That's not a real failure from the user's point of view — just
      // resync silently instead of showing a scary error for it.
      if (err.message === 'Incident not found' || err.message === 'Incident already resolved') {
        await fetchData(true);
        return;
      }
      pushToast(`Failed to resolve: ${err.message}`, "❌");
    }
  }, [fetchData, pushToast]);

  // ── Keyboard: ESC closes modals ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (selectedWorkflow) setSelectedWorkflow(null);
        else if (showAddModal) setShowAddModal(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedWorkflow, showAddModal]);

  const activeAlertCount = alerts.length;

  // ── Landing + auth gate (demo only — no real backend auth) ────
  if (!authenticated) {
    if (preAuthScreen === "landing") {
      return (
        <LandingPage
          onSignIn={() => setPreAuthScreen("login")}
          onGetStarted={() => setPreAuthScreen("register")}
        />
      );
    }
    return (
      <AuthGate
        initialMode={preAuthScreen}
        onAuthenticated={() => setAuthenticated(true)}
        onBack={() => setPreAuthScreen("landing")}
      />
    );
  }

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="skeleton skeleton-logo" />
          <div className="skeleton skeleton-btn" />
          <div className="skeleton skeleton-nav-item" />
          <div className="skeleton skeleton-nav-item" />
          <div className="skeleton skeleton-nav-item" />
        </aside>
        <main className="main-content">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
          <div className="skeleton skeleton-block" style={{ height: "88px", marginBottom: "40px" }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton skeleton-block" style={{ height: "64px", marginBottom: "14px" }} />
          ))}
        </main>
      </div>
    );
  }

  // ── Error state (API unreachable) ─────────────────────────────
  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: "16px", color: "var(--text-secondary)", textAlign: "center", padding: "24px" }}>
        <h2 style={{ color: "var(--color-failed)" }}>Cannot connect to API</h2>
        <p style={{ maxWidth: "400px", color: "var(--text-muted)" }}>
          Make sure the backend server is running:<br />
          <code style={{ background: "var(--bg-elevated)", padding: "4px 10px", borderRadius: "4px", fontSize: "13px", marginTop: "8px", display: "inline-block" }}>
            npm run server
          </code>
        </p>
        <button className="btn-primary" onClick={() => { setLoading(true); fetchData(); }}>
          Retry
        </button>
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* ── Settings (top-right) ── */}
      <button
        className={`settings-corner-btn ${view === VIEWS.SETTINGS ? "active" : ""}`}
        onClick={() => setView(VIEWS.SETTINGS)}
        aria-label="Settings"
        title="Settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <a className="logo" href="#" onClick={(e) => { e.preventDefault(); setView(VIEWS.DASHBOARD); }} aria-label="Groundtruth Home">
          <div className="logo-text">Groundtruth</div>
          <div className="logo-tagline">{t("tagline")}</div>
        </a>

        <button id="add-workflow-btn" className="add-btn" onClick={() => setShowAddModal(true)} aria-label="Add new workflow">
          <span aria-hidden="true">＋</span><span>{t("addWorkflow")}</span>
        </button>

        <nav className="nav" aria-label="Main navigation">
          <div className="nav-section-label">{t("nav.monitor")}</div>
          <button id="nav-dashboard" className={`nav-btn ${view === VIEWS.DASHBOARD ? "active" : ""}`} onClick={() => setView(VIEWS.DASHBOARD)}>
            <NavIcon name="dashboard" />
            <span>{t("nav.dashboard")}</span>
          </button>
          <button id="nav-workflows" className={`nav-btn ${view === VIEWS.WORKFLOWS ? "active" : ""}`} onClick={() => setView(VIEWS.WORKFLOWS)}>
            <NavIcon name="workflows" />
            <span>{t("nav.workflows")}</span>
          </button>
          <button id="nav-alerts" className={`nav-btn ${view === VIEWS.ALERTS ? "active" : ""}`} onClick={() => setView(VIEWS.ALERTS)}>
            <NavIcon name="alerts" />
            <span>{t("nav.alerts")}</span>
            {activeAlertCount > 0 && (
              <span className="nav-badge" aria-label={`${activeAlertCount} active alerts`}>{activeAlertCount}</span>
            )}
          </button>

          <div className="nav-section-label nav-section-label-spaced">{t("nav.workspace")}</div>
          <button id="nav-settings" className={`nav-btn ${view === VIEWS.SETTINGS ? "active" : ""}`} onClick={() => setView(VIEWS.SETTINGS)}>
            <NavIcon name="settings" />
            <span>{t("nav.settings")}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          {t("sidebarFooter")}
          <br />
          <button className="logout-link" onClick={() => { clearSession(); setAuthenticated(false); }}>{t("signOut")}</button>
          <div style={{ marginTop: "10px" }}><LanguageToggle /></div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {view === VIEWS.DASHBOARD && (
          <DashboardView workflows={workflows} incidents={incidents} onWorkflowClick={handleWorkflowClick} onAddWorkflow={() => setShowAddModal(true)} onViewAllWorkflows={() => setView(VIEWS.WORKFLOWS)} onViewAllAlerts={() => setView(VIEWS.ALERTS)} />
        )}
        {view === VIEWS.WORKFLOWS && (
          <WorkflowsView workflows={workflows} onWorkflowClick={handleWorkflowClick} onAddWorkflow={() => setShowAddModal(true)} />
        )}
        {view === VIEWS.ALERTS && (
          <AlertsView alerts={alerts} workflows={workflows} onWorkflowClick={handleWorkflowClick} onResolve={handleResolveIncident} />
        )}
        {view === VIEWS.SETTINGS && (
          <SettingsView onSignOut={() => { clearSession(); setAuthenticated(false); }} />
        )}
      </main>

      {/* ── Modals ── */}
      {selectedWorkflow && (
        <WorkflowDetailModal
          workflow={selectedWorkflow}
          onClose={handleCloseDetail}
          onDelete={handleDeleteWorkflow}
          onResolveIncident={handleResolveIncident}
          onRefresh={() => fetchData(true)}
        />
      )}
      {showAddModal && (
        <AddWorkflowModal onClose={() => setShowAddModal(false)} onAdd={handleAddWorkflow} />
      )}

      {/* ── Toasts ── */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className="toast" role="alert">
            <span className="toast-icon">{toast.icon}</span>
            <span className="toast-text">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
