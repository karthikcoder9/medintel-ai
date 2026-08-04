import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language, SUPPORTED_LANGUAGES, translations } from './translations'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('medintel_lang') as Language
    return saved && translations[saved] ? saved : 'en'
  })

  const setLanguage = (lang: Language) => {
    if (translations[lang]) {
      setLanguageState(lang)
      localStorage.setItem('medintel_lang', lang)
    }
  }

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language] || translations['en']
    return dict[key] || translations['en'][key] || fallback || key
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
