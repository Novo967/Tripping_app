import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
}

const ChatModal = () => {
  const { otherUserId, otherUsername, otherUserImage } = useLocalSearchParams<{
    otherUserId: string;
    otherUsername: string;
    otherUserImage: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;

  const chatId = currentUid && otherUserId
    ? [currentUid, otherUserId].sort().join('_')
    : '';

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUid) return;

    const chatDocRef = doc(db, 'chats', chatId);
    const chatDocSnap = await getDoc(chatDocRef);

    if (!chatDocSnap.exists()) {
      await setDoc(chatDocRef, {
        participants: [currentUid, otherUserId],
        createdAt: serverTimestamp(),
      });
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text: input.trim(),
      senderId: currentUid,
      receiverId: otherUserId,
      createdAt: serverTimestamp(),
    });

    setInput('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const goBack = () => {
    router.back();
  };

  const handleUserProfilePress = () => {
    router.push({
      pathname: '/ProfileServices/OtherUserProfile',
      params: { uid: otherUserId },
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUid;
    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.theirMessage
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isMe ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6F00" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={goBack} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={handleUserProfilePress}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: otherUserImage || 'https://via.placeholder.com/50' }} 
              style={styles.avatar} 
            />
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.userTextInfo}>
            <Text style={styles.username}>{otherUsername}</Text>
            <Text style={styles.userStatus}>פעיל עכשיו</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.messagesWrapper}>
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="chatbubble-outline" size={60} color="#E0E0E0" />
                </View>
                <Text style={styles.emptyStateTitle}>התחל שיחה</Text>
                <Text style={styles.emptyStateSubtitle}>
                  שלח הודעה ראשונה ל{otherUsername}
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Input Container */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
              <Ionicons name="add" size={24} color="#FF6F00" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="הקלד הודעה..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              textAlign="right"
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity 
              onPress={sendMessage} 
              style={[
                styles.sendButton,
                !input.trim() && styles.sendButtonDisabled
              ]}
              activeOpacity={0.8}
              disabled={!input.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={input.trim() ? "#FFFFFF" : "#CCC"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF6F00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  userInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginLeft: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userTextInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  userStatus: {
    fontSize: 13,
    color: '#FFE0B3',
    textAlign: 'right',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatContainer: {
    flex: 1,
  },
  messagesWrapper: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessage: {
    backgroundColor: '#FF6F00',
    borderBottomRightRadius: 8,
  },
  theirMessage: {
    backgroundColor: '#FFFFFF',
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
  theirMessageText: {
    color: '#2C3E50',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  myMessageTime: {
    color: '#FFE0B3',
  },
  theirMessageTime: {
    color: '#95A5A6',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 50,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#FF6F00',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8E8E8',
    shadowOpacity: 0,
    elevation: 0,
  },
});