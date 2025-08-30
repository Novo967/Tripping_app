import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../ProfileServices/ThemeContext';

type Message = {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  imageUrl?: string;
};

type DateSeparator = {
  id: string;
  type: 'date-separator';
  date: any;
};

interface ChatMessageProps {
  item: Message | DateSeparator;
  currentUid: string | undefined;
  onImagePress?: (url: string) => void; // 👈 נוסיף callback ללחיצה על תמונה
}

const ChatMessage: React.FC<ChatMessageProps> = ({ item, currentUid, onImagePress }) => {
  const { theme } = useTheme();

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      yesterday.getFullYear() === date.getFullYear();

    if (isToday) return 'היום';
    if (isYesterday) return 'אתמול';

    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if ('type' in item && item.type === 'date-separator') {
    const dateSeparatorItem = item as DateSeparator;
    return (
      <View style={styles.dateSeparatorContainer}>
        <Text style={[styles.dateSeparatorText, { color: theme.colors.text }]}>
          {formatDate(dateSeparatorItem.date)}
        </Text>
      </View>
    );
  }

  const messageItem = item as Message;
  const isMe = messageItem.senderId === currentUid;

  return (
    <View
      style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.theirMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isMe
            ? styles.myMessage
            : [styles.theirMessage, { backgroundColor: theme.isDark ? '#3D4D5C' : '#FFFFFF' }],
        ]}
      >
        {/* 👇 תמונה עם TouchableOpacity */}
        {messageItem.imageUrl &&
          typeof messageItem.imageUrl === 'string' &&
          messageItem.imageUrl.startsWith('http') && (
            <TouchableOpacity onPress={() => onImagePress && onImagePress(messageItem.imageUrl)}>
              <Image source={{ uri: messageItem.imageUrl }} style={styles.messageImage} />
            </TouchableOpacity>
          )}

        {messageItem.text && (
          <Text
            style={[
              styles.messageText,
              isMe
                ? styles.myMessageText
                : [styles.theirMessageText, { color: theme.isDark ? '#F8F9FA' : '#2C3E50' }],
            ]}
          >
            {messageItem.text}
          </Text>
        )}

        <Text
          style={[
            styles.messageTime,
            isMe
              ? styles.myMessageTime
              : [styles.theirMessageTime, { color: theme.isDark ? '#D0D0D0' : '#95A5A6' }],
          ]}
        >
          {formatTime(messageItem.createdAt)}
        </Text>
      </View>
    </View>
  );
};

export default ChatMessage;

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessage: {
    backgroundColor: '#3A8DFF',
    borderBottomRightRadius: 8,
  },
  theirMessage: {
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {},
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  myMessageTime: {
    color: '#FFE0B3',
  },
  theirMessageTime: {},
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateSeparatorText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    color: '#888',
  },
});
