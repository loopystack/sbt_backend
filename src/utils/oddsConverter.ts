import { OddsFormat } from '../contexts/PreferencesContext';

export interface OddsValue {
  moneyline: number;
  decimal: number;
  fractional: { numerator: number; denominator: number };
}

// Convert between different odds formats
export class OddsConverter {
  // Parse any odds string to decimal format
  static stringToDecimal(oddsString: string): number {
    if (!oddsString || oddsString.trim() === '') {
      return 1;
    }
    
    const cleanString = oddsString.trim();
    console.log(`OddsConverter: Parsing "${cleanString}"`);
    
    // Check if it's already a decimal (contains a dot)
    if (cleanString.includes('.')) {
      const decimal = parseFloat(cleanString);
      return isNaN(decimal) ? 1 : decimal;
    }
    
    // Check if it's fractional (contains a slash)
    if (cleanString.includes('/')) {
      const parts = cleanString.split('/');
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          return this.fractionalToDecimal(numerator, denominator);
        }
      }
    }
    
    // Check if it's moneyline (starts with + or - or is just a number)
    const numericValue = parseFloat(cleanString.replace(/[+-]/g, ''));
    if (!isNaN(numericValue)) {
      if (cleanString.startsWith('+')) {
        return this.moneylineToDecimal(numericValue);
      } else if (cleanString.startsWith('-')) {
        return this.moneylineToDecimal(-numericValue);
      } else {
        // Just a number - check if it's likely moneyline or decimal
        if (numericValue > 100) {
          // Large numbers are likely moneyline odds
          const result = this.moneylineToDecimal(numericValue);
          console.log(`OddsConverter: Large number ${numericValue} treated as moneyline -> ${result}`);
          return result;
        } else if (numericValue >= 1.0 && numericValue <= 10.0) {
          // Numbers between 1-10 are likely decimal odds
          console.log(`OddsConverter: Number ${numericValue} treated as decimal`);
          return numericValue;
        } else {
          // Default to treating as positive moneyline
          const result = this.moneylineToDecimal(numericValue);
          console.log(`OddsConverter: Number ${numericValue} treated as moneyline -> ${result}`);
          return result;
        }
      }
    }
    
    return 1;
  }

  // Convert decimal odds to moneyline
  static decimalToMoneyline(decimal: number): number {
    if (decimal >= 2.0) {
      return Math.round((decimal - 1) * 100);
    } else {
      return Math.round(-100 / (decimal - 1));
    }
  }

  // Convert moneyline to decimal odds
  static moneylineToDecimal(moneyline: number): number {
    if (moneyline > 0) {
      // If Moneyline > 0 (underdog): Decimal = (Moneyline / 100) + 1
      return (moneyline / 100) + 1;
    } else if (moneyline < 0) {
      // If Moneyline < 0 (favorite): Decimal = (100 / |Moneyline|) + 1
      return (100 / Math.abs(moneyline)) + 1;
    } else {
      return 1; // Even money
    }
  }

  // Convert decimal odds to fractional
  static decimalToFractional(decimal: number): { numerator: number; denominator: number } {
    const fractional = decimal - 1;
    const tolerance = 1e-6;
    
    // Find the greatest common divisor
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = fractional;
    
    do {
      const a = Math.floor(b);
      let aux = h1; h1 = a * h1 + h2; h2 = aux;
      aux = k1; k1 = a * k1 + k2; k2 = aux;
      b = 1 / (b - a);
    } while (Math.abs(fractional - h1 / k1) > fractional * tolerance);
    
    return { numerator: h1, denominator: k1 };
  }

  // Convert fractional to decimal odds
  static fractionalToDecimal(numerator: number, denominator: number): number {
    return 1 + (numerator / denominator);
  }

  // Format odds for display based on the selected format
  static formatOdds(odds: number, format: OddsFormat): string {
    switch (format) {
      case 'moneyline':
        const moneyline = this.decimalToMoneyline(odds);
        return moneyline > 0 ? `+${moneyline}` : `${moneyline}`;
      
      case 'decimal':
        return odds.toFixed(2);
      
      case 'fractional':
        const fractional = this.decimalToFractional(odds);
        return `${fractional.numerator}/${fractional.denominator}`;
      
      default:
        return odds.toString();
    }
  }

  // Convert odds from one format to another
  static convertOdds(value: number, fromFormat: OddsFormat, toFormat: OddsFormat): number {
    let decimalOdds: number;

    // First convert to decimal odds
    switch (fromFormat) {
      case 'moneyline':
        decimalOdds = this.moneylineToDecimal(value);
        break;
      case 'decimal':
        decimalOdds = value;
        break;
      case 'fractional':
        decimalOdds = this.fractionalToDecimal(value, 1); // Assuming value is already in decimal form
        break;
      default:
        decimalOdds = value;
    }

    // Then convert from decimal to target format
    switch (toFormat) {
      case 'moneyline':
        return this.decimalToMoneyline(decimalOdds);
      case 'decimal':
        return decimalOdds;
      case 'fractional':
        return decimalOdds; // Return as decimal for fractional display
      default:
        return decimalOdds;
    }
  }
}

// Example usage and testing
export const exampleOdds: OddsValue = {
  moneyline: -200,
  decimal: 1.50,
  fractional: { numerator: 1, denominator: 2 }
};

// Validate that conversions work correctly
export function validateOddsConversion(): boolean {
  const testDecimal = 1.50;
  const convertedMoneyline = OddsConverter.decimalToMoneyline(testDecimal);
  const backToDecimal = OddsConverter.moneylineToDecimal(convertedMoneyline);
  
  return Math.abs(testDecimal - backToDecimal) < 0.01;
}
