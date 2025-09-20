import { useLocalSearchParams } from 'expo-router';
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
    updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';
import { useTheme } from '../../ThemeContext';
import ImageViewerModal from '../components/ImageViewerModal';
import ChatEmptyState from './ChatEmptyState';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { handleImagePicker } from './ChatService';
import ChatHeader from './PersonalChatHeader';

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

type CombinedData = (Message | DateSeparator)[];

const ChatModal = () => {
  const { otherUserId, otherUsername } = useLocalSearchParams<{
    otherUserId: string;
    otherUsername: string;
  }>();

  const [messages, setMessages] = useState<CombinedData>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const chatId =
    currentUid && otherUserId ? [currentUid, otherUserId].sort().join('_') : '';

  useEffect(() => {
    if (!chatId || !currentUid) {
      console.log('Chat ID or current user ID is not defined. Exiting useEffect.');
      return;
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      const combinedData = processMessagesWithSeparators(fetchedMessages).reverse();
      setMessages(combinedData);
    });

    const userDocRef = doc(db, 'users', currentUid);
    const setChatActive = async () => {
      try {
        await updateDoc(userDocRef, {
          activeChatId: chatId,
        });
      } catch (e) {
        console.error('שגיאה בעדכון activeChatId:', e);
      }
    };

    const clearChatActive = async () => {
      try {
        await updateDoc(userDocRef, {
          activeChatId: null,
        });
      } catch (e) {
        console.error('שגיאה באיפוס activeChatId:', e);
      }
    };

    setChatActive();

    return () => {
      unsubscribe();
      clearChatActive();
    };
  }, [chatId, currentUid]);

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
    setIsImageViewerVisible(false);
  };

  const processMessagesWithSeparators = (msgs: Message[]): CombinedData => {
    if (msgs.length === 0) return [];
    const combined: CombinedData = [];
    let lastDate: string | null = null;
    msgs.forEach((msg) => {
      const msgDate = msg.createdAt?.toDate().toDateString();
      if (msgDate !== lastDate) {
        combined.push({
          id: `date-separator-${msgDate}`,
          type: 'date-separator',
          date: msg.createdAt,
        });
        lastDate = msgDate;
      }
      combined.push(msg);
    });
    return combined;
  };

  const sendMessage = async (imageUrl?: string) => {
    if ((!input.trim() && !imageUrl) || !currentUid) return;

    // בדיקת חסימה לפני שליחת הודעה
    try {
      const currentUserDocRef = doc(db, 'users', currentUid);
      const otherUserDocRef = doc(db, 'users', otherUserId);

      const currentUserSnap = await getDoc(currentUserDocRef);
      const otherUserSnap = await getDoc(otherUserDocRef);

      if (currentUserSnap.exists() && otherUserSnap.exists()) {
        const currentUserData = currentUserSnap.data();
        const otherUserData = otherUserSnap.data();

        const currentUserBlocked = currentUserData.blocked_users || [];
        const otherUserBlocked = otherUserData.blocked_users || [];

        // בדיקה אם המשתמש האחר חסום על ידי המשתמש הנוכחי
        if (currentUserBlocked.includes(otherUserId)) {
          Alert.alert('שגיאה', 'אינך יכול לשלוח הודעה למשתמש שחסמת.');
          return; // עוצר את שליחת ההודעה
        }

        // בדיקה אם המשתמש הנוכחי חסום על ידי המשתמש האחר
        if (otherUserBlocked.includes(currentUid)) {
          Alert.alert('שגיאה', 'אינך יכול לשלוח הודעה למשתמש שחסם אותך.');
          return; // עוצר את שליחת ההודעה
        }
      } else {
        console.error('אחד מהמשתמשים לא קיים במסד הנתונים.');
        Alert.alert('שגיאה', 'אירעה שגיאה בבדיקת הרשאות. אנא נסה שוב.');
        return;
      }
    } catch (error) {
      console.error('שגיאה בבדיקת חסימה:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה. אנא נסה שוב.');
      return;
    }

    // אם עבר את בדיקת החסימה, ממשיך בשליחת ההודעה
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

  const renderItem = ({ item }: { item: Message | DateSeparator }) => {
    return (
      <ChatMessage
        item={item}
        currentUid={currentUid}
        onImagePress={openImageViewer}
      />
    );
  };

  const getKeyboardAvoidingViewProps = () => {
    if (Platform.OS === 'android') {
      return {
        behavior: 'height' as const,
        keyboardVerticalOffset: 0,
      };
    }
    return {
      behavior: 'padding' as const,
      keyboardVerticalOffset: 0,
    };
  };

  const keyboardProps = getKeyboardAvoidingViewProps();
  const statusBarStyle = theme.isDark ? 'light-content' : 'dark-content';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ChatHeader otherUserId={otherUserId} otherUsername={otherUsername} />
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={keyboardProps.behavior}
        keyboardVerticalOffset={keyboardProps.keyboardVerticalOffset}
      >
        {messages.length === 0 ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ChatEmptyState otherUsername={otherUsername} />
          </TouchableWithoutFeedback>
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              inverted
              style={styles.flatListMain}
            />
          </TouchableWithoutFeedback>
        )}
        <ChatInput
          input={input}
          onSetInput={setInput}
          onSendMessage={sendMessage}
          onHandleImagePicker={() =>
            handleImagePicker(currentUid, chatId, sendMessage)
          }
        />
      </KeyboardAvoidingView>

      <ImageViewerModal
        isVisible={isImageViewerVisible}
        imageUrl={selectedImage}
        onClose={closeImageViewer}
      />
    </View>
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
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  flatListMain: {
    flex: 1,
  },
});