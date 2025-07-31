// app/GroupChatModal.tsx
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
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
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
  senderUsername: string;
  createdAt: any;
  imageUrl?: string;
}

const GroupChatModal = () => {
  const { eventTitle } = useLocalSearchParams<{ eventTitle: string }>(); // eventTitle now represents the groupId

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [groupName, setGroupName] = useState(eventTitle); // State for actual group name
  const [groupImage, setGroupImage] = useState<string | null>(null); // Default group image is null for icon
  const flatListRef = useRef<FlatList>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;
  const currentUsername = currentUser?.displayName || currentUser?.email || 'משתמש אנונימי';

  // Effect to load group details (name, image) and listen to messages
  useEffect(() => {
    if (!eventTitle || typeof eventTitle !== 'string') return;

    const groupDocRef = doc(db, 'group_chats', eventTitle);

    // Listener for group details (name, image)
    const unsubscribeGroupDetails = onSnapshot(
      groupDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroupName(data.name || eventTitle); // Use actual name, fallback to eventTitle
          setGroupImage(data.groupImage || null); // Set to null if groupImage is not found
        } else {
          // If the group document doesn't exist yet, we'll create it on first message send
          setGroupName(eventTitle); // Fallback to eventTitle as the name
          setGroupImage(null); // Keep as null for default icon
        }
      },
      (error) => {
        console.error('Error fetching group details:', error);
      }
    );

    // Listener for messages
    const messagesRef = collection(db, 'group_chats', eventTitle, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribeMessages = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message)));
      },
      (error) => {
        console.error('Error listening to group messages:', error);
      }
    );

    return () => {
      unsubscribeGroupDetails();
      unsubscribeMessages();
    };
  }, [eventTitle]);

  const sendMessage = async (imageUrl?: string) => {
    if ((!input.trim() && !imageUrl) || !currentUid || typeof eventTitle !== 'string') return;

    const chatDocRef = doc(db, 'group_chats', eventTitle);
    const docSnap = await getDoc(chatDocRef);

    // If group document doesn't exist, create it with initial data
    if (!docSnap.exists()) {
      console.log(`Creating new group document for: ${eventTitle}`);
      await setDoc(chatDocRef, {
        name: eventTitle, // Use eventTitle as the initial group name
        members: [currentUid], // Add current user as the first member
        groupImage: null, // Default to null for icon display
        createdAt: serverTimestamp(),
      });
    } else {
      // Optional: If the group exists, but somehow 'members' is missing (e.g. legacy data),
      // ensure the current user is added. This is a safeguard.
      const groupData = docSnap.data();
      if (!groupData.members || !groupData.members.includes(currentUid)) {
        console.log(`Adding current user (${currentUid}) to members list of group: ${eventTitle}`);
        await updateDoc(chatDocRef, {
          members: [...(groupData.members || []), currentUid], // Add current user if not present
        });
      }
    }

    // Add the message to the messages subcollection
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

  const goBack = () => {
    router.back();
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

    if (!result.canceled && result.assets[0]) {
      sendMessage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
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

    if (!result.canceled && result.assets[0]) {
      sendMessage(result.assets[0].uri);
    }
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
          {!isMe && <Text style={styles.senderName}>{item.senderUsername}</Text>}
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

  if (!eventTitle || typeof eventTitle !== 'string') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3A8DFF" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={60} color="#E0E0E0" />
          </View>
          <Text style={styles.errorTitle}>אירוע לא זוהה</Text>
          <Text style={styles.errorSubtitle}>לא ניתן לטעון את הצאט הקבוצתי</Text>
        </View>
      </SafeAreaView>
    );
  }

  // חישוב דינמי של גובה ההאדר והסטטוס בר עבור iOS
  // גובה הסטטוס בר מחושב אוטומטית ע"י SafeAreaView, אבל אם יש לך StatusBar ידני עם backgroundColor הוא עשוי להשפיע.
  // ההאדר הוא 68 פיקסלים (paddingVertical 12 * 2 + גובה התוכן בערך 44).
  // נוסיף קצת בטיחות לאופסט
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 68 + 20 : 0; // 68 זה גובה ההאדר, 20 זה עוד קצת בטיחות

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A8DFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.groupInfo}>
          <View style={styles.groupIconContainer}>
            {/* Conditional rendering for group image or icon */}
            {groupImage ? (
              // If groupImage exists, render Image inside groupIcon View
              <View style={styles.groupIcon}>
                <Image
                  source={{ uri: groupImage }}
                  style={StyleSheet.absoluteFillObject} // Image fills the parent View
                />
              </View>
            ) : (
              // If groupImage is null, render Ionicons people icon
              <View style={[styles.groupIcon, styles.groupIconPlaceholder]}>
                <Ionicons name="people" size={24} color="#3A8DFF" />
              </View>
            )}
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.groupTextInfo}>
            <Text style={styles.groupName} numberOfLines={1}>
              {groupName}
            </Text>
            <Text style={styles.groupStatus}>
              צאט קבוצתי • {messages.length > 0 ? `${messages.length} הודעות` : 'אין הודעות'}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset} 
      >
        {messages.length === 0 ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={styles.emptyStateTouchable}>
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color="#E0E0E0" />
              <Text style={styles.emptyStateTitle}>התחל שיחה קבוצתית</Text>
              <Text style={styles.emptyStateSubtitle}>
                שלח הודעה ראשונה לקבוצת {groupName}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={styles.flatListTouchable}>
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
              style={[
                styles.sendButton,
                !input.trim() && styles.sendButtonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={20} color={input.trim() ? '#FFFFFF' : '#CCC'}style={{ transform: [{ scaleX: -1 }] }} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="הקלד הודעה קבוצתית..."
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

export default GroupChatModal;

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
    paddingVertical: 12, // 12 + 12 = 24px פאדינג אנכי
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
  groupIcon: {
    width: 44, // גובה התוכן בערך 44px
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  groupIconPlaceholder: {
    backgroundColor: '#fff',
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
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
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
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
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