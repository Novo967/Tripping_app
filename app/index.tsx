import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, Platform, View } from 'react-native';
import { getExpoPushToken } from '../app/utils/pushNotifications';
import { auth } from '../firebaseConfig';
import SplashScreen from './SplashScreen';

// מונע מהאפליקציה להפוך לכיוון RTL (מימין לשמאל)
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function AppEntry() {
  const router = useRouter();
  const [isSplashTimerDone, setIsSplashTimerDone] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    // שלב 1: יצירת ערוץ התראות באנדרואיד (נשאר כפי שהיה)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'הודעות צ\'אט',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // שלב 2: התחלת קבלת טוקן ההתראות (נשאר כפי שהיה)
    const fetchToken = async () => {
      console.log('AppEntry: מתחיל בקשת טוקן התראות.');
      const token = await getExpoPushToken();
      if (token) {
        console.log('AppEntry: טוקן התקבל בהצלחה!');
        setExpoPushToken(token);
      } else {
        console.log('AppEntry: שגיאה בקבלת הטוקן.');
      }
    };
    fetchToken();

    // שלב 3: טיימר לספלאש סקרין
    const splashTimer = setTimeout(() => {
      setIsSplashTimerDone(true);
      console.log('AppEntry: טיימר לספלאש סקרין הסתיים.');
    }, 3300);

    // שלב 4: Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsAuthChecked(true);
      // הוספה של הדפסת מצב המשתמש לקונסול
      if (authUser) {
        console.log('AppEntry: onAuthStateChanged - נמצא משתמש מחובר:', authUser.uid);
      } else {
        console.log('AppEntry: onAuthStateChanged - אין משתמש מחובר.');
      }
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // שלב 5: ניווט רק לאחר ששני התנאים מתקיימים
    console.log(`AppEntry: בדיקת ניווט - isAuthChecked: ${isAuthChecked}, isSplashTimerDone: ${isSplashTimerDone}, user: ${!!user}`);
    if (isAuthChecked && isSplashTimerDone) {
      if (user) {
        console.log('AppEntry: ניווט למסך הבית.');
        router.replace('/(tabs)/home');
      } else {
        console.log('AppEntry: ניווט למסך התחברות.');
        router.replace('/Authentication/login');
      }
    }
  }, [isAuthChecked, isSplashTimerDone, user, router]);

  // הצגת ספלאש סקרין
  if (!isSplashTimerDone) {
    console.log('AppEntry: מציג ספלאש סקרין.');
    return <SplashScreen />;
  }

  // הצגת טוען (loader) בזמן בדיקת אימות המשתמש
  if (!isAuthChecked) {
    console.log('AppEntry: מציג טוען, ממתין לאימות Firebase.');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // מחזיר null לאחר שהניווט בוצע
  console.log('AppEntry: הניווט בוצע, מחזיר null.');
  return null;
}
