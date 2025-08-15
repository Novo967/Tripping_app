// src/hooks/useNotificationListeners.ts
import * as Notifications from 'expo-notifications';
import { User } from 'firebase/auth'; // ייבוא סוג המשתמש של פיירבייס
import { useEffect, useRef, useState } from 'react';

import { getAuth } from 'firebase/auth';
import { arrayUnion, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';


import { getExpoPushToken } from '../utils/pushNotifications';

export function useNotificationListeners(user: User | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  // useEffect ראשון: קבלת הטוקן רק פעם אחת בטעינה ראשונית של האפליקציה
  useEffect(() => {
    const fetchToken = async () => {
      const token = await getExpoPushToken();
      if (token) {
        setExpoPushToken(token);
      }
    };
    fetchToken();
  }, []);

  // useEffect שני: שמירת הטוקן בפיירבייס רק לאחר שהמשתמש התחבר והטוקן זמין
  useEffect(() => {
    if (user && expoPushToken) {
      const saveTokenToFirebase = async () => {
        const auth = getAuth();
        const db = getFirestore();

        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              expoPushTokens: arrayUnion(expoPushToken),
              pushUpdatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          console.log('7. הטוקן נשמר בהצלחה בפיירבייס!');
        } catch (error) {
          console.error('שגיאה בשמירת הטוקן בפיירבייס:', error);
        }
      };

      saveTokenToFirebase();
    }
  }, [user, expoPushToken]);

  // האזנה להתראות בזמן אמת, כפי שהיה קודם
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
  }, []); // ה-Hook יופעל רק פעם אחת בטעינה
}