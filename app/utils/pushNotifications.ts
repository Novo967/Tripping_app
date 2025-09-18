// src/utils/pushNotifications.ts
import * as Device from 'expo-device';
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Alert, Linking, Platform } from 'react-native';

// הקובץ הזה יתמקד כעת אך ורק בקבלת טוקן ההתראות של Expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function openNotificationSettings() {
  if (Platform.OS === "ios") {
    // ב־iOS אפשר לפתוח רק את דף ההגדרות של האפליקציה
    Linking.openSettings();
  } else if (Platform.OS === "android") {
    // ב־Android אפשר לפתוח ישירות את דף ההתראות של האפליקציה
    IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
      {
        extra: {
          "android.provider.extra.APP_PACKAGE": "com.yourapp.bundleid", // שים כאן את ה־package name שלך
        },
      }
    );
  }
}

// פונקציה לטיפול בניווט בהתבסס על סוג ההתראה
function handleNotificationNavigation(data: any) {
  if (!data) {
    console.log('8. דאטה ההתראה ריקה');
    return;
  }

  console.log('8. מטפל בניווט להתראה:', data);

  // בהתבסס על הדאטה של ההתראה, נווט לדף המתאים
  if (data.type === 'personal_message') {
    // התראה מצ'ט אישי - נווט לדף הצ'אט האישי
    router.push({
      pathname: '/Chats/PersonalChat/chatModal',
      params: {
        otherUserId: data.userId,
        otherUsername: data.userName,
        otherUserImage: data.userImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png'
      }
    });
    console.log('8a. ניווט לצ\'אט אישי:', data.userId);
    
  } else if (data.type === 'group_message') {
    // התראה מקבוצה - נווט לדף הקבוצה
    router.push({
      pathname: '/Chats/GroupChat/GroupChatModal',
      params: {
        eventTitle: data.groupId
      }
    });
    console.log('8b. ניווט לקבוצה:', data.groupId);
    
  } else {
    // במקרה של התראה כללית - ניווט למסך הראשי
    router.push('/(tabs)/home');
    console.log('8c. ניווט למסך הראשי');
  }
}

// פונקציה לטיפול בלחיצה על התראה
export function setupNotificationResponseHandler() {
  // מאזין להתראה שנלחצה כשהאפליקציה פתוחה
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('6. התקבלה לחיצה על התראה:', response);
    
    const notificationData = response.notification.request.content.data;
    handleNotificationNavigation(notificationData);
  });

  // מאזין להתראה אחרונה שנלחצה (כשהאפליקציה נסגרה ונפתחה דרך ההתראה)
  Notifications.getLastNotificationResponseAsync().then(response => {
    if (response) {
      console.log('7. התקבלה התראה אחרונה:', response);
      const notificationData = response.notification.request.content.data;
      handleNotificationNavigation(notificationData);
    }
  });

  return responseListener;
}

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
  if (finalStatus !== "granted") {
  Alert.alert(
    "האפליקציה צריכה אישור לקבלת התראות בשביל חוויה מקסימלית",
    "",
    [
      {
        text: "פתח הגדרות",
        onPress: () => openNotificationSettings(),
      },
      {
        text: "ביטול",
        style: "cancel",
      },
    ]
  );
  console.log("2b. יצאתי: אין הרשאות.");
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