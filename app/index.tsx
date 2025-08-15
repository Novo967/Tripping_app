import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { getExpoPushToken } from '../app/utils/pushNotifications'; // ייבוא הפונקציה לקבלת הטוקן
import { auth } from '../firebaseConfig';
import SplashScreen from './SplashScreen';

// מונע מהאפליקציה להפוך לכיוון RTL (מימין לשמאל)
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function AppEntry() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null); // הוספת משתנה מצב לטוקן

  useEffect(() => {
    // שלב 1: התחלת קבלת טוקן ההתראות במקביל לספלאש סקרין
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

    // שלב 2: טיימר להצגת הספלאש סקרין
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    // שלב 3: Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthChecked(true);

      // Only navigate after splash is done
      if (!showSplash) {
        if (user) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/Authentication/login');
        }
      }
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, [showSplash]);

  // Navigate after splash is done and auth is checked
  useEffect(() => {
    if (!showSplash && isAuthChecked) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/Authentication/login');
        }
      });
    }
  }, [showSplash, isAuthChecked]);

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