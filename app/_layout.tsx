import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../firebaseConfig';
import { EventsProvider } from './EventEdit/EventService';
import { ThemeProvider } from './ThemeContext';

// זהו ה-layout הראשי (Root Layout) עבור כל האפליקציה שלך.
// הוא עוטף את כל המסכים המוגדרים ב-expo-router.
export default function RootLayout() {
  return (
    // עוטפים את כל האפליקציה ב-ThemeProvider כדי לספק גישה ל-theme
    // לכל המסכים והרכיבים שבה.
    <ThemeProvider>
      <EventsProvider>
      <SafeAreaProvider>
        {/* Stack הוא רכיב הניווט הראשי של expo-router. */}
        <Stack screenOptions={{ headerShown: false }}>
          {/*
            כל המסכים בתוך Stack יקבלו גישה ל-theme.
            זה כולל גם את ה-Tabs וכל מסך אחר שמוגדר בנתיבים.
          */}
        </Stack>
      </SafeAreaProvider>
      </EventsProvider>
    </ThemeProvider>
  );
}