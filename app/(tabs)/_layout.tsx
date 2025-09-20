import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { useTheme } from '../ThemeContext';

const NotificationBadge = () => {
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
      return () => {};
    }

    const requestsQuery = query(
      collection(db, 'event_requests'),
      where('receiver_uid', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      setHasNewRequests(!snapshot.empty);
    }, (error) => {
      console.error('Error fetching pending requests for tab bar:', error);
    });

    return () => unsubscribe();
  }, []);

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
        tabBarIcon: ({ color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'chat') {
            iconName = 'chatbubble';
          } else if (route.name === 'home/index') {
            iconName = 'home';
          } else if (route.name === 'profile') {
            iconName = 'person';
          }

          const isProfileTab = route.name === 'profile';

          return (
            <View>
              <Ionicons name={iconName} size={20} color={color} />
              {isProfileTab && hasNewRequests && <NotificationBadge />}
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
    backgroundColor: '#3A8DFF',
    borderWidth: 1.5,
    borderColor: 'white',
  },
});