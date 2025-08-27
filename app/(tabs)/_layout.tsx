import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { auth, db } from '../../firebaseConfig';

const NotificationBadge = ({ hasNotifications }) => {
  if (!hasNotifications) {
    return null;
  }
  return <View style={styles.badge} />;
};

export default function Layout() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [hasNewRequests, setHasNewRequests] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setHasNewRequests(false);
      return () => {}; // Cleanup if no user is signed in
    }

    const requestsQuery = query(
      collection(db, 'event_requests'), 
      where('receiver_uid', '==', user.uid),
      where('status', '==', 'pending')
    );

    // This listener will be active as long as the app is running
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      // Check if there's any document that exists
      setHasNewRequests(!snapshot.empty);
    }, (error) => {
      console.error('Error fetching pending requests for tab bar:', error);
    });

    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <Tabs
      screenOptions={({ route }) => ({
        unmountOnBlur: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 50 + insets.bottom,
          paddingBottom: 4 + insets.bottom,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'chat') {
            iconName = 'chatbubble-outline';
          } else if (route.name === 'home/index') {
            iconName = 'home-outline';
          } else if (route.name === 'profile') {
            iconName = 'person-outline';
          }

          if (route.name === 'chat' && hasNewRequests) { // You can use a state for chat notifications as well
              // Chat notifications logic here
          }

          const isProfileTab = route.name === 'profile';

          // Conditional icon based on focus
          const focusedIcon = route.name === 'chat' ? 'chatbubble' :
            route.name === 'home/index' ? 'home' : 'person';
          const unfocusedIcon = route.name === 'chat' ? 'chatbubble-outline' :
            route.name === 'home/index' ? 'home-outline' : 'person-outline';

          return (
            <View>
              <Ionicons name={route.focused ? focusedIcon : unfocusedIcon} size={25} color={color} />
              {isProfileTab && hasNewRequests && <NotificationBadge hasNotifications={true} />}
            </View>
          );
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

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 0,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3A8DFF', // Blue color for the badge
    borderWidth: 1.5,
    borderColor: 'white',
  },
});