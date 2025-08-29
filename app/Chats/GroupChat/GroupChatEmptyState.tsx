import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../ProfileServices/ThemeContext';

interface GroupChatEmptyStateProps {
  groupName: string;
}

const GroupChatEmptyState: React.FC<GroupChatEmptyStateProps> = ({ groupName }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.emptyState,
        { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' },
      ]}
    >
      <Ionicons
        name="people-outline"
        size={60}
        color={theme.isDark ? '#4A90E2' : '#E0E0E0'}
      />
      <Text
        style={[
          styles.emptyStateTitle,
          { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
        ]}
      >
        התחל שיחה קבוצתית
      </Text>
      <Text
        style={[
          styles.emptyStateSubtitle,
          { color: theme.isDark ? '#BDC3C7' : '#95A5A6' },
        ]}
      >
        שלח הודעה ראשונה לקבוצת {groupName}
      </Text>
    </View>
  );
};

export default GroupChatEmptyState;

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 22,
  },
});