import React, { useState } from 'react';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { OddsFormat } from '../contexts/PreferencesContext';

export default function OddsDemo() {
  const { oddsFormat, getOddsInFormat } = useOddsFormat();
  const [inputOdds, setInputOdds] = useState(1.50);

  const exampleOdds = [
    { name: 'Home Win', decimal: 2.10 },
    { name: 'Draw', decimal: 3.40 },
    { name: 'Away Win', decimal: 3.20 }
  ];

  return (
    <div className="bg-surface border border-border rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-text mb-4">Odds Format Demo</h3>
      
      <div className="mb-4">
        <p className="text-sm text-muted mb-2">
          Current format: <span className="text-accent font-medium">{oddsFormat}</span>
        </p>
        <div className="flex gap-4 items-center">
          <label className="text-sm text-text">Test odds:</label>
          <input
            type="number"
            value={inputOdds}
            onChange={(e) => setInputOdds(parseFloat(e.target.value) || 0)}
            step="0.01"
            min="1.01"
            className="px-3 py-1 text-sm bg-bg border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 text-text"
          />
          <span className="text-text font-medium">
            = {getOddsInFormat(inputOdds)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-md font-medium text-text">Example Match Odds:</h4>
        {exampleOdds.map((odds) => (
          <div key={odds.name} className="flex justify-between items-center p-3 bg-bg/50 rounded-lg border border-border/50">
            <span className="text-text font-medium">{odds.name}</span>
            <span className="text-accent font-bold text-lg">
              {getOddsInFormat(odds.decimal)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
        <p className="text-sm text-text">
          <strong>Format Info:</strong> Odds are automatically converted and displayed in your selected format. 
          The conversion happens in real-time as you change the format preference.
        </p>
      </div>
    </div>
  );
}
