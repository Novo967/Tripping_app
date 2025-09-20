import * as ImageManipulator from 'expo-image-manipulator';
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
    updateDoc,
} from 'firebase/firestore';
import {
    getDownloadURL,
    getStorage,
    ref,
    uploadBytesResumable
} from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActionSheetIOS,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { app, db } from '../../../firebaseConfig';
import { useTheme } from '../../ThemeContext';
import ImageViewerModal from '../components/ImageViewerModal';
import GroupChatEmptyState from './GroupChatEmptyState';
import GroupChatErrorState from './GroupChatErrorState';
import GroupChatHeader from './GroupChatHeader';
import GroupChatInput from './GroupChatInput';
import GroupChatMessage from './GroupChatMessage';
import GroupDetailsModal from './GroupDetailsModal';
import GroupImageModal from './GroupImageModal';

const storage = getStorage(app);

interface Message {
  id: string;
  text?: string;
  senderId: string;
  senderUsername: string;
  createdAt: any;
  imageUrl?: string;
}

type DateSeparator = {
  id: string;
  type: 'date-separator';
  date: any;
};

type CombinedData = (Message | DateSeparator)[];

const GroupChatModal = () => {
  const { eventTitle } = useLocalSearchParams<{ eventTitle: string }>();

  const [messages, setMessages] = useState<CombinedData>([]);
  const [input, setInput] = useState('');
  const [groupName, setGroupName] = useState(eventTitle);
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupImageModalVisible, setIsGroupImageModalVisible] = useState(false);
  const [isGroupDetailsModalVisible, setIsGroupDetailsModalVisible] = useState(false);
  
  // State חדש לניהול מציג התמונות
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;
  const currentUsername =
    currentUser?.displayName || currentUser?.email || 'משתמש אנונימי';
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const openGroupImageModal = () => {
    setIsGroupImageModalVisible(true);
  };

  const closeGroupImageModal = () => {
    setIsGroupImageModalVisible(false);
  };
  
  const openGroupDetailsModal = () => {
    setIsGroupDetailsModalVisible(true);
  };

  const closeGroupDetailsModal = () => {
    setIsGroupDetailsModalVisible(false);
  };

  // פונקציות לפתיחה וסגירה של מציג התמונות
  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
    setIsImageViewerVisible(false);
  };

  const uploadGroupImage = async (uri: string) => {
    setIsUploading(true);
    if (!eventTitle) {
      console.error('Group ID (eventTitle) is undefined.');
      Alert.alert('שגיאה', 'שם הקבוצה אינו זמין, לא ניתן להעלות תמונה.');
      setIsUploading(false);
      return;
    }

    try {
      if (!uri) {
        throw new Error('Invalid image URI provided.');
      }
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `group_images/${eventTitle}/groupImage.jpg`);
      await uploadBytesResumable(storageRef, blob);
      const newImageUrl = await getDownloadURL(storageRef);
      const groupDocRef = doc(db, 'group_chats', eventTitle);
      await updateDoc(groupDocRef, { groupImage: newImageUrl });
      setGroupImageUrl(newImageUrl);
      Alert.alert('התמונה עודכנה בהצלחה!');
    } catch (error) {
      console.error('Failed to upload group image:', error);
      Alert.alert('שגיאה', `העלאת התמונה נכשלה: . אנא נסה שוב.`);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImageAndSendMessage = async (localUri: string) => {
    if (!localUri || !currentUid || !eventTitle) return;
    try {
      setIsUploading(true);
      const manipResult = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipResult.uri);
      const blob = await response.blob();
      const storagePath = `groupchat_images/${eventTitle}/${Date.now()}_${currentUid}.jpg`;
      const imageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(imageRef, blob);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        }, 
        (error) => {
          console.error("שגיאה בהעלאת התמונה:", error);
          Alert.alert('שגיאה', 'אירעה שגיאה בהעלאת התמונה. נסה שוב.');
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('File available at', downloadURL);
          await sendMessage(undefined, downloadURL);
          setIsUploading(false);
        }
      );
    } catch (e) {
      console.error('שגיאה בתהליך העלאת התמונה:', e);
      Alert.alert('שגיאה', 'אירעה שגיאה בתהליך העלאת התמונה. נסה שוב.');
      setIsUploading(false);
    }
  };

  const handleImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['ביטול', 'מצלמה', 'גלריה'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openCameraForMessage();
          if (buttonIndex === 2) openGalleryForMessage();
        }
      );
    } else {
      Alert.alert('בחר תמונה', '', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מצלמה', onPress: openCameraForMessage },
        { text: 'גלריה', onPress: openGalleryForMessage },
      ]);
    }
  };

  const openCameraForMessage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      uploadImageAndSendMessage(result.assets[0].uri);
    }
  };

  const openGalleryForMessage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Media library permission is required to pick photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      uploadImageAndSendMessage(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (!eventTitle || typeof eventTitle !== 'string' || !currentUid) {
      console.log('Event title or current user ID is not defined. Exiting useEffect.');
      return;
    }
    const groupDocRef = doc(db, 'group_chats', eventTitle);
    const unsubscribeGroupDetails = onSnapshot(
      groupDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroupName(data.name || eventTitle);
          setMemberCount(data.members?.length || 0);
          setGroupImageUrl(data.groupImage || null);
        } else {
          setGroupName(eventTitle);
          setGroupImageUrl(null);
          setMemberCount(0);
        }
      },
      (error) => {
        console.error('Error fetching group details:', error);
      }
    );
    const messagesRef = collection(db, 'group_chats', eventTitle, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        const combinedData = processMessagesWithSeparators(fetchedMessages).reverse();
        setMessages(combinedData);
      },
      (error) => {
        console.error('Error listening to group messages:', error);
      }
    );
    const userDocRef = doc(db, 'users', currentUid);
    const setChatActive = async () => {
      try {
        await updateDoc(userDocRef, {
          activeChatId: eventTitle,
        });
        console.log(`עדכון activeChatId ל: ${eventTitle}`);
      } catch (e) {
        console.error('שגיאה בעדכון activeChatId:', e);
      }
    };
    const clearChatActive = async () => {
      try {
        await updateDoc(userDocRef, {
          activeChatId: null,
        });
        console.log('איפוס activeChatId.');
      } catch (e) {
        console.error('שגיאה באיפוס activeChatId:', e);
      }
    };
    setChatActive();
    return () => {
      unsubscribeGroupDetails();
      unsubscribeMessages();
      clearChatActive();
    };
  }, [eventTitle, currentUid]);

  const sendMessage = async (text?: string, imageUrl?: string) => {
    if ((!text && !imageUrl) || !currentUid || typeof eventTitle !== 'string')
      return;

    const chatDocRef = doc(db, 'group_chats', eventTitle);
    const docSnap = await getDoc(chatDocRef);

    if (!docSnap.exists()) {
      await setDoc(chatDocRef, {
        name: eventTitle,
        members: [currentUid],
        groupImage: null,
        createdAt: serverTimestamp(),
      });
    } else {
      const groupData = docSnap.data();
      if (!groupData.members || !groupData.members.includes(currentUid)) {
        await updateDoc(chatDocRef, {
          members: [...(groupData.members || []), currentUid],
        });
      }
    }

    const messagesRef = collection(chatDocRef, 'messages');
    
    const messageData: any = {
      senderId: currentUid,
      senderUsername: currentUsername,
      createdAt: serverTimestamp(),
    };

    if (imageUrl) {
        messageData.imageUrl = imageUrl;
    } else if (text) {
        messageData.text = text.trim();
    }
    
    await addDoc(messagesRef, messageData);
    
    if (text) {
      setInput('');
    }
  };
    
  const handleSendMessage = () => {
      if (input.trim() === '') return;
      sendMessage(input);
  };

  const handleImageUploadAndSend = (imageUrl: string) => {
      sendMessage(undefined, imageUrl);
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

  const renderItem = ({ item }: { item: Message | DateSeparator }) => {
    // שליחת הפונקציה openImageViewer ל-GroupChatMessage
    return (
      <GroupChatMessage item={item} currentUid={currentUid} onImagePress={openImageViewer} />
    );
  };

  if (!eventTitle || typeof eventTitle !== 'string') {
    return <GroupChatErrorState />;
  }

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
  const goBack = () => router.back();
  const keyboardProps = getKeyboardAvoidingViewProps();

  // מודלים מוצגים לפי סדר העדיפות או המצב שלהם
  if (isGroupImageModalVisible) {
    return (
        <GroupImageModal
          groupImageUrl={groupImageUrl}
          isUploading={isUploading}
          onSelectNewImage={(uri) => {
            closeGroupImageModal();
            uploadGroupImage(uri);
          }}
          onClose={closeGroupImageModal}
        />
    );
  }

  if (isGroupDetailsModalVisible) {
    return (
        <GroupDetailsModal
          eventTitle={eventTitle}
          onClose={closeGroupDetailsModal}
          onOpenImageModal={openGroupImageModal}
        />
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' },
      ]}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.isDark ? '#1F2937' : '#3A8DFF'}
      />

      <GroupChatHeader
        groupName={groupName}
        groupImageUrl={groupImageUrl}
        memberCount={memberCount}
        isUploading={isUploading}
        onGoBack={goBack}
        onOpenGroupDetails={openGroupDetailsModal}
      />

      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={keyboardProps.behavior}
        keyboardVerticalOffset={keyboardProps.keyboardVerticalOffset}
      >
        {messages.length === 0 ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <GroupChatEmptyState groupName={groupName} />
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
              style={[
                styles.flatListMain,
                { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA' },
              ]}
            />
          </TouchableWithoutFeedback>
        )}

        <GroupChatInput
          input={input}
          onSetInput={setInput}
          onSendMessage={handleSendMessage}
          onHandleImagePicker={handleImagePicker}
          isUploading={isUploading}
        />
      </KeyboardAvoidingView>
      
      {/* הוספת ה-ImageViewerModal */}
      <ImageViewerModal
        isVisible={isImageViewerVisible}
        imageUrl={selectedImage}
        onClose={closeImageViewer}
      />
    </View>
  );
};

export default GroupChatModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modal: {
    margin: 0,
  },
  flexContainer: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  flatListMain: {
    flex: 1,
  },
});