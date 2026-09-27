import React, { useState, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";
import { SettingsAPI } from "../api/client";

const CHANNELS = [
  { key: "email", labelKey: "settings.channelEmail", envKey: "SMTP_HOST / SMTP_USER / SMTP_PASS / ALERT_EMAIL_TO" },
  { key: "slack", labelKey: "settings.channelSlack", envKey: "SLACK_WEBHOOK_URL" },
  { key: "discord", labelKey: "settings.channelDiscord", envKey: "DISCORD_WEBHOOK_URL" },
  { key: "ai", labelKey: "settings.channelAi", envKey: "ANTHROPIC_API_KEY" },
];

export function SettingsView({ onSignOut }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    let cancelled = false;
    SettingsAPI.status()
      .then(data => { if (!cancelled) setStatus(data); })
      .catch(() => { if (!cancelled) setStatus(null); })
      .finally(() => { if (!cancelled) setLoadingStatus(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("settings.title")}</h1>
        <p className="page-subtitle">{t("settings.subtitle")}</p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">{t("settings.account")}</div>
        <div className="form-group">
          <label className="form-label" htmlFor="settings-name">{t("settings.name")}</label>
          <input id="settings-name" className="form-input" type="text" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="settings-email">{t("settings.email")}</label>
          <input id="settings-email" className="form-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">{t("settings.language")}</div>
        <p className="settings-desc">{t("settings.languageDesc")}</p>
        <LanguageToggle />
      </div>

      <div className="settings-section">
        <div className="settings-section-title">{t("settings.notifications")}</div>
        <p className="settings-desc">{t("settings.notificationsDesc")}</p>
        <div className="integration-list">
          {loadingStatus ? (
            [1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-block" style={{ height: "48px", marginBottom: "8px" }} />)
          ) : (
            CHANNELS.map(ch => {
              const configured = status?.[ch.key] ?? false;
              return (
                <div key={ch.key} className="integration-row">
                  <div>
                    <div className="integration-label">{t(ch.labelKey)}</div>
                    {!configured && <div className="integration-hint">{t("settings.setInEnv", { key: ch.envKey })}</div>}
                  </div>
                  <span className={`integration-badge ${configured ? "on" : "off"}`}>
                    {configured ? t("settings.configured") : t("settings.notConfigured")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="settings-section settings-danger">
        <div className="settings-section-title">{t("settings.session")}</div>
        <p className="settings-desc">{t("settings.sessionDesc")}</p>
        <button className="btn-secondary settings-btn" onClick={onSignOut}>{t("settings.signOut")}</button>
      </div>
    </div>
  );
}
