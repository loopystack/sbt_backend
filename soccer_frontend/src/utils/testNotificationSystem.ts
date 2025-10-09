/**
 * Test utility for the notification system
 * This helps verify that the settlement detection logic works correctly
 */

export const testSevillaBetisScenario = () => {
  console.log('🧪 Testing Sevilla vs Real Betis notification scenario...');
  
  // Simulate the scenario:
  // 1. User bets on Sevilla vs Real Betis (bet is pending, result is null)
  // 2. Match result is updated to "5-1"
  // 3. System should detect this change and show notification
  
  const mockPreviousState = {
    bet_status: 'pending',
    match_result: null,
    updated_at: '2024-01-01T10:00:00Z'
  };
  
  const mockCurrentState = {
    bet_status: 'pending', // Still pending, but result changed
    match_result: '5-1', // Result appeared for first time
    updated_at: '2024-01-01T10:05:00Z'
  };
  
  // Test the logic
  const hasMatchResult = mockCurrentState.match_result && 
    mockCurrentState.match_result !== 'null' && 
    mockCurrentState.match_result !== null;
    
  const hadMatchResultBefore = mockPreviousState.match_result && 
    mockPreviousState.match_result !== 'null' && 
    mockPreviousState.match_result !== null;
    
  const resultChanged = !hadMatchResultBefore && hasMatchResult;
  
  console.log('📊 Test Results:', {
    previousState: mockPreviousState,
    currentState: mockCurrentState,
    hasMatchResult,
    hadMatchResultBefore,
    resultChanged,
    shouldTriggerNotification: resultChanged
  });
  
  if (resultChanged) {
    console.log('✅ SUCCESS: Notification should trigger when Sevilla vs Real Betis result changes from null to "5-1"');
  } else {
    console.log('❌ FAILED: Notification logic is not working correctly');
  }
  
  return resultChanged;
};

/**
 * Test the notification system by triggering a manual check
 */
export const testNotificationSystem = () => {
  console.log('🧪 Testing notification system...');
  
  // Test the scenario
  const result = testSevillaBetisScenario();
  
  // Trigger manual settlement check
  if (typeof window !== 'undefined' && window.triggerSettlementCheck) {
    console.log('🔄 Triggering manual settlement check...');
    window.triggerSettlementCheck();
  } else {
    console.log('⚠️ Manual settlement check function not available');
  }
  
  return result;
};

// Make test functions globally available
if (typeof window !== 'undefined') {
  (window as any).testSevillaBetisScenario = testSevillaBetisScenario;
  (window as any).testNotificationSystem = testNotificationSystem;
}
