import React, { useState } from "react";

export default function LeftSidebar() {
  const [selectedCountry, setSelectedCountry] = useState("United States");
  
  // Function to get flag URL
  const getFlagUrl = (flagCode: string) => {
    try {
      return new URL(`../assets/flags/${flagCode}.svg`, import.meta.url).href;
    } catch {
      return '';
    }
  };
  
  const countries = [
    { name: "Brazil", flag: "br" },
    { name: "Greece", flag: "gr" },
    { name: "Hungary", flag: "hu" },
    { name: "Iceland", flag: "is" },
    { name: "India", flag: "in" },
    { name: "Ireland", flag: "ie" },
    { name: "Italy", flag: "it" },
    { name: "Japan", flag: "jp" },
    { name: "Netherlands", flag: "nl" },
    { name: "Norway", flag: "no" },
    { name: "Poland", flag: "pl" },
    { name: "Portugal", flag: "pt" },
    { name: "Romania", flag: "ro" },
    { name: "Russia", flag: "ru" },
    { name: "Slovakia", flag: "sl" },
    { name: "Slovenia", flag: "si" },
    { name: "South Africa", flag: "za" },
    { name: "Sweden", flag: "se" },
    { name: "Turkey", flag: "tr" },
    { name: "Ukraine", flag: "ua" },
    { name: "United States", flag: "us" },
    { name: "Uruguay", flag: "uy" },
    { name: "Uzbekistan", flag: "uz" }
  ];

  return (
    <aside className="w-64 xl:w-72 bg-surface border-r border-border p-4 space-y-6">
      {/* Country Selector */}
      <div>
        <h3 className="text-sm font-semibold text-muted mb-3">COUNTRIES</h3>
        <div className="space-y-2 max-h-200 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {countries.map((country) => (
            <button
              key={country.name}
              onClick={() => setSelectedCountry(country.name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                selectedCountry === country.name
                  ? "bg-accent text-white"
                  : "text-text hover:bg-white/5"
              }`}
            >
              <img 
                src={getFlagUrl(country.flag)}
                alt={`${country.name} flag`}
                className="w-5 h-4 object-contain flex-shrink-0"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('span');
                  fallback.textContent = '🏳️';
                  fallback.className = 'text-lg';
                  e.currentTarget.parentNode?.insertBefore(fallback, e.currentTarget);
                }}
              />
              <span className="truncate">{country.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
