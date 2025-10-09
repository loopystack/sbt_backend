/**
 * Utility function to notify the notification system when match results are updated
 * Call this function whenever you update a match result in the database
 */
export const notifyMatchResultUpdated = (matchId: number, matchTeams: string, newResult: string) => {
  console.log('⚽ Match result updated:', {
    matchId,
    matchTeams,
    newResult,
    timestamp: new Date().toISOString()
  });
  
  // Dispatch custom event to trigger notification check
  window.dispatchEvent(new CustomEvent('matchResultUpdated', {
    detail: {
      matchId,
      matchTeams,
      newResult,
      timestamp: new Date().toISOString()
    }
  }));
};

/**
 * Global function to manually trigger settlement check
 * This can be called from anywhere in the app
 */
declare global {
  interface Window {
    triggerSettlementCheck: () => void;
    debugNotificationSystem: () => Promise<void>;
  }
}

// Make the function globally available
if (typeof window !== 'undefined') {
  window.triggerSettlementCheck = () => {
    console.log('🔄 Manual settlement check triggered from global function');
    window.dispatchEvent(new CustomEvent('matchResultUpdated', {
      detail: { manualTrigger: true, timestamp: new Date().toISOString() }
    }));
  };
  
  // Add a more direct debug function
  window.debugNotificationSystem = async () => {
    console.log('🐛 Debug notification system...');
    console.log('Current URL:', window.location.href);
    console.log('Current path:', window.location.pathname);
    
    // Check if NotificationContext is available
    const notificationElements = document.querySelectorAll('[data-notification-context]');
    console.log('Notification context elements found:', notificationElements.length);
    
    // Direct API call to check betting records
    try {
      const { bettingService } = await import('../services/bettingService');
      const response = await bettingService.getBettingRecords(1, 10);
      console.log('🔍 Direct API call result:', response);
      
      // Look for Sevilla vs Real Betis specifically
      const sevillaBet = response.records.find((record: any) => 
        record.match_teams?.toLowerCase().includes('sevilla') && 
        record.match_teams?.toLowerCase().includes('betis')
      );
      
      if (sevillaBet) {
        console.log('⚽ Found Sevilla vs Real Betis bet:', sevillaBet);
      } else {
        console.log('❌ Sevilla vs Real Betis bet not found in API response');
      }
    } catch (error) {
      console.error('❌ Error calling betting service:', error);
    }
    
    // Trigger immediate check
    window.triggerSettlementCheck();
  };
}

/**
 * Example usage:
 * 
 * // After updating match result in database:
 * await updateMatchResult(matchId, "5-5");
 * 
 * // Notify the notification system:
 * notifyMatchResultUpdated(matchId, "Valencia vs Villarreal", "5-5");
 */
