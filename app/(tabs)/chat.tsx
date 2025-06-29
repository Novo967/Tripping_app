// ChatsList.tsx
import { Ionicons } from '@expo/vector-icons';
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
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

interface ChatItem {
  chatId: string;
  otherUserId?: string;
  otherUsername: string;
  otherUserImage: string;
  lastMessage: string;
  isGroup?: boolean;
}

const ChatsList = () => {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const loadChats = async () => {
      try {
        const chatList: ChatItem[] = [];

        // Load private chats
        const chatsSnapshot = await getDocs(collection(db, 'chats'));
        for (const chatDoc of chatsSnapshot.docs) {
          const chatId = chatDoc.id;
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
          const lastMsgSnapshot = await getDocs(lastMsgQuery);

          if (lastMsgSnapshot.empty) continue;

          const msg = lastMsgSnapshot.docs[0].data();
          const { senderId, receiverId, text } = msg;

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

        // Load group chats
        const groupSnapshot = await getDocs(collection(db, 'group_chats'));
        for (const groupDoc of groupSnapshot.docs) {
          const groupId = groupDoc.id;
          const messagesRef = collection(db, 'group_chats', groupId, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
          const lastMsgSnapshot = await getDocs(lastMsgQuery);

          if (lastMsgSnapshot.empty) continue;

          const msg = lastMsgSnapshot.docs[0].data();

          chatList.push({
            chatId: groupId,
            otherUsername: groupId,
            otherUserImage: 'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
            lastMessage: msg.text || '',
            isGroup: true,
          });
        }

        setChats(chatList);
        setFilteredChats(chatList);
        setLoading(false);
      } catch (error) {
        console.error('Error loading chats:', error);
        setLoading(false);
      }
    };

    loadChats();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat =>
        chat.otherUsername.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  const openChat = (chat: ChatItem) => {
    if (chat.isGroup) {
      router.push({ pathname: '/Chats/GroupChatModal', params: { eventTitle: chat.chatId } });
    } else {
      router.push({
        pathname: '/Chats/chatModal',
        params: {
          otherUserId: chat.otherUserId!,
          otherUsername: chat.otherUsername,
          otherUserImage: chat.otherUserImage,
        },
      });
    }
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image 
          source={{
            uri: item.isGroup
              ? 'https://img.icons8.com/ios-filled/500/group-foreground-selected.png'
              : item.otherUserImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png'
          }} 
          style={styles.avatar} 
        />
        <View style={styles.onlineIndicator} />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.username}>{item.otherUsername}</Text>
          <Text style={styles.time}>עכשיו</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || 'התחל שיחה חדשה'}
        </Text>
      </View>
      <Ionicons name="chevron-back" size={20} color="#FF6F00" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#FF6F00" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FF6F00" />
          <Text style={styles.loadingText}>טוען צאטים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6F00" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הצאטים שלך</Text>
        <Text style={styles.headerSubtitle}>התחבר עם חברים למסע</Text>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="חפש חברים..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
        </View>
      </View>
      <View style={styles.listContainer}>
        {filteredChats.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyStateTitle}>אין צאטים עדיין</Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery ? 'לא נמצאו תוצאות חיפוש' : 'התחל שיחה חדשה עם חברים'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.chatId}
            renderItem={renderChatItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ChatsList;

// שאר הקובץ (styles) לא שונה ויכול להישאר כפי שהוא.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#FF6F00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFE0B3',
    textAlign: 'right',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginLeft: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#FF6F00',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'right',
  },
  time: {
    fontSize: 12,
    color: '#95A5A6',
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'right',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 24,
  },
});