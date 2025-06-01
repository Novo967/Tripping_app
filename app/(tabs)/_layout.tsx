import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen name="chat" options={{ tabBarIcon: () => <Ionicons name="chatbubble" size={24} /> }} />
      <Tabs.Screen name="home/index" options={{ tabBarIcon: () => <Ionicons name="home" size={24} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: () => <Ionicons name="person" size={24} /> }} />
    </Tabs>
  );
}