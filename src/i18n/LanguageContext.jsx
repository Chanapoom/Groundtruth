import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { t as translate, getIncidentText } from "./translations";

const LANG_KEY = "groundtruth.lang";
const LanguageContext = createContext(null);

function getInitialLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "th") return stored;
  } catch { /* ignore */ }
  return "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  const changeLang = useCallback((next) => {
    setLang(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  }, []);

  const t = useCallback((path, vars, fallback) => translate(lang, path, vars, fallback), [lang]);
  const tIncident = useCallback((type, field, vars) => getIncidentText(lang, type, field, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang: changeLang, t, tIncident }), [lang, changeLang, t, tIncident]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
