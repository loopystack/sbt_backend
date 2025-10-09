import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface BetNotification {
  id: number;
  match_teams: string;
  bet_status: 'pending' | 'won' | 'lost';
  bet_amount: number;
  potential_win?: number;
  actual_profit?: number;
  created_at: string;
  settled_at?: string;
  isNewBet: boolean; // true if newly placed, false if newly settled
}

interface NotificationContextType {
  betNotificationsCount: number;
  betNotifications: BetNotification[];
  clearNotifications: () => void;
  markAsRead: () => void;
  isRead: boolean;
  addNewBetNotification: (betId: number, matchTeams: string, betAmount: number, potentialWin?: number) => void;
  triggerSettlementCheck: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [betNotifications, setBetNotifications] = useState<BetNotification[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [userBets, setUserBets] = useState<Set<number>>(new Set()); // Track user's bet IDs
  const [previousBetStates, setPreviousBetStates] = useState<Map<number, any>>(new Map()); // Track previous bet states
  const [isInitialized, setIsInitialized] = useState(false); // Track if initial state is set
  const { isAuthenticated } = useAuth();

  // Get bet notifications count (new bets + newly settled bets since last dashboard visit)
  const betNotificationsCount = betNotifications.length;

  // Add notification immediately when a new bet is placed
  const addNewBetNotification = (betId: number, matchTeams: string, betAmount: number, potentialWin?: number) => {
    console.log('🎯 Adding new bet notification:', { betId, matchTeams, betAmount, potentialWin });
    
    const newBetNotification: BetNotification = {
      id: betId,
      match_teams: matchTeams,
      bet_status: 'pending',
      bet_amount: betAmount,
      potential_win: potentialWin,
      created_at: new Date().toISOString(),
      isNewBet: true
    };

    setBetNotifications(prev => {
      // Avoid duplicates
      if (prev.some(bet => bet.id === betId)) {
        return prev;
      }
      return [...prev, newBetNotification];
    });

    // Show notification if user is not currently on dashboard
    const currentPath = window.location.pathname;
    if (currentPath !== '/dashboard') {
      setIsRead(false);
      console.log('🔔 Showing notification for new bet:', matchTeams);
    }
  };

  // Check for newly settled bets
  const checkSettledBets = async () => {
    if (!isAuthenticated || !isInitialized) {
      console.log('⏳ Skipping settlement check - not authenticated or not initialized');
      return;
    }

    try {
      // Import bettingService dynamically to avoid circular dependencies
      const { bettingService } = await import('../services/bettingService');
      
      // Get recent betting records to check for newly settled bets
      const response = await bettingService.getBettingRecords(1, 100); // Get recent 100 records
      
      console.log('🔍 Checking for settled bets...');
      console.log('📊 Total betting records found:', response.records.length);
      console.log('🎯 Current user bets:', Array.from(userBets));
      console.log('📋 Previous bet states:', Array.from(previousBetStates.entries()));
      
      // Track current user's bets
      const currentUserBets = new Set<number>();
      
      // Find newly settled bets (bets with updated results or status changes)
      const newlySettled: BetNotification[] = [];
      
      response.records.forEach((record: any) => {
        // Track all user bets
        currentUserBets.add(record.id);
        
        // Debug log for each bet
        console.log(`📝 Checking bet ${record.id}:`, {
          match_teams: record.match_teams,
          bet_status: record.bet_status,
          is_settled: record.is_settled,
          settlement_date: record.settlement_date,
          updated_at: record.updated_at
        });
        
        // Get previous state of this bet
        const previousState = previousBetStates.get(record.id);
        
        // Special logging for Sevilla vs Real Betis
        if (record.match_teams?.toLowerCase().includes('sevilla') && 
            record.match_teams?.toLowerCase().includes('betis')) {
          console.log('⚽ Checking Sevilla vs Real Betis bet:', {
            id: record.id,
            match_teams: record.match_teams,
            bet_status: record.bet_status,
            is_settled: record.is_settled,
            settlement_date: record.settlement_date,
            updated_at: record.updated_at,
            previousState: previousState ? {
              bet_status: previousState.bet_status,
              is_settled: previousState.is_settled,
              settlement_date: previousState.settlement_date,
              updated_at: previousState.updated_at
            } : 'No previous state'
          });
        }
        
        // Check if this is a newly settled bet
        const isSettled = record.bet_status === 'won' || record.bet_status === 'lost';
        const wasUserBet = userBets.has(record.id); // Was this bet in our previous tracking?
        
        // Check for changes that indicate settlement:
        // 1. Bet status changed from pending to won/lost
        // 2. Bet was recently settled (is_settled changed to true)
        // 3. Settlement date appeared for the first time
        const wasSettledBefore = previousState && (previousState.bet_status === 'won' || previousState.bet_status === 'lost');
        
        const statusChanged = previousState && previousState.bet_status !== record.bet_status;
        const isNewlySettled = !wasSettledBefore && isSettled; // Just got settled
        const settlementDateChanged = !previousState?.settlement_date && record.settlement_date; // Settlement date appeared
        
        // Detect settlement if:
        // - Status changed to won/lost, OR
        // - Bet was newly settled (was pending, now won/lost), OR  
        // - Settlement date appeared for first time, OR
        // - Bet was recently updated (within last 2 minutes)
        const isRecentlyUpdated = record.updated_at && 
          new Date(record.updated_at).getTime() > (Date.now() - 2 * 60 * 1000); // 2 minutes ago
        
        const isNewSettlement = wasUserBet && (
          (statusChanged && isSettled) || // Status changed to won/lost
          isNewlySettled || // Bet was newly settled
          settlementDateChanged || // Settlement date appeared for first time
          (isRecentlyUpdated && isSettled) // Recently updated and now settled
        );
        
        if (isNewSettlement) {
          console.log('🎉 Found newly settled bet:', {
            id: record.id,
            match: record.match_teams,
            currentStatus: record.bet_status,
            previousStatus: previousState?.bet_status,
            currentSettlementDate: record.settlement_date,
            previousSettlementDate: previousState?.settlement_date,
            amount: record.bet_amount,
            potential_win: record.potential_win,
            actual_profit: record.actual_profit,
            updatedAt: record.updated_at,
            statusChanged: statusChanged && isSettled,
            isNewlySettled: isNewlySettled,
            settlementDateChanged: settlementDateChanged,
            isRecentlyUpdated: isRecentlyUpdated,
            // Special check for Sevilla vs Real Betis
            isSevillaBetis: record.match_teams?.toLowerCase().includes('sevilla') && 
                           record.match_teams?.toLowerCase().includes('betis')
          });
          
          newlySettled.push({
            id: record.id,
            match_teams: record.match_teams,
            bet_status: record.bet_status,
            bet_amount: record.bet_amount,
            potential_win: record.potential_win,
            actual_profit: record.actual_profit,
            created_at: record.created_at,
            settled_at: record.settled_at || record.updated_at || new Date().toISOString(),
            isNewBet: false // This is a settlement, not a new bet
          });
        }
        
        // Update previous state for this bet
        setPreviousBetStates(prev => {
          const newMap = new Map(prev);
          newMap.set(record.id, {
            bet_status: record.bet_status,
            is_settled: record.is_settled,
            settlement_date: record.settlement_date,
            updated_at: record.updated_at,
            actual_profit: record.actual_profit
          });
          return newMap;
        });
      });

      // Update user bets tracking
      setUserBets(currentUserBets);

      if (newlySettled.length > 0) {
        console.log('🎉 Found', newlySettled.length, 'newly settled bets');
        
        // Add new settled bets to the notification list
        setBetNotifications(prevBets => {
          const existingIds = new Set(prevBets.map(bet => bet.id));
          const newBets = newlySettled.filter(bet => !existingIds.has(bet.id));
          return [...prevBets, ...newBets];
        });
        
        // Show notification if user is not currently on dashboard
        const currentPath = window.location.pathname;
        if (currentPath !== '/dashboard') {
          setIsRead(false);
          console.log('🔔 Showing notification for', newlySettled.length, 'settled bets');
        }
      } else {
        console.log('✅ No newly settled bets found');
      }
      
    } catch (error) {
      console.error('❌ Error checking settled bets:', error);
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    console.log('🧹 Clearing all notifications');
    setBetNotifications([]);
    setIsRead(true);
    // Don't clear userBets - we need to keep tracking them to detect new settlements
  };

  // Mark notifications as read (but keep them visible until dashboard visit)
  const markAsRead = () => {
    setIsRead(true);
  };

  // Trigger immediate settlement check (useful when match results are manually updated)
  const triggerSettlementCheck = async () => {
    console.log('🔄 Manual settlement check triggered');
    await checkSettledBets();
  };

  // Initialize user bets tracking and check for settled bets periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial check to populate user bets and check for settlements
    const initializeTracking = async () => {
      try {
        const { bettingService } = await import('../services/bettingService');
        const response = await bettingService.getBettingRecords(1, 100);
        
        // Initialize user bets tracking
        const initialBets = new Set(response.records.map((record: any) => record.id));
        setUserBets(initialBets);
        
        // Initialize previous bet states
        const initialStates = new Map<number, any>();
        response.records.forEach((record: any) => {
          initialStates.set(record.id, {
            bet_status: record.bet_status,
            is_settled: record.is_settled,
            settlement_date: record.settlement_date,
            updated_at: record.updated_at,
            actual_profit: record.actual_profit
          });
        });
        setPreviousBetStates(initialStates);
        setIsInitialized(true);
        
        console.log('🎯 Initialized tracking for', initialBets.size, 'user bets');
        console.log('📊 Initial states set for bets:', Array.from(initialStates.keys()));
        
        // Wait a bit before first check to avoid false positives
        setTimeout(async () => {
          await checkSettledBets();
        }, 1000);
      } catch (error) {
        console.error('Error initializing bet tracking:', error);
      }
    };

    initializeTracking();

    // Check every 30 seconds for new settled bets (more responsive)
    const interval = setInterval(checkSettledBets, 30 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Listen for route changes
  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/dashboard') {
        console.log('🏠 Route changed to Dashboard - clearing notifications');
        clearNotifications();
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    // Also check on focus (when user switches back to tab)
    window.addEventListener('focus', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('focus', handleRouteChange);
    };
  }, [clearNotifications]);

  // Listen for new bet placement events and match result updates
  useEffect(() => {
    const handleNewBet = (event: CustomEvent) => {
      console.log('🎯 New bet placed, updating tracking:', event.detail);
      
      // Refresh user bets tracking when a new bet is placed
      const refreshUserBets = async () => {
        try {
          const { bettingService } = await import('../services/bettingService');
          const response = await bettingService.getBettingRecords(1, 100);
          
          const currentBets = new Set(response.records.map((record: any) => record.id));
          setUserBets(currentBets);
          
          console.log('🔄 Updated user bets tracking:', currentBets.size, 'total bets');
        } catch (error) {
          console.error('Error refreshing user bets:', error);
        }
      };
      
      refreshUserBets();
    };

    const handleMatchResultUpdate = (event: CustomEvent) => {
      console.log('⚽ Match result updated, checking for settlements:', event.detail);
      
      // Trigger immediate settlement check when match results are updated
      triggerSettlementCheck();
    };

    // Listen for custom events
    window.addEventListener('bettingDataChanged', handleNewBet as EventListener);
    window.addEventListener('matchResultUpdated', handleMatchResultUpdate as EventListener);
    
    return () => {
      window.removeEventListener('bettingDataChanged', handleNewBet as EventListener);
      window.removeEventListener('matchResultUpdated', handleMatchResultUpdate as EventListener);
    };
  }, [triggerSettlementCheck]);

  // Debug logging
  useEffect(() => {
    if (betNotificationsCount > 0) {
      console.log('🔔 Current notification state:', {
        betNotificationsCount,
        betNotifications: betNotifications.map(bet => ({
          id: bet.id,
          match: bet.match_teams,
          status: bet.bet_status,
          isNewBet: bet.isNewBet
        })),
        isRead
      });
    }
  }, [betNotificationsCount, betNotifications, isRead]);

  const value: NotificationContextType = {
    betNotificationsCount,
    betNotifications,
    clearNotifications,
    markAsRead,
    isRead,
    addNewBetNotification,
    triggerSettlementCheck
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
