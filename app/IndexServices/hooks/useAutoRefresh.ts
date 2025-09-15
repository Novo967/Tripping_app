// IndexServices/hooks/useAutoRefresh.ts
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAutoRefreshProps {
  onRefresh: () => Promise<void> | void;
  intervalMinutes?: number;
  enabled?: boolean;
  pauseOnModal?: boolean;
  isModalOpen?: boolean;
}

export const useAutoRefresh = ({
  onRefresh,
  intervalMinutes = 2.5,
  enabled = true,
  pauseOnModal = true,
  isModalOpen = false
}: UseAutoRefreshProps) => {
  // שינוי הטיפוס לכלול גם number
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRefreshRef = useRef<number>(Date.now());
  const refreshCountRef = useRef<number>(0);

  // פונקציית refresh חכמה שמונעת refresh מיותרים
  const smartRefresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    const minInterval = intervalMinutes * 60 * 1000; // המרה לאלפיות השנייה

    // אל תעשה refresh אם עבר פחות מהזמן המינימלי
    if (timeSinceLastRefresh < minInterval * 0.8) {
      return;
    }

    try {
      console.log(`🔄 Auto-refreshing map data (refresh #${refreshCountRef.current + 1})`);
      await onRefresh();
      lastRefreshRef.current = now;
      refreshCountRef.current += 1;
    } catch (error) {
      console.warn('Auto-refresh failed:', error);
    }
  }, [onRefresh, intervalMinutes]);

  // פונקציה לבדיקה אם צריך לעשות refresh
  const shouldRefresh = useCallback(() => {
    if (!enabled) return false;
    if (pauseOnModal && isModalOpen) return false;
    if (appStateRef.current !== 'active') return false;
    return true;
  }, [enabled, pauseOnModal, isModalOpen]);

  // הפעלה וביטול של הטיימר
  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (shouldRefresh()) {
        smartRefresh();
      }
    }, intervalMinutes * 60 * 1000);
  }, [intervalMinutes, shouldRefresh, smartRefresh]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // מאזין לשינויים ב-AppState (כשהאפליקציה חוזרת לפורגראונד)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      appStateRef.current = nextAppState;

      if (wasInBackground && isNowActive && shouldRefresh()) {
        // כשחוזרים מהרקע, בדוק אם צריך refresh מיידי
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;
        const minInterval = intervalMinutes * 60 * 1000;

        if (timeSinceLastRefresh >= minInterval) {
          console.log('🔄 App returned from background - refreshing data');
          smartRefresh();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [shouldRefresh, smartRefresh, intervalMinutes]);

  // ניהול הטיימר הראשי
  useEffect(() => {
    if (enabled && shouldRefresh()) {
      startInterval();
    } else {
      stopInterval();
    }

    return stopInterval;
  }, [enabled, shouldRefresh, startInterval, stopInterval]);

  // פונקציה ידנית לרענון מיידי
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing map data');
    await smartRefresh();
  }, [smartRefresh]);

  // פונקציה לאיפוס מונה הזמן
  const resetTimer = useCallback(() => {
    lastRefreshRef.current = Date.now();
    if (enabled) {
      stopInterval();
      startInterval();
    }
  }, [enabled, stopInterval, startInterval]);

  return {
    forceRefresh,
    resetTimer,
    refreshCount: refreshCountRef.current,
    isEnabled: enabled && shouldRefresh()
  };
};