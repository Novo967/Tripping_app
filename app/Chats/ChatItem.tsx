import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../app/ProfileServices/ThemeContext';

interface ChatItemProps {
  item: {
    chatId: string;
    otherUserId?: string;
    otherUsername: string;
    otherUserImage: string;
    lastMessage: string;
    lastMessageTimestamp: number;
    isGroup?: boolean;
    hasUnreadMessages: boolean;
    unreadCount: number;
  };
  onPress: () => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ item, onPress }) => {
  const { theme } = useTheme();

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';
    const now = moment();
    const messageTime = moment(timestamp);

    if (now.isSame(messageTime, 'day')) {
      return messageTime.format('HH:mm');
    } else if (now.clone().subtract(1, 'days').isSame(messageTime, 'day')) {
      return 'אתמול';
    } else if (now.isSame(messageTime, 'week')) {
      return messageTime.format('dddd');
    } else if (now.isSame(messageTime, 'year')) {
      return messageTime.format('D MMM');
    } else {
      return messageTime.format('D MMM YY');
    }
  };

  const renderChatAvatar = () => {
    if (item.isGroup) {
      if (item.otherUserImage && item.otherUserImage !== 'https://cdn-icons-png.flaticon.com/512/2621/2621042.png') {
        return (
          <Image
            source={{ uri: item.otherUserImage }}
            style={[
              styles.avatar,
              { borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF' },
            ]}
          />
        );
      }
      return (
        <View
          style={[
            styles.groupIcon,
            {
              backgroundColor: theme.isDark ? '#3E506B' : '#FFFFFF',
              borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF',
              shadowColor: theme.isDark ? '#1F2937' : '#000',
            },
          ]}
        >
          <Ionicons name="people" size={24} color={theme.isDark ? '#A0C4FF' : '#3A8DFF'} />
        </View>
      );
    }
    return (
      <Image
        source={{ uri: item.otherUserImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }}
        style={[
          styles.avatar,
          { borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF' },
        ]}
      />
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.chatItem,
        {
          backgroundColor: theme.isDark ? '#2C3E50' : '#FFFFFF',
          shadowColor: theme.isDark ? '#1F2937' : '#000',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>{renderChatAvatar()}</View>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.username,
            { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
          ]}
        >
          {item.otherUsername}
        </Text>
        <Text
          style={[
            styles.lastMessage,
            { color: theme.isDark ? '#BDC3C7' : '#7F8C8D' },
          ]}
          numberOfLines={1}
        >
          {item.lastMessage || 'התחל שיחה חדשה'}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        <View style={styles.timeRow}>
          <Text
            style={[
              styles.time,
              { color: theme.isDark ? '#95A5A6' : '#95A5A6' },
            ]}
          >
            {formatTimestamp(item.lastMessageTimestamp)}
          </Text>
          {item.hasUnreadMessages && item.unreadCount > 0 && (
            <View
              style={[
                styles.unreadBadge,
                { backgroundColor: theme.isDark ? '#4A90E2' : '#3A8DFF' },
              ]}
            >
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chatItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#3A8DFF',
  },
  groupIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'right',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'right',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 3,
  },
  unreadBadge: {
    backgroundColor: '#3A8DFF',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatItem;