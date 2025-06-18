import { router } from 'expo-router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig';

interface ChatItem {
  chatId: string;
  otherUserId: string;
  otherUsername: string;
  otherUserImage: string;
  lastMessage: string;
}

const ChatsList = () => {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    console.log('Current UID:', user?.uid);

    // מאזין להתחברות/התנתקות
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const loadChats = async () => {
  try {
    const chatsSnapshot = await getDocs(collection(db, 'chats'));
    const chatList: ChatItem[] = [];

    for (const chatDoc of chatsSnapshot.docs) {
      const chatId = chatDoc.id;
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
      const lastMsgSnapshot = await getDocs(lastMsgQuery);

      if (lastMsgSnapshot.empty) continue;

      const msg = lastMsgSnapshot.docs[0].data();
      const { senderId, receiverId, text } = msg;

      // ✅ סינון: נמשיך רק אם המשתמש המחובר מעורב בצ'אט
      if (senderId !== user.uid && receiverId !== user.uid) continue;

      const otherUserId = senderId === user.uid ? receiverId : senderId;

      const response = await fetch(`https://tripping-app.onrender.com/get-other-user-profile?uid=${otherUserId}`);
      if (!response.ok) continue;

      const userData = await response.json();

      chatList.push({
        chatId,
        otherUserId,
        otherUsername: userData.username || 'משתמש',
        otherUserImage: userData.profile_image || '',
        lastMessage: text || '',
      });
    }

    setChats(chatList);
    setLoading(false);
  } catch (error) {
    console.error('Error loading chats:', error);
    setLoading(false);
  }
};


    loadChats();
  }, [user]);

  const openChat = (chat: ChatItem) => {
    router.push({
      pathname: '/Chats/chatModal',
      params: {
        otherUserId: chat.otherUserId,
        otherUsername: chat.otherUsername,
        otherUserImage: chat.otherUserImage,
      },
    });
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#FF6F00" style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.chatId}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => openChat(item)}>
            <Image source={{ uri: item.otherUserImage }} style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={styles.username}>{item.otherUsername}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage || 'התחל שיחה'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default ChatsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lastMessage: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
});
