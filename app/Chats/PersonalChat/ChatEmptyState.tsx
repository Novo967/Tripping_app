import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../ProfileServices/ThemeContext';

interface ChatEmptyStateProps {
  otherUsername: string;
}

const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ otherUsername }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={60} color={theme.isDark ? '#D0D0D0' : '#E0E0E0'} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>התחל שיחה</Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.colors.text }]}>
        שלח הודעה ראשונה ל{otherUsername}
      </Text>
    </View>
  );
};

export default ChatEmptyState;

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
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});