import { Ionicons } from '@expo/vector-icons';
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
    setDoc
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../firebaseConfig';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  createdAt: any;
}

const GroupChatModal = () => {
  const { eventTitle } = useLocalSearchParams<{ eventTitle: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;
  const currentUsername = currentUser?.displayName || currentUser?.email ||'משתמש אנונימי';

  useEffect(() => {
    if (!eventTitle || typeof eventTitle !== 'string') return;

    const messagesRef = collection(db, 'group_chats', eventTitle, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    return unsubscribe;
  }, [eventTitle]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUid || typeof eventTitle !== 'string') return;

    const chatDocRef = doc(db, 'group_chats', eventTitle);
    const docSnap = await getDoc(chatDocRef);

    if (!docSnap.exists()) {
      await setDoc(chatDocRef, {
        createdAt: serverTimestamp()
      });
    }

    const messagesRef = collection(chatDocRef, 'messages');
    await addDoc(messagesRef, {
      text: input.trim(),
      senderId: currentUid,
      senderUsername: currentUsername,
      createdAt: serverTimestamp(),
    });

    setInput('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUid;
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={styles.username}>{item.senderUsername}</Text>
          <Text style={styles.text}>{item.text}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (!eventTitle || typeof eventTitle !== 'string') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 40 }}>אירוע לא זוהה</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: 12 }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="הקלד הודעה קבוצתית..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} disabled={!input.trim()}>
            <Ionicons name="send" size={24} color={input.trim() ? '#FF6F00' : '#CCC'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GroupChatModal;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  messageRow: { marginVertical: 6 },
  myMessageRow: { alignItems: 'flex-end' },
  otherMessageRow: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  myBubble: { backgroundColor: '#FF6F00' },
  otherBubble: { backgroundColor: '#F1F1F1' },
  username: { fontSize: 12, color: '#666', marginBottom: 2 },
  text: { fontSize: 16, color: '#000' },
  time: { fontSize: 10, marginTop: 4, color: '#999', textAlign: 'right' },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 10,
  },
});
