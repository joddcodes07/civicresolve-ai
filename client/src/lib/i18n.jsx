// Lightweight i18n: our own dictionary + context (no extra dependency).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './locales/en.json'
import hi from './locales/hi.json'
import mr from './locales/mr.json'

const DICTS = { en, hi, mr }
const STORAGE_KEY = 'civicresolve.lang'

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', speech: 'en-IN' },
  { code: 'hi', label: 'हिंदी', short: 'हिं', speech: 'hi-IN' },
  { code: 'mr', label: 'मराठी', short: 'म', speech: 'mr-IN' },
]

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored && DICTS[stored] ? stored : 'en'
    } catch {
      return 'en'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[lang] || en
      let str = dict[key] ?? en[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) str = str.split(`{${k}}`).join(String(v))
      }
      return str
    },
    [lang],
  )

  const speechLang = LANGUAGES.find((l) => l.code === lang)?.speech || 'en-IN'

  const value = useMemo(() => ({ lang, setLang: setLangState, t, speechLang, languages: LANGUAGES }), [lang, t, speechLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
