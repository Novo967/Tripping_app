import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import SplashScreenComponent from './SplashScreen';
import { getExpoPushToken, setupNotificationResponseHandler } from './utils/pushNotifications';

// מונע מהספלאש סקרין המובנה להיעלם אוטומטית
SplashScreen.preventAutoHideAsync();

// מונע מהאפליקציה להפוך לכיוון RTL
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const updateUserLocation = async (user: User) => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission was denied. Cannot update location.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      last_location: {
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('User location updated successfully!');
  } catch (error) {
    console.error('Failed to update user location:', error);
  }
};

export default function AppEntry() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // יצירת ערוץ התראות באנדרואיד
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('chat-messages', {
            name: 'הודעות צ\'אט',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // קבלת טוקן פוש
        const token = await getExpoPushToken();
        if (token) {
          setExpoPushToken(token);
        }

        // בדיקת סטטוס התחברות
        const authPromise = new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            unsubscribe();
            resolve();
          });
        });

        // זמן מינימום לספלש
        const splashTimerPromise = new Promise((resolve) => {
          setTimeout(resolve, 2800);
        });

        await Promise.all([authPromise, splashTimerPromise]);
      } catch (e) {
        console.warn('AppEntry: שגיאה בתהליך ההכנה', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // הגדרת מאזין להתראות - רק פעם אחת כשהאפליקציה נטענת
  useEffect(() => {
    const responseListener = setupNotificationResponseHandler();
    return () => responseListener.remove();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();

      if (user) {
        await updateUserLocation(user);
        router.replace('/(tabs)/home');
      } else {
        router.replace('/Authentication/login');
      }
    }
  }, [appIsReady, user, router]);

  // בזמן טעינה – מציג את מסך הספלש עם הווידאו
  if (!appIsReady) {
    return <SplashScreenComponent />;
  }

  // אחרי טעינה – מציג את האפליקציה
  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {/* כאן ייטען שאר התוכן */}
    </View>
  );
}