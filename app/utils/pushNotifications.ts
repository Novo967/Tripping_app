// src/utils/pushNotifications.ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { getAuth } from 'firebase/auth';
import { arrayUnion, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // חדש ב-SDK 53
    shouldShowList: true,   // חדש ב-SDK 53
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert('נדרש מכשיר אמיתי');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    Alert.alert('לא התקבלו הרשאות');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId =
    (Constants as any).easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const db = getFirestore();
  await setDoc(
    doc(db, 'users', user.uid),
    {
      expoPushTokens: arrayUnion(expoPushToken),
      pushUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return expoPushToken;
}
