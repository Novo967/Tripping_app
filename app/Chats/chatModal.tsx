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
// ✅ ייבוא SafeAreaView ו-useSafeAreaInsets מ-react-native-safe-area-context
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  imageUrl?: string;
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

  // ✅ שימוש ב-useSafeAreaInsets כדי לקבל את הריפודים
  const insets = useSafeAreaInsets();

  const chatId =
    currentUid && otherUserId ? [currentUid, otherUserId].sort().join('_') : '';

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
            isMe ? styles.myMessage : styles.theirMessage,
          ]}
        >
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          )}
          {item.text && (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myMessageText : styles.theirMessageText,
              ]}
            >
              {item.text}
            </Text>
          )}
          <Text
            style={[
              styles.messageTime,
              isMe ? styles.myMessageTime : styles.theirMessageTime,
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // ✅ חישוב דינמי של גובה ה-KeyboardAvoidingView offset
  // ה-headerPaddingTop הוא הריפוד העליון של ההאדר, ששווה ל-insets.top
  // גובה ההאדר עצמו הוא סכום של paddingVertical 12 * 2 + גובה התוכן (בסביבות 44px לאוואטאר) = 68px.
  // לכן, ה-offset צריך להיות גובה ההאדר + גובה ה-StatusBar (שמטופל ע"י insets.top)
  const headerHeight = 12 + 12 + 44; // paddingVertical * 2 + avatar height approx
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + headerHeight : 0;
  // הערה: יש לוודא שאין לך paddingBottom ל-KeyboardAvoidingView עצמו,
  // כי אז הוא יפעל נגד ה-insets.bottom.

  return (
    // ✅ עטיפה ב-SafeAreaView של react-native-safe-area-context
    <SafeAreaView style={styles.container}>
      {/* ✅ הגדרת ה-StatusBar צריכה להיות עקבית. 
           ה-backgroundColor של ה-StatusBar צריך להתאים ל-backgroundColor של ה-header.
           זה ימנע "קפיצה" או רקע לבן מתחת לסטטוס בר.
      */}
      <StatusBar barStyle="light-content" backgroundColor="#FF6F00" />
      
      {/* ה-Header לא צריך padding-top משלו אם ה-SafeAreaView מכיל אותו ודוחף אותו למטה,
        אבל הוא צריך padding-top כדי להישאר בתוך המסגרת של ה-SafeArea.
        הדרך הטובה ביותר היא לתת ל-header padding-top השווה ל-insets.top.
        אפשר גם להוסיף את ה-header בתוך ה-KeyboardAvoidingView,
        אבל במקרה של צ'אט עדיף שההאדר יהיה קבוע למעלה וה-KeyboardAvoidingView יטפל רק באזור התוכן והקלט.
      */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserProfilePress} activeOpacity={0.7}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: otherUserImage || 'https://via.placeholder.com/50' }} style={styles.avatar} />
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.userTextInfo}>
            <Text style={styles.username}>{otherUsername}</Text>
            <Text style={styles.userStatus}>פעיל עכשיו</Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // ✅ ה-offset צריך לכלול את גובה ההאדר בנוסף ל-insets.top
        keyboardVerticalOffset={keyboardVerticalOffset} 
      >
        {messages.length === 0 ? (
          // אין צורך ב-TouchableWithoutFeedback נוסף עם סטייל emptyStateTouchable/flatListTouchable
          // ה-FlatList/View כבר תופסים את השטח.
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={60} color="#E0E0E0" />
              <Text style={styles.emptyStateTitle}>התחל שיחה</Text>
              <Text style={styles.emptyStateSubtitle}>שלח הודעה ראשונה ל{otherUsername}</Text>
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

        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              onPress={() => sendMessage()}
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              activeOpacity={0.8}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={20} color={input.trim() ? '#FFFFFF' : '#CCC'} style={{ transform: [{ scaleX: -1 }] }} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="הקלד הודעה..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              textAlign="right"
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.cameraButton} onPress={handleImagePicker} activeOpacity={0.7}>
              <Ionicons name="camera" size={24} color="#FF6F00" />
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
  flexContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 16,
    paddingVertical: 12, // כבר קיים.
    flexDirection: 'row-reverse',
    alignItems: 'center',
    shadowColor: '#FF6F00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // ✅ הסרת padding top ספציפי לפלטפורמה מכאן.
    // ה-paddingTop הדינמי יוגדר ישירות כסטייל מותנה בקומפוננטה.
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
  emptyStateTouchable: {
    flex: 1,
  },
  flatListTouchable: {
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
    color: '#95A5A6',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // ✅ הריפוד התחתון של ה-SafeAreaView יטפל ב-notch
    paddingBottom: 24, 
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 50,
  },
  cameraButton: {
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