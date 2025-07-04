import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// זהו ה-layout הראשי (Root Layout) עבור כל האפליקציה שלך.
// הוא עוטף את כל המסכים המוגדרים ב-expo-router.
export default function RootLayout() {
  return (
    // SafeAreaProvider מספק מידע על אזורים בטוחים (כמו notch או סרגל ניווט תחתון)
    // וחשוב כדי למנוע מתוכן להיחתך.
    <SafeAreaProvider>
      {/* Stack הוא רכיב הניווט הראשי של expo-router.
        הוא מנהל את ערימת המסכים.
        אין צורך לעטוף אותו ב-Fragment או View עם style, אלא אם כן יש סיבה ספציפית.
        screenOptions={{ headerShown: false }} יעלים את הכותרת מכל המסכים ב-Stack.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        {/*
          אתה יכול להגדיר כאן אפשרויות גלובליות לכל המסכים ב-Stack.
          לדוגמה:
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="Authentication" options={{ headerShown: false }} />
        */}
      </Stack>
    </SafeAreaProvider>
  );
}
