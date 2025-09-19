import React, { useState, useRef, useEffect } from 'react';
import { usePreferences, LANGUAGE_NAMES, Language } from '../contexts/PreferencesContext';

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { language, setLanguage } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const languages: Language[] = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja'];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex flex-col">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted hover:text-text hover:bg-white/5 rounded transition-all duration-300 border border-transparent hover:border-border/50 group"
          title="Language"
        >
          <svg className="w-3 h-3 text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <span className="text-xs opacity-75">Language:</span>
          <svg 
            className={`w-3 h-3 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="text-xs text-text font-semibold px-2 py-1">
          {LANGUAGE_NAMES[language]}
        </div>
      </div>

      {isOpen && (
        <div className="fixed z-[99999] w-64 bg-surface border border-border rounded-lg shadow-xl backdrop-blur-sm" style={{
          top: '100%',
          transform: 'translateX(-50%)',
          marginTop: '8px'
        }}>
          <div className="p-2 max-h-80 overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-white/5 ${
                  language === lang 
                    ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30' 
                    : 'hover:border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 rounded-sm overflow-hidden border border-border/50">
                    {/* Flag icons would go here - for now using a placeholder */}
                    <div className={`w-full h-full ${getFlagColor(lang)}`}></div>
                  </div>
                  <span className="text-sm font-medium text-text">
                    {LANGUAGE_NAMES[lang]}
                  </span>
                </div>
                {language === lang && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple flag color mapping for visual representation
function getFlagColor(lang: Language): string {
  const flagColors: Record<Language, string> = {
    en: 'bg-gradient-to-b from-blue-600 to-red-600', // USA/UK flag colors
    pl: 'bg-gradient-to-b from-white to-red-600', // Poland flag
    de: 'bg-gradient-to-b from-black via-red-600 to-yellow-500', // Germany flag
    fr: 'bg-gradient-to-r from-blue-600 via-white to-red-600', // France flag
    es: 'bg-gradient-to-b from-red-600 to-yellow-500', // Spain flag
    it: 'bg-gradient-to-r from-green-600 via-white to-red-600', // Italy flag
    pt: 'bg-gradient-to-r from-green-600 to-red-600', // Portugal flag
    ru: 'bg-gradient-to-b from-white via-blue-600 to-red-600', // Russia flag
    zh: 'bg-gradient-to-b from-red-600 to-yellow-500', // China flag
    ja: 'bg-red-600' // Japan flag (simplified)
  };
  return flagColors[lang] || 'bg-gray-600';
}
