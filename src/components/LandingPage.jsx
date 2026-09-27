import React from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";

export function LandingPage({ onSignIn, onGetStarted }) {
  const { t } = useLanguage();

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">Groundtruth</div>
        <div className="landing-nav-actions">
          <LanguageToggle />
          <button className="landing-nav-link" onClick={onSignIn}>{t("landing.signIn")}</button>
          <button className="btn-primary" onClick={onGetStarted}>{t("landing.getStarted")}</button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">{t("landing.eyebrow")}</div>
            <h1 className="landing-hero-title">
              {t("landing.heroTitle1")}<br />
              <em>{t("landing.heroEm")}</em>. {t("landing.heroTitle2")}<br />{t("landing.heroTitle3")}
            </h1>
            <p className="landing-hero-sub">{t("landing.heroSub")}</p>
            <div className="landing-hero-actions">
              <button className="btn-primary landing-cta" onClick={onGetStarted}>{t("landing.getStartedFree")}</button>
              <button className="landing-nav-link" onClick={onSignIn}>{t("landing.signIn")}</button>
            </div>
          </div>

          <div className="landing-diagram" aria-label="Example: a workflow that reports success but silently fails">
            <div className="landing-diagram-label">{t("landing.diagramLabel")}</div>
            <div className="landing-diagram-row">
              <span className="landing-diagram-key">{t("landing.reported")}</span>
              <span className="status-badge healthy">SUCCESS</span>
            </div>
            <div className="landing-diagram-connector">
              <span className="landing-diagram-connector-line" />
              <span className="landing-diagram-connector-text">{t("landing.diagramConnector")}</span>
            </div>
            <div className="landing-diagram-row">
              <span className="landing-diagram-key">{t("landing.groundtruthShows")}</span>
              <span className="status-badge warning">{t("dashboard.exampleFail")}</span>
            </div>
          </div>
        </section>

        <section className="landing-problem">
          <p className="landing-lede">
            <span className="landing-dropcap">T</span>{t("landing.problemLede")}
          </p>
        </section>

        <section className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-num">01</div>
            <div>
              <h3 className="landing-feature-title">{t("landing.feature1Title")}</h3>
              <p className="landing-feature-desc">{t("landing.feature1Desc")}</p>
            </div>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-num">02</div>
            <div>
              <h3 className="landing-feature-title">{t("landing.feature2Title")}</h3>
              <p className="landing-feature-desc">{t("landing.feature2Desc")}</p>
            </div>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-num">03</div>
            <div>
              <h3 className="landing-feature-title">{t("landing.feature3Title")}</h3>
              <p className="landing-feature-desc">{t("landing.feature3Desc")}</p>
            </div>
          </div>
        </section>
      </main>

      <section className="landing-closer">
        <p className="landing-closer-text">{t("landing.closer")}</p>
        <button className="btn-primary landing-cta" onClick={onGetStarted}>{t("landing.getStartedFree")}</button>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <div className="landing-brand">Groundtruth</div>
            <p className="landing-footer-tagline">{t("tagline")}</p>
          </div>

          <div className="landing-footer-col">
            <div className="landing-footer-col-title">{t("landing.footerProduct")}</div>
            <button className="landing-footer-link" onClick={onGetStarted}>{t("landing.getStarted")}</button>
            <button className="landing-footer-link" onClick={onSignIn}>{t("landing.signIn")}</button>
          </div>

          <div className="landing-footer-col">
            <div className="landing-footer-col-title">{t("landing.footerWorksWith")}</div>
            <span className="landing-footer-text">n8n</span>
            <span className="landing-footer-text">Make</span>
            <span className="landing-footer-text">Zapier</span>
          </div>

          <div className="landing-footer-col">
            <div className="landing-footer-col-title">{t("landing.footerContact")}</div>
            <span className="landing-footer-text">[YOUR EMAIL]</span>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Groundtruth</span>
          <span>{t("landing.footerBuiltFor")}</span>
        </div>
      </footer>
    </div>
  );
}
