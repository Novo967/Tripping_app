import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: '#FFA07A',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 50,
          paddingBottom: 4,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline'; // טיפוס מדויק

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
  );
}
