import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: 'black',     // צבע אייקון פעיל
        tabBarInactiveTintColor: '#FFA07A', // אפרסק (Peach)
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0, // בלי קו תחתון כדי שלא יהיה בולט
          elevation: 0, // לא בולט באנדרואיד
          shadowOpacity: 0, // לא בולט ב-iOS
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = '';

          if (route.name === 'chat') {
            iconName = 'chatbubble';
          } else if (route.name === 'home/index') {
            iconName = 'home';
          } else if (route.name === 'profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarLabelPosition: 'below-icon',
      })}
    >
      <Tabs.Screen name="chat" options={{ title: 'צ\'ט' , headerShown: false}} />
      <Tabs.Screen name="home/index" options={{ title: 'בית' , headerShown: false}} />
      <Tabs.Screen name="profile" options={{ title: 'פרופיל' , headerShown: false}} />
    </Tabs>
  );
}
