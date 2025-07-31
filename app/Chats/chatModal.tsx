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
import { getStorage } from 'firebase/storage'; // ✅ ייבוא Firebase Storage
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
import { db } from '../../firebaseConfig'; // ודא ש-db מיובא כרגיל

// ✅ ייבוא ה-storage מ-firebaseConfig
import { app } from '../../firebaseConfig'; // ייתכן שתצטרך לייצא את app מ-firebaseConfig
const storage = getStorage(app); // ✅ קבלת רפרנס ל-Firebase Storage

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
    // ✅ הסרנו את otherUserImage מפרמטרי ה-useLocalSearchParams
    // otherUserImage: string;
  }>();

  // ✅ State חדש לשמירת ה-URL של תמונת הפרופיל
  const [otherUserProfileImage, setOtherUserProfileImage] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;

  const insets = useSafeAreaInsets();

  const chatId =
    currentUid && otherUserId ? [currentUid, otherUserId].sort().join('_') : '';

  // ✅ useEffect חדש לטעינת תמונת הפרופיל
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!otherUserId) return;

      try {
        // נתיב נפוץ לתמונות פרופיל הוא 'profile_images/{uid}/profile.jpg'
        // או השם המלא של הקובץ כפי שנשמר.
        // בהנחה ששם הקובץ הוא יוניק ID (כמו Timestamp_filename.jpg)
        // עדיף לשמור את שם הקובץ המלא בדאטהבייס (למשל, ב-Firestore של המשתמש).
        // לצורך הדוגמה, נניח שהתמונה שמורה תחת הנתיב הנפוץ 'profile_images/{uid}/latest_profile_image.jpg'
        // אם אתה שומר את ה-URL המלא בדאטהבייס של המשתמש, קרא אותו משם.

        // דרך אמינה יותר: קבל את ה-URL מה-Firestore של המשתמש
        const userDocRef = doc(db, 'users', otherUserId); // נניח שיש לך קולקציית 'users'
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData && userData.profile_image) { // נניח ששדה זה קיים
            setOtherUserProfileImage(userData.profile_image);
            console.log('ChatModal - Profile image fetched from Firestore:', userData.profile_image);
            return;
          }
        }
        
        // אם לא נמצא ב-Firestore, נסה לחפש בנתיב כללי ב-Storage (פחות מומלץ, אבל אפשרי כ-fallback)
        // זה ידרוש לדעת את שם הקובץ הספציפי, מה שקשה יותר בלי לשמור אותו.
        // דוגמה: נניח שכל משתמש שומר את התמונה שלו בנתיב: `profile_images/${otherUserId}/profile.jpg`
        // const imageRef = ref(storage, `profile_images/${otherUserId}/profile.jpg`);
        // const url = await getDownloadURL(imageRef);
        // setOtherUserProfileImage(url);
        // console.log('ChatModal - Profile image fetched from Storage:', url);

      } catch (error) {
        console.error('ChatModal - Failed to fetch other user profile image:', error);
        // Fallback למקרה של שגיאה או תמונה לא קיימת
        setOtherUserProfileImage('https://cdn-icons-png.flaticon.com/512/1946/1946429.png'); // תמונת placeholder
      }
    };

    fetchProfileImage();
  }, [otherUserId]); // טען מחדש כשה-otherUserId משתנה


  // שאר ה-useEffect לצאטים נשאר כרגיל
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

  const headerHeight = 12 + 12 + 44;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + headerHeight : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A8DFF" />
      
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserProfilePress} activeOpacity={0.7}>
          <View style={styles.avatarContainer}>
            {/* ✅ השתמש ב-otherUserProfileImage שהושג מ-Firebase */}
            <Image
              source={{
                uri: otherUserProfileImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png', // Fallback placeholder
              }}
              style={styles.avatar}
            />
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
        keyboardVerticalOffset={keyboardVerticalOffset} 
      >
        {messages.length === 0 ? (
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
    backgroundColor: '#F8F9FA',
  },
  flexContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#3A8DFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    shadowColor: '#3A8DFF',
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
    backgroundColor: '#3A8DFF',
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