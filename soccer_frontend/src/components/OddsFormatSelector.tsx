import React, { useState, useRef, useEffect } from 'react';
import { usePreferences, ODDS_FORMAT_NAMES, ODDS_EXAMPLES, OddsFormat } from '../contexts/PreferencesContext';

interface OddsFormatSelectorProps {
  className?: string;
}

export default function OddsFormatSelector({ className = '' }: OddsFormatSelectorProps) {
  const { oddsFormat, setOddsFormat } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const formats: OddsFormat[] = ['moneyline', 'decimal', 'fractional'];

  const handleFormatChange = (format: OddsFormat) => {
    console.log('OddsFormatSelector: Changing format from', oddsFormat, 'to', format);
    setOddsFormat(format);
    setIsOpen(false);
  };

  // Calculate dropdown position
  const getDropdownStyle = () => {
    if (!buttonRef.current) return {};
    
    const buttonRect = buttonRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: `${buttonRect.bottom + 8}px`,
      left: `${buttonRect.left + (buttonRect.width / 2)}px`,
      transform: 'translateX(-50%)',
      zIndex: 100000
    };
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex flex-col">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted hover:text-text hover:bg-white/5 rounded transition-all duration-300 border border-transparent hover:border-border/50 group"
          title="Odds Format"
        >
          <span className="text-xs lg:text-xs opacity-75">Odds formats:</span>
          <svg 
            className={`w-3 h-3 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="text-xs lg:text-xs text-text font-semibold px-2 py-1">
          {ODDS_FORMAT_NAMES[oddsFormat]} {ODDS_EXAMPLES[oddsFormat]}
        </div>
      </div>

      {isOpen && (
        <div className="w-48 lg:w-64 bg-surface border border-border rounded-lg shadow-xl backdrop-blur-sm" style={getDropdownStyle()}>
          <div className="p-2">
            {formats.map((format) => (
              <button
                key={format}
                onClick={() => handleFormatChange(format)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-white/5 ${
                  oddsFormat === format 
                    ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30' 
                    : 'hover:border-border/50'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-xs lg:text-sm font-medium text-text">
                    {ODDS_FORMAT_NAMES[format]}
                  </span>
                  <span className="text-xs lg:text-xs text-muted">
                    {ODDS_EXAMPLES[format]}
                  </span>
                </div>
                {oddsFormat === format && (
                  <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
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
