import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ייבוא חדש
import { ThemeProvider } from '../ProfileServices/ThemeContext';

export default function Layout() {
  const insets = useSafeAreaInsets(); // שימוש ב-hook לקבלת אזורים בטוחים

  return (
    <ThemeProvider>
      <Tabs
        screenOptions={({ route }) => ({
          unmountOnBlur: false,
          tabBarActiveTintColor: '#3A8DFF',
          tabBarInactiveTintColor: 'black', // שינוי ל-string 'black'
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 50 + insets.bottom, // הגדלת גובה ה-tabBar כדי להכיל את ה-padding
            paddingBottom: 4 + insets.bottom, // הוספת padding תחתון לפי אזור בטוח
          },
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

            if (route.name === 'chat') {
              iconName = 'chatbubble';
            } else if (route.name === 'home/index') {
              iconName = 'home';
            } else if (route.name === 'profile') {
              iconName = 'person';
            }

            return <Ionicons name={iconName} size={20} color={color} />;
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: -2,
          },
          tabBarLabelPosition: 'below-icon',
        })}
      >
        <Tabs.Screen name="chat" options={{ title: 'צ\'ט', headerShown: false }} />
        <Tabs.Screen name="home/index" options={{ title: 'בית', headerShown: false }} />
        <Tabs.Screen name="profile" options={{ title: 'פרופיל', headerShown: false }} />
      </Tabs>
    </ThemeProvider>
  );
}
