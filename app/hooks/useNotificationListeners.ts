// src/hooks/useNotificationListeners.ts
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

export function useNotificationListeners() {
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    receivedSub.current = Notifications.addNotificationReceivedListener((n) => {
      console.log('התראה התקבלה:', n);
    });

    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('המשתמש לחץ על התראה:', response);
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);
}
