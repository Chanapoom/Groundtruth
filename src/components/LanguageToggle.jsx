import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

export function LanguageToggle({ className = "" }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`lang-toggle ${className}`} role="group" aria-label="Language">
      <button
        className={`lang-toggle-btn ${lang === "en" ? "active" : ""}`}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <span className="lang-toggle-sep">/</span>
      <button
        className={`lang-toggle-btn ${lang === "th" ? "active" : ""}`}
        onClick={() => setLang("th")}
      >
        ไทย
      </button>
    </div>
  );
}
