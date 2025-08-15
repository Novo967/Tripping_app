import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { auth } from '../firebaseConfig';
import SplashScreen from './SplashScreen';

// 🔔 הוספה של הפונקציות שלנו
import { useNotificationListeners } from '../app/hooks/useNotificationListeners';
import { registerForPushNotificationsAsync } from '../app/utils/pushNotifications';

// מונע מהאפליקציה להפוך לכיוון RTL (מימין לשמאל)
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function AppEntry() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // ✅ מאזינים להתראות
  useNotificationListeners();

  useEffect(() => {
    // ✅ רישום לקבלת טוקן פוש
    registerForPushNotificationsAsync();

    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    // Firebase auth listener
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
