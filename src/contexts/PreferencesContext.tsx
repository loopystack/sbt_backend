import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type OddsFormat = 'moneyline' | 'decimal' | 'fractional';
export type Language = 'en' | 'pl' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'ru' | 'zh' | 'ja';

interface PreferencesContextType {
  oddsFormat: OddsFormat;
  language: Language;
  setOddsFormat: (format: OddsFormat) => void;
  setLanguage: (language: Language) => void;
}

const PreferencesContext = createContext<PreferencesContextType>({
  oddsFormat: 'moneyline',
  language: 'en',
  setOddsFormat: () => {},
  setLanguage: () => {}
});

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [oddsFormat, setOddsFormatState] = useState<OddsFormat>(() => {
    if (typeof window !== 'undefined') {
      const savedFormat = localStorage.getItem('oddsFormat') as OddsFormat;
      if (savedFormat && ['moneyline', 'decimal', 'fractional'].includes(savedFormat)) {
        return savedFormat;
      }
    }
    return 'moneyline';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja'].includes(savedLanguage)) {
        return savedLanguage;
      }
    }
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('oddsFormat', oddsFormat);
    }
  }, [oddsFormat]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
  }, [language]);

  const setOddsFormat = (format: OddsFormat) => {
    setOddsFormatState(format);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const contextValue: PreferencesContextType = {
    oddsFormat,
    language,
    setOddsFormat,
    setLanguage
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
};

// Language mapping for display
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  pl: 'Polski',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語'
};

// Odds format mapping for display
export const ODDS_FORMAT_NAMES: Record<OddsFormat, string> = {
  moneyline: 'Money Line Odds',
  decimal: 'Decimal Odds',
  fractional: 'Fractional Odds'
};

// Example odds for each format
export const ODDS_EXAMPLES: Record<OddsFormat, string> = {
  moneyline: '(-200)',
  decimal: '(1.50)',
  fractional: '(1/2)'
};
