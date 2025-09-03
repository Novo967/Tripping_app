import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { getExpoPushToken } from '../app/utils/pushNotifications';
import { auth } from '../firebaseConfig';

// מונע מהספלאש סקרין המובנה להיעלם אוטומטית
SplashScreen.preventAutoHideAsync();

// מונע מהאפליקציה להפוך לכיוון RTL (מימין לשמאל)
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function AppEntry() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // שלב 1: יצירת ערוץ התראות באנדרואיד
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('chat-messages', {
            name: 'הודעות צ\'אט',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // שלב 2: קבלת טוקן התראות
        const token = await getExpoPushToken();
        if (token) {
          setExpoPushToken(token);
        }

        // שלב 3: בדיקת אימות משתמש
        const authPromise = new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            unsubscribe();
            resolve();
          });
        });

        // שלב 4: טיימר מינימלי למסך הפתיחה
        const splashTimerPromise = new Promise((resolve) => {
          setTimeout(resolve, 3300);
        });

        // ממתין לכל הפעולות להסתיים במקביל
        await Promise.all([authPromise, splashTimerPromise]);

      } catch (e) {
        console.warn('AppEntry: שגיאה בתהליך ההכנה', e);
      } finally {
        // לאחר שכל הפעולות הסתיימו, האפליקציה מוכנה
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // אם האפליקציה מוכנה, נעלים את הספלאש סקרין
      await SplashScreen.hideAsync();
      
      // שלב 5: ניווט
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/Authentication/login');
      }
    }
  }, [appIsReady, user, router]);

  if (!appIsReady) {
    return null; // הגישה הנכונה: לא להציג כלום בזמן הטעינה כדי למנוע מסך שחור
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {/* כאן יתר התוכן של האפליקציה יטען לאחר שהספלאש סקרין הוסר */}
    </View>
  );
}