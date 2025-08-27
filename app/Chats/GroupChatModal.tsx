import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator'; // ✅ ייבוא חדש
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
  listAll,
  ref,
  uploadBytesResumable, // ✅ ייבוא מעודכן
} from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
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
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { app, db } from '../../firebaseConfig';
import GroupDetailsModal from './GroupDetailsModal';
import GroupImageModal from './GroupImageModal';

const storage = getStorage(app);

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  createdAt: any;
  imageUrl?: string;
}

const GroupChatModal = () => {
  const { eventTitle } = useLocalSearchParams<{ eventTitle: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [groupName, setGroupName] = useState(eventTitle);
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupImageModalVisible, setIsGroupImageModalVisible] = useState(false);
  const [isGroupDetailsModalVisible, setIsGroupDetailsModalVisible] = useState(false);
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

  const getGroupImageUrl = async (groupId: string) => {
    if (!groupId) return null;
    try {
      // ✅ שינוי נתיב ל group_images
      const folderRef = ref(storage, `group_images/${groupId}`);
      const result = await listAll(folderRef);
      if (result.items.length === 0) return null;
      const latestFileRef = result.items.sort((a, b) =>
        b.name.localeCompare(a.name)
      )[0];
      const url = await getDownloadURL(latestFileRef);
      return url;
    } catch (e) {
      console.warn(`Error fetching group image for ${groupId}:`, e);
      return null;
    }
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

      // ✅ שינוי נתיב ל group_images
      const storageRef = ref(storage, `group_images/${eventTitle}/groupImage.jpg`);
      await uploadBytesResumable(storageRef, blob); // ✅ שינוי ל-uploadBytesResumable
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

  // ✅ פונקציה חדשה להעלאת תמונה לצ'אט
  const uploadImageAndSendMessage = async (localUri: string) => {
    if (!localUri || !currentUid || !eventTitle) return;

    try {
      setIsUploading(true);
      // אופטימיזציה: דחיסה ושינוי גודל של התמונה
      const manipResult = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 800 } }], // שינוי גודל לרוחב מקסימלי של 800 פיקסלים
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipResult.uri);
      const blob = await response.blob();
      
      // ✅ שינוי נתיב ל groupchat_images
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
          sendMessage(downloadURL);
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
      uploadImageAndSendMessage(result.assets[0].uri); // ✅ שינוי: קורא לפונקציה החדשה
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
      uploadImageAndSendMessage(result.assets[0].uri); // ✅ שינוי: קורא לפונקציה החדשה
    }
  };

  //... (שאר הקוד נשאר כפי שהיה, למעט שינויים קטנים)
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
          if (!groupImageUrl) {
            const imageUrl = await getGroupImageUrl(eventTitle);
            setGroupImageUrl(imageUrl);
          }
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
    const q = query(messagesRef, orderBy('createdAt', 'desc'));
    const unsubscribeMessages = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Message[]
        );
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

  const sendMessage = async (imageUrl?: string) => {
    if ((!input.trim() && !imageUrl) || !currentUid || typeof eventTitle !== 'string')
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
    await addDoc(messagesRef, {
      text: input.trim(),
      senderId: currentUid,
      senderUsername: currentUsername,
      createdAt: serverTimestamp(),
      ...(imageUrl && { imageUrl }),
    });
    setInput('');
  };

  const goBack = () => router.back();

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
            {
              backgroundColor: isMe
                ? '#3A8DFF'
                : theme.isDark
                ? '#2C3E50'
                : '#FFFFFF',
              borderColor: theme.isDark && !isMe ? '#3E506B' : '#E8E8E8',
              shadowColor: theme.isDark ? '#000' : '#000',
            },
          ]}
        >
          {!isMe && (
            <Text
              style={[
                styles.senderName,
                { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' },
              ]}
            >
              {item.senderUsername}
            </Text>
          )}
          {/* ✅ תצוגת התמונה: תנאי מורכב יותר */}
          {item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http') && (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          )}
          {item.text && (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myMessageText : styles.theirMessageText,
                { color: isMe ? '#FFFFFF' : theme.isDark ? '#E0E0E0' : '#2C3E50' },
              ]}
            >
              {item.text}
            </Text>
          )}
          <Text
            style={[
              styles.messageTime,
              isMe ? styles.myMessageTime : styles.theirMessageTime,
              { color: isMe ? '#FFE0B3' : theme.isDark ? '#BDC3C7' : '#95A5A6' },
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (!eventTitle || typeof eventTitle !== 'string') {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.isDark ? '#3D4D5C' : '#F8F9FA' },
        ]}
      >
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.isDark ? '#1F2937' : '#3A8DFF'}
        />
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: theme.isDark ? '#3D4D5C' : '#F8F9FA' },
          ]}
        >
          <View
            style={[
              styles.errorIcon,
              { backgroundColor: theme.isDark ? '#2C3E50' : '#F5F5F5' },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={60}
              color={theme.isDark ? '#4A90E2' : '#E0E0E0'}
            />
          </View>
          <Text
            style={[
              styles.errorTitle,
              { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
            ]}
          >
            אירוע לא זוהה
          </Text>
          <Text
            style={[
              styles.errorSubtitle,
              { color: theme.isDark ? '#BDC3C7' : '#95A5A6' },
            ]}
          >
            לא ניתן לטעון את הצאט הקבוצתי
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ תיקון מלא של keyboard handling
  const getKeyboardAvoidingViewProps = () => {
    if (Platform.OS === 'android') {
      return {
        behavior: 'height' as const,
        keyboardVerticalOffset: 0,
      };
    }

    // עבור iOS - חישוב מדויק
    const bottomOffset = insets.bottom;

    return {
      behavior: 'padding' as const,
      keyboardVerticalOffset: bottomOffset,
    };
  };

  const keyboardProps = getKeyboardAvoidingViewProps();

  if (isGroupImageModalVisible) {
    return (
      <Modal
        isVisible={isGroupImageModalVisible}
        style={styles.modal}
        onBackButtonPress={closeGroupImageModal}
        onSwipeComplete={closeGroupImageModal}
        swipeDirection={['down']}
      >
        <GroupImageModal
          groupImageUrl={groupImageUrl}
          isUploading={isUploading}
          onSelectNewImage={(uri) => {
            closeGroupImageModal();
            uploadGroupImage(uri);
          }}
          onClose={closeGroupImageModal}
        />
      </Modal>
    );
  }

  if (isGroupDetailsModalVisible) {
    return (
      <Modal
        isVisible={isGroupDetailsModalVisible}
        style={styles.modal}
        onBackButtonPress={closeGroupDetailsModal}
        onSwipeComplete={closeGroupDetailsModal}
        swipeDirection={['down']}
      >
        <GroupDetailsModal
          eventTitle={eventTitle}
          onClose={closeGroupDetailsModal}
          onOpenImageModal={openGroupImageModal}
        />
      </Modal>
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

      <SafeAreaView
        style={{
          backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF',
          shadowColor: theme.isDark ? '#2C3946' : '#3A8DFF',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={goBack}
            style={[
              styles.backButton,
              { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.groupInfo}>
            <TouchableOpacity
              onPress={openGroupDetailsModal}
              style={styles.groupIconContainer}
              disabled={isUploading}
            >
              {isUploading ? (
                <View
                  style={[
                    styles.groupAvatarPlaceholder,
                    {
                      backgroundColor: theme.isDark ? '#2C3E50' : '#fff',
                      borderColor: theme.isDark ? '#4A90E2' : '#FFFFFF',
                      shadowColor: theme.isDark ? '#000' : '#000',
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
                  />
                </View>
              ) : groupImageUrl ? (
                <Image
                  source={{ uri: groupImageUrl }}
                  style={[
                    styles.groupAvatar,
                    { borderColor: theme.isDark ? '#4A90E2' : '#FFFFFF' },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.groupAvatarPlaceholder,
                    {
                      backgroundColor: theme.isDark ? '#2C3E50' : '#fff',
                      borderColor: theme.isDark ? '#4A90E2' : '#FFFFFF',
                      shadowColor: theme.isDark ? '#000' : '#000',
                    },
                  ]}
                >
                  <Ionicons
                    name="people"
                    size={24}
                    color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
                  />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.groupTextInfo}>
              <TouchableOpacity onPress={openGroupDetailsModal}>
                <Text
                  style={[
                    styles.groupName,
                    { color: theme.isDark ? '#FFFFFF' : '#FFFFFF' },
                  ]}
                  numberOfLines={1}
                >
                  {groupName}
                </Text>
                <Text
                  style={[
                    styles.groupStatus,
                    { color: theme.isDark ? '#A0C4FF' : '#FFE0B3' },
                  ]}
                >
                  {memberCount} משתתפים
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={keyboardProps.behavior}
        keyboardVerticalOffset={keyboardProps.keyboardVerticalOffset}
      >
        {messages.length === 0 ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
              style={[
                styles.flatListMain,
                { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA' },
              ]}
            />
          </TouchableWithoutFeedback>
        )}

        <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.isDark ? '#1F2937' : '#FFFFFF',
            borderTopColor: theme.isDark ? '#2C3E50' : '#E8E8E8',
          },
        ]}
        >
        <View
          style={[
          styles.inputContainer,
            { backgroundColor: theme.isDark ? '#2C3E50' : '#F5F5F5' },
          ]}
        >
        {/* כפתור מצלמה */}
        <TouchableOpacity
        style={[
          styles.cameraButton,
          {
            backgroundColor: theme.isDark ? '#2C3E50' : '#FFFFFF',
            shadowColor: theme.isDark ? '#000' : '#000',
          },
        ]}
            onPress={handleImagePicker}
            activeOpacity={0.7}
            >
            <Ionicons
              name="camera"
              size={24}
              color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
            />
            </TouchableOpacity>
          
        <TextInput
          style={[
            styles.input,
            { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
          ]}
          placeholder="הקלד הודעה קבוצתית..."
          placeholderTextColor={theme.isDark ? '#BDC3C7' : '#999'}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          textAlign="right"
          multiline
          maxLength={500}
        />
        {/* כפתור שליחה */}
        <TouchableOpacity
            onPress={() => sendMessage()}
            style={[
              styles.sendButton,
              !input.trim() && styles.sendButtonDisabled,
            {
            backgroundColor: input.trim()
              ? '#3A8DFF'
              : theme.isDark
              ? '#3E506B'
              : '#E8E8E8',
            shadowColor: input.trim()
              ? theme.isDark
              ? '#1F2937'
              : '#3A8DFF'
              : '#000',
            shadowOpacity: input.trim() ? 0.3 : 0,
            elevation: input.trim() ? 4 : 0,
            },
            ]}
          activeOpacity={0.8}
          disabled={!input.trim()}
        >
        <Ionicons
          name="send"
          size={20}
          color={
            input.trim()
              ? '#FFFFFF'
              : theme.isDark
              ? '#BDC3C7'
              : '#CCC'
          }
          style={{ transform: [{ scaleX: -1 }] }}
        />
        </TouchableOpacity>

          </View>
        </View>
      </KeyboardAvoidingView>
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
  header: {
    backgroundColor: '#3A8DFF',
    paddingHorizontal: 16,
    paddingVertical: -6,
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
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  groupInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  groupIconContainer: {
    position: 'relative',
    marginLeft: 12,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupTextInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  groupStatus: {
    fontSize: 13,
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
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A8DFF',
    marginBottom: 4,
    textAlign: 'right',
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
    // הוסר: paddingBottom: 24,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 22,
  },
});