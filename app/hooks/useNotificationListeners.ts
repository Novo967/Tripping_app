// src/hooks/useNotificationListeners.ts
import * as Notifications from 'expo-notifications';
import { User } from 'firebase/auth'; // ייבוא סוג המשתמש של פיירבייס
import { useEffect, useRef } from 'react';

import { registerForPushNotificationsAsync } from '../utils/pushNotifications';

export function useNotificationListeners(user: User | null) {
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // הפעלת רישום הטוקן רק אם יש משתמש מחובר
    if (user) {
      registerForPushNotificationsAsync();
    }
    
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
  }, [user]); // ה-Hook יופעל מחדש כאשר אובייקט המשתמש יהיה זמין
}