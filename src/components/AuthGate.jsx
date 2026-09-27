import React, { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";

const SESSION_KEY = "groundtruth.demoSession";

export function hasSession() {
  try { return localStorage.getItem(SESSION_KEY) === "true"; } catch { return false; }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

function setSession() {
  try { localStorage.setItem(SESSION_KEY, "true"); } catch { /* ignore */ }
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  );
}

function GoogleButton({ label, onClick }) {
  return (
    <button type="button" className="auth-google-btn" onClick={onClick}>
      <GoogleIcon />
      {label}
    </button>
  );
}

/**
 * AuthGate — cosmetic login / register screens for demo purposes.
 * No real backend auth: any credentials (or the Google button) are accepted.
 */
export function AuthGate({ onAuthenticated, initialMode = "login", onBack }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(initialMode); // "login" | "register"

  const handleSubmit = (e) => {
    e.preventDefault();
    setSession();
    onAuthenticated();
  };

  const handleGoogle = () => {
    setSession();
    onAuthenticated();
  };

  if (mode === "register") {
    return (
      <div className="auth-page">
        <div className="auth-page-topbar">
          {onBack ? <button className="auth-back" onClick={onBack}>{t("auth.backToHome")}</button> : <span />}
          <LanguageToggle className="auth-lang-toggle" />
        </div>
        <div className="auth-card auth-card-wide">
          <div className="auth-pitch">
            <div className="auth-brand">Groundtruth</div>
            <p className="auth-pitch-lede">{t("auth.pitchLede")}</p>
            <ul className="auth-pitch-list">
              <li><span className="auth-pitch-list-label">{t("auth.pitch1Label")}</span>{t("auth.pitch1")}</li>
              <li><span className="auth-pitch-list-label">{t("auth.pitch2Label")}</span>{t("auth.pitch2")}</li>
              <li><span className="auth-pitch-list-label">{t("auth.pitch3Label")}</span>{t("auth.pitch3")}</li>
            </ul>
          </div>

          <div className="auth-form-side">
            <div className="auth-heading auth-heading-left">
              <h1 className="auth-title">{t("auth.createAccount")}</h1>
              <p className="auth-sub">{t("auth.createAccountSub")}</p>
            </div>

            <GoogleButton label={t("auth.continueWithGoogle")} onClick={handleGoogle} />
            <div className="auth-divider"><span>{t("auth.or")}</span></div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">{t("auth.email")}</label>
                <input id="auth-email" className="form-input" type="email" placeholder="you@company.com" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-password">{t("auth.password")}</label>
                <input id="auth-password" className="form-input" type="password" placeholder="••••••••" required minLength={1} />
              </div>

              <button type="submit" className="btn-primary auth-submit">{t("auth.createAccountBtn")}</button>
            </form>

            <div className="auth-switch">
              {t("auth.haveAccount")} <button type="button" onClick={() => setMode("login")}>{t("auth.signIn")}</button>
            </div>

            <div className="auth-demo-note">{t("auth.demoNote")}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page-topbar">
        {onBack ? <button className="auth-back" onClick={onBack}>{t("auth.backToHome")}</button> : <span />}
        <LanguageToggle className="auth-lang-toggle" />
      </div>
      <div className="auth-card">
        <div className="auth-brand">Groundtruth</div>
        <div className="auth-tagline">{t("tagline")}</div>

        <div className="auth-heading">
          <h1 className="auth-title">{t("auth.welcomeBack")}</h1>
          <p className="auth-sub">{t("auth.signInSub")}</p>
        </div>

        <GoogleButton label={t("auth.continueWithGoogle")} onClick={handleGoogle} />
        <div className="auth-divider"><span>{t("auth.or")}</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">{t("auth.email")}</label>
            <input id="auth-email" className="form-input" type="email" placeholder="you@company.com" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">{t("auth.password")}</label>
            <input id="auth-password" className="form-input" type="password" placeholder="••••••••" required minLength={1} />
          </div>

          <button type="submit" className="btn-primary auth-submit">{t("auth.signIn")}</button>
        </form>

        <div className="auth-switch">
          {t("auth.noAccount")} <button type="button" onClick={() => setMode("register")}>{t("auth.createOne")}</button>
        </div>

        <div className="auth-demo-note">{t("auth.demoNote")}</div>
      </div>
    </div>
  );
}
