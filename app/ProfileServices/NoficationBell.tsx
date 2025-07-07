import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext'; // Ensure this path is correct

interface NotificationBellProps {
  hasNotifications: boolean;
  onPress: () => void;
}

export default function NotificationBell({ hasNotifications, onPress }: NotificationBellProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={styles.navButton}>
      <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
      {hasNotifications && (
        <View style={styles.notificationDot} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  navButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    position: 'relative', // Needed for absolute positioning of the dot
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red', // Color of the notification dot
    borderWidth: 1,
    borderColor: 'white',
  },
});
