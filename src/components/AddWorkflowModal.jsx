import React, { useState } from "react";
import { PLATFORMS } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";

const FREQUENCY_VALUES = [5, 15, 30, 60, 360, 720, 1440, 10080];

export function AddWorkflowModal({ onClose, onAdd }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    platform: "n8n",
    description: "",
    expectedFrequencyMinutes: 60,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.type === "select-one" ? (isNaN(e.target.value) ? e.target.value : Number(e.target.value)) : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError(t("addWorkflowModal.nameRequired")); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(form);
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} aria-modal="true" role="dialog" aria-label={t("addWorkflowModal.ariaLabel")}>
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">{t("addWorkflowModal.title")}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="wf-name">{t("addWorkflowModal.nameLabel")}</label>
            <input id="wf-name" className="form-input" type="text" placeholder={t("addWorkflowModal.namePlaceholder")} value={form.name} onChange={set("name")} required maxLength={120} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="wf-platform">{t("addWorkflowModal.platformLabel")}</label>
              <select id="wf-platform" className="form-select" value={form.platform} onChange={set("platform")}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wf-frequency">{t("addWorkflowModal.frequencyLabel")}</label>
              <select id="wf-frequency" className="form-select" value={form.expectedFrequencyMinutes} onChange={set("expectedFrequencyMinutes")}>
                {FREQUENCY_VALUES.map(v => <option key={v} value={v}>{t(`addWorkflowModal.frequencies.${v}`, null, `Every ${v}m`)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wf-desc">{t("addWorkflowModal.descLabel")}</label>
            <textarea id="wf-desc" className="form-textarea" placeholder={t("addWorkflowModal.descPlaceholder")} value={form.description} onChange={set("description")} rows={3} maxLength={500} />
          </div>

          <div style={{ padding: "12px 0", borderTop: "1px solid var(--border-subtle)", marginBottom: "8px", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--text-primary)" }}>{t("addWorkflowModal.monitoringLabel")}</strong> {t("addWorkflowModal.monitoringDesc")}
          </div>

          {error && <p style={{ color: "var(--color-failed)", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>{t("addWorkflowModal.cancel")}</button>
            <button type="submit" className="btn-primary" disabled={submitting || !form.name.trim()}>
              {submitting ? t("addWorkflowModal.submitting") : t("addWorkflowModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
