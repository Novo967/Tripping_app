import * as Notifications from 'expo-notifications'; // ייבוא ספריית נוטיפיקציות
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
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
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    // שלב 1: יצירת ערוץ התראות באנדרואיד
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'הודעות צ\'אט',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // שלב 2: התחלת קבלת טוקן ההתראות במקביל לספלאש סקרין
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

    // שלב 3: טיימר להצגת הספלאש סקרין ואימות
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    // שלב 4: Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthChecked(true);
      // Navigation logic is now here after auth check is complete
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/Authentication/login');
      }
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, []); // The empty dependency array ensures this effect runs only once

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen />;
  }

  // Show loading indicator while checking auth after splash
  if (!isAuthChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}