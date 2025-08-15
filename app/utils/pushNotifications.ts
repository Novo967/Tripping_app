// src/utils/pushNotifications.ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { getAuth } from 'firebase/auth';
import { arrayUnion, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  console.log('1. התחלתי את תהליך רישום ההתראות.');
  if (!Device.isDevice) {
    Alert.alert('נדרש מכשיר אמיתי');
    console.log('1a. יצאתי: לא מכשיר פיזי.');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('2. סטטוס הרשאות קיים:', existingStatus);
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('2a. סטטוס הרשאות חדש:', finalStatus);
  }
  if (finalStatus !== 'granted') {
    Alert.alert('לא התקבלו הרשאות');
    console.log('2b. יצאתי: אין הרשאות.');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
    console.log('3. ערוץ התראות אנדרואיד הוגדר.');
  }

  const projectId =
    (Constants as any).easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  console.log('4. מזהה פרויקט Expo:', projectId);

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
  console.log('5. טוקן התראות התקבל:', expoPushToken);

  const auth = getAuth();
  const user = auth.currentUser;
  console.log('6. משתמש נוכחי:', user?.uid);
  if (!user) {
    console.log('6a. יצאתי: אין משתמש מחובר.');
    return;
  }

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

  return expoPushToken;
}