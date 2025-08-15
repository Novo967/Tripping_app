// src/utils/pushNotifications.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// הקובץ הזה יתמקד כעת אך ורק בקבלת טוקן ההתראות של Expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getExpoPushToken() {
  console.log('1. התחלתי את תהליך רישום ההתראות.');
  if (!Device.isDevice) {
    Alert.alert('נדרש מכשיר אמיתי');
    console.log('1a. יצאתי: לא מכשיר פיזי.');
    return null;
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
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
    console.log('3. ערוץ התראות אנדרואיד הוגדר.');
  }

  const projectId = 'b1f09d27-4461-43f4-9fa5-cc2e132c8afc';

  console.log('4. מזהה פרויקט Expo:', projectId);

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResponse.data;
    console.log('5. טוקן התראות התקבל:', expoPushToken);
    return expoPushToken;
  } catch (error) {
    console.error('שגיאה בקבלת הטוקן של Expo:', error);
    return null;
  }
}