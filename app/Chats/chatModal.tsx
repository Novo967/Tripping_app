import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { getDownloadURL, getStorage, listAll, ref } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { app, db } from '../../firebaseConfig';

const storage = getStorage(app);

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  imageUrl?: string;
}

const ChatModal = () => {
  const { otherUserId, otherUsername } = useLocalSearchParams<{
    otherUserId: string;
    otherUsername: string;
  }>();

  const [otherUserProfileImage, setOtherUserProfileImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const chatId =
    currentUid && otherUserId ? [currentUid, otherUserId].sort().join('_') : '';

  const getProfileImageUrl = async (userId: string) => {
    if (!userId) {
      return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
    }
    try {
      const folderRef = ref(storage, `profile_images/${userId}`);
      const result = await listAll(folderRef);
      if (result.items.length === 0) {
        return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
      }
      const sortedItems = result.items.sort((a, b) => b.name.localeCompare(a.name));
      const latestFileRef = sortedItems[0];
      const url = await getDownloadURL(latestFileRef);
      return url;
    } catch (e) {
      console.warn(`Error fetching user image for ${userId}:`, e);
      return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
    }
  };

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!otherUserId) return;
      const imageUrl = await getProfileImageUrl(otherUserId);
      setOtherUserProfileImage(imageUrl);
    };
    fetchProfileImage();
  }, [otherUserId]);

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message)));
    });
    return unsubscribe;
  }, [chatId]);

  const sendMessage = async (imageUrl?: string) => {
    if ((!input.trim() && !imageUrl) || !currentUid) return;
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
      ...(imageUrl && { imageUrl }),
    });
    setInput('');
  };

  const handleImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['ביטול', 'מצלמה', 'גלריה'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openCamera();
          if (buttonIndex === 2) openGallery();
        }
      );
    } else {
      Alert.alert('בחר תמונה', '', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מצלמה', onPress: openCamera },
        { text: 'גלריה', onPress: openGallery },
      ]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      sendMessage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      sendMessage(result.assets[0].uri);
    }
  };

  const goBack = () => router.back();

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
      hour12: false,
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUid;
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
            isMe ? styles.myMessage : [styles.theirMessage, { backgroundColor: theme.isDark ? '#3D4D5C' : '#FFFFFF' }],
          ]}
        >
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          )}
          {item.text && (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myMessageText : [styles.theirMessageText, { color: theme.isDark ? '#F8F9FA' : '#2C3E50' }],
              ]}
            >
              {item.text}
            </Text>
          )}
          <Text
            style={[
              styles.messageTime,
              isMe ? styles.myMessageTime : [styles.theirMessageTime, { color: theme.isDark ? '#D0D0D0' : '#95A5A6' }],
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const headerHeight = 12 + 12 + 44;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + headerHeight : 0;
  
  const statusBarStyle = theme.isDark ? 'light-content' : 'dark-content';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor="#1F2937" />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10), backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF', borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color={theme.isDark ? '#FFFFFF' : '#3A8DFF'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserProfilePress} activeOpacity={0.7}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: otherUserProfileImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png',
              }}
              style={styles.avatar}
            />
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.userTextInfo}>
            <Text style={[styles.username, { color: theme.isDark ? '#FFFFFF' : '#2C3E50' }]}>{otherUsername}</Text>
            <Text style={[styles.userStatus, { color: theme.isDark ? '#D0D0D0' : '#95A5A6' }]}>פעיל עכשיו</Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {messages.length === 0 ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={60} color={theme.isDark ? '#D0D0D0' : '#E0E0E0'} />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>התחל שיחה</Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.colors.text }]}>
                שלח הודעה ראשונה ל{otherUsername}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              inverted
              style={styles.flatListMain}
            />
          </TouchableWithoutFeedback>
        )}

        <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
          <View style={[styles.inputContainer, { backgroundColor: theme.isDark ? '#1C242E' : '#F5F5F5' }]}>
            <TouchableOpacity
              onPress={() => sendMessage()}
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              activeOpacity={0.8}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={20} color={input.trim() ? '#FFFFFF' : theme.isDark ? '#555' : '#CCC'} style={{ transform: [{ scaleX: -1 }] }} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.isDark ? '#1C242E' : '#F5F5F5' }]}
              placeholder="הקלד הודעה..."
              placeholderTextColor={theme.isDark ? '#999' : '#999'}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              textAlign="right"
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={[styles.cameraButton, { backgroundColor: theme.isDark ? '#3D4D5C' : '#FFFFFF' }]} onPress={handleImagePicker} activeOpacity={0.7}>
              <Ionicons name="camera" size={24} color="#3A8DFF" />
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
  },
  flexContainer: {
    flex: 1,
  },
  header: {
    // ✅ שינוי צבעי הרקע כאן
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    shadowColor: '#2C3946',
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
    // ✅ צבע הטקסט כאן
    color: '#FFFFFF', 
    textAlign: 'right',
  },
  userStatus: {
    fontSize: 13,
    // ✅ צבע הטקסט כאן
    color: '#FFE0B3',
    textAlign: 'right',
    marginTop: 2,
  },
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
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  flatListMain: {
    flex: 1,
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
  theirMessageText: {
    // ✅ צבע הטקסט כאן
  },
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
  theirMessageTime: {
    // ✅ צבע הטקסט כאן
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 50,
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A8DFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#3A8DFF',
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