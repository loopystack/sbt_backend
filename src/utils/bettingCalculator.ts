/**
 * Betting Calculator Utility
 * 
 * This utility ensures consistent betting calculations across the entire application.
 * All betting logic should use these functions to maintain consistency.
 */

export interface BettingCalculation {
  stake: number;
  odds: number;
  totalReturn: number;
  profit: number;
  decimalOdds: number;
}

/**
 * Calculate betting returns using decimal odds
 * 
 * Formula: Total Return = Stake × Decimal Odds
 * Profit = Total Return - Stake
 * 
 * @param stake - The amount bet
 * @param decimalOdds - The decimal odds (e.g., 2.5 for +150 American odds)
 * @returns BettingCalculation object with all calculated values
 */
export function calculateBettingReturn(stake: number, decimalOdds: number): BettingCalculation {
  const totalReturn = stake * decimalOdds;
  const profit = totalReturn - stake;
  
  return {
    stake,
    odds: decimalOdds,
    totalReturn,
    profit,
    decimalOdds
  };
}

/**
 * Calculate betting returns from American odds
 * 
 * @param stake - The amount bet
 * @param americanOdds - American odds as string (e.g., "+150", "-200")
 * @returns BettingCalculation object with all calculated values
 */
export function calculateBettingReturnFromAmerican(stake: number, americanOdds: string): BettingCalculation {
  const decimalOdds = americanOddsToDecimal(americanOdds);
  return calculateBettingReturn(stake, decimalOdds);
}

/**
 * Calculate betting returns from decimal odds (already in decimal format)
 * 
 * @param stake - The amount bet
 * @param decimalOddsString - Decimal odds as string (e.g., "2.5", "1.5")
 * @returns BettingCalculation object with all calculated values
 */
export function calculateBettingReturnFromDecimal(stake: number, decimalOddsString: string): BettingCalculation {
  const decimalOdds = parseFloat(decimalOddsString);
  return calculateBettingReturn(stake, decimalOdds);
}

/**
 * Convert American odds to decimal odds
 * 
 * @param americanOdds - American odds as string (e.g., "+150", "-200")
 * @returns Decimal odds
 */
export function americanOddsToDecimal(americanOdds: string): number {
  const odds = parseFloat(americanOdds.replace('+', ''));
  
  if (odds > 0) {
    // Positive American odds: +150 -> 2.50 decimal
    return (odds / 100) + 1;
  } else if (odds < 0) {
    // Negative American odds: -200 -> 1.50 decimal
    return (100 / Math.abs(odds)) + 1;
  } else {
    // Even money
    return 2.0;
  }
}

/**
 * Convert decimal odds to American odds
 * 
 * @param decimalOdds - Decimal odds (e.g., 2.5)
 * @returns American odds as string
 */
export function decimalOddsToAmerican(decimalOdds: number): string {
  if (decimalOdds >= 2.0) {
    // Decimal >= 2.0 -> Positive American odds
    return `+${Math.round((decimalOdds - 1) * 100)}`;
  } else {
    // Decimal < 2.0 -> Negative American odds
    return `${Math.round(-100 / (decimalOdds - 1))}`;
  }
}

/**
 * Validate that the same odds always yield the same profit
 * 
 * This function demonstrates the core principle: same odds = same profit
 * regardless of match, team, or sport.
 * 
 * @param stake - The stake amount
 * @param decimalOdds - The decimal odds
 * @returns Object with validation results
 */
export function validateConsistentBetting(stake: number, decimalOdds: number): {
  isValid: boolean;
  calculation: BettingCalculation;
  message: string;
} {
  const calculation = calculateBettingReturn(stake, decimalOdds);
  
  // The profit should always be: stake × (decimalOdds - 1)
  const expectedProfit = stake * (decimalOdds - 1);
  const isValid = Math.abs(calculation.profit - expectedProfit) < 0.01;
  
  return {
    isValid,
    calculation,
    message: isValid 
      ? `✅ Consistent: $${stake} at ${decimalOdds} odds = $${calculation.profit.toFixed(2)} profit`
      : `❌ Inconsistent: Expected $${expectedProfit.toFixed(2)}, got $${calculation.profit.toFixed(2)}`
  };
}

/**
 * Example usage and testing
 */
export function runBettingTests(): void {
  console.log('🧪 Running Betting Logic Tests...');
  
  // Test 1: Same odds, different stakes
  const test1a = calculateBettingReturn(10, 2.5);
  const test1b = calculateBettingReturn(20, 2.5);
  
  console.log('Test 1 - Same odds (2.5), different stakes:');
  console.log(`  $10 stake: $${test1a.profit.toFixed(2)} profit`);
  console.log(`  $20 stake: $${test1b.profit.toFixed(2)} profit`);
  console.log(`  Ratio: ${(test1b.profit / test1a.profit).toFixed(2)}x (should be 2x)`);
  
  // Test 2: Same stake, different odds
  const test2a = calculateBettingReturn(10, 2.0);
  const test2b = calculateBettingReturn(10, 3.0);
  
  console.log('Test 2 - Same stake ($10), different odds:');
  console.log(`  2.0 odds: $${test2a.profit.toFixed(2)} profit`);
  console.log(`  3.0 odds: $${test2b.profit.toFixed(2)} profit`);
  
  // Test 3: American odds conversion
  const test3a = calculateBettingReturnFromAmerican(10, '+150');
  const test3b = calculateBettingReturnFromAmerican(10, '-200');
  
  console.log('Test 3 - American odds conversion:');
  console.log(`  +150 odds: $${test3a.profit.toFixed(2)} profit`);
  console.log(`  -200 odds: $${test3b.profit.toFixed(2)} profit`);
  
  // Test 4: The specific bug case - $10 at 2.5 odds
  const test4 = calculateBettingReturnFromDecimal(10, '2.5');
  console.log('Test 4 - $10 at 2.5 odds (the bug case):');
  console.log(`  Total Return: $${test4.totalReturn.toFixed(2)} (should be $25.00)`);
  console.log(`  Profit: $${test4.profit.toFixed(2)} (should be $15.00)`);
  console.log(`  Correct: ${test4.totalReturn === 25 && test4.profit === 15 ? '✅' : '❌'}`);
  
  console.log('✅ All tests completed!');
}
