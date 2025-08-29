import { router } from 'expo-router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, listAll, ref } from 'firebase/storage';
import moment from 'moment';
import 'moment/locale/he';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { app, db } from '../../firebaseConfig';
import ChatHeader from '../Chats/PersonalChat/ChatHeader';
import ChatItem from '../Chats/PersonalChat/ChatItem';

moment.locale('he');

const { width, height } = Dimensions.get('window');

interface ChatItem {
  chatId: string;
  otherUserId?: string;
  otherUsername: string;
  otherUserImage: string;
  lastMessage: string;
  lastMessageTimestamp: number;
  isGroup?: boolean;
  hasUnreadMessages: boolean;
  unreadCount: number;
}

const Chat = () => {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const chatListeners = useRef<(() => void)[]>([]);
  const storage = getStorage(app);
  const { theme } = useTheme();
  const chatMapRef = useRef<Map<string, ChatItem>>(new Map());

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

  const countUnreadMessages = async (chatId: string, isGroup: boolean, lastReadTimestamp?: Date) => {
    try {
      const collectionName = isGroup ? 'group_chats' : 'chats';
      const messagesRef = collection(db, collectionName, chatId, 'messages');
      let unreadQuery;
      if (lastReadTimestamp) {
        unreadQuery = query(
          messagesRef,
          where('createdAt', '>', lastReadTimestamp),
          where('senderId', '!=', user?.uid)
        );
      } else {
        unreadQuery = query(
          messagesRef,
          where('senderId', '!=', user?.uid)
        );
      }
      const snapshot = await getDocs(unreadQuery);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error counting unread messages:', error);
      return 0;
    }
  };

  const sortChats = (chatArray: ChatItem[]) => {
    return [...chatArray].sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => {
      unsubscribeAuth();
      chatListeners.current.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setChats([]);
      setFilteredChats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    chatListeners.current.forEach((unsubscribe) => unsubscribe());
    chatListeners.current = [];
    chatMapRef.current = new Map();

    const loadChats = () => {
      const privateChatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      const unsubscribePrivateChats = onSnapshot(privateChatsQuery, (chatsSnapshot) => {
        chatsSnapshot.docChanges().forEach(async (change) => {
          const chatDoc = change.doc;
          const chatId = chatDoc.id;
          const chatData = chatDoc.data();
          const otherUserId = chatData.participants.find((p: string) => p !== user.uid);
          if (!otherUserId) return;

          const userDocRef = doc(db, 'users', otherUserId);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            console.error('User data not found for ID:', otherUserId);
            return;
          }
          const userData = userDoc.data();
          const profileImageUrl = await getProfileImageUrl(otherUserId);
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
          const unsubscribeMsg = onSnapshot(lastMsgQuery, async (lastMsgSnapshot) => {
            let newChatItem: ChatItem;
            if (lastMsgSnapshot.empty) {
              newChatItem = {
                chatId,
                otherUserId,
                otherUsername: userData.username || 'משתמש',
                otherUserImage: profileImageUrl,
                lastMessage: 'התחל שיחה חדשה',
                lastMessageTimestamp: chatData.lastUpdate?.toDate().getTime() || 0,
                isGroup: false,
                hasUnreadMessages: false,
                unreadCount: 0,
              };
            } else {
              const msg = lastMsgSnapshot.docs[0].data();
              const lastReadTimestamp = chatData.lastReadMessageTimestamp?.[user.uid]?.toDate();
              const lastMessageTimestamp = msg.createdAt?.toDate();
              const hasUnreadMessages =
                msg.senderId !== user.uid && (!lastReadTimestamp || lastReadTimestamp < lastMessageTimestamp);
              const unreadCount = hasUnreadMessages ?
                await countUnreadMessages(chatId, false, lastReadTimestamp) : 0;
              newChatItem = {
                chatId,
                otherUserId,
                otherUsername: userData.username || 'משתמש',
                otherUserImage: profileImageUrl,
                lastMessage: msg.text || '',
                lastMessageTimestamp: lastMessageTimestamp?.getTime() || 0,
                isGroup: false,
                hasUnreadMessages,
                unreadCount,
              };
            }
            chatMapRef.current.set(chatId, newChatItem);
            setChats(sortChats(Array.from(chatMapRef.current.values())));
            setLoading(false);
          }, (error) => {
            console.error('Error fetching last message:', error);
          });
          chatListeners.current.push(unsubscribeMsg);
        });
      }, (error) => {
        console.error('Error listening to private chats:', error);
        setLoading(false);
      });
      chatListeners.current.push(unsubscribePrivateChats);

      const groupChatsQuery = query(
        collection(db, 'group_chats'),
        where('members', 'array-contains', user.uid)
      );
      const unsubscribeGroupChats = onSnapshot(groupChatsQuery, (groupSnapshot) => {
        groupSnapshot.docChanges().forEach(async (change) => {
          const groupDoc = change.doc;
          const groupId = groupDoc.id;
          const groupData = groupDoc.data();
          const messagesRef = collection(db, 'group_chats', groupId, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
          const unsubscribeGroupMsg = onSnapshot(lastMsgQuery, async (lastMsgSnapshot) => {
            let newGroupChatItem: ChatItem;
            if (lastMsgSnapshot.empty) {
              newGroupChatItem = {
                chatId: groupId,
                otherUsername: groupData.name || 'קבוצה',
                otherUserImage: groupData.groupImage || 'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
                lastMessage: 'התחל שיחה חדשה',
                lastMessageTimestamp: groupData.lastUpdate?.toDate().getTime() || 0,
                isGroup: true,
                hasUnreadMessages: false,
                unreadCount: 0,
              };
            } else {
              const msg = lastMsgSnapshot.docs[0].data();
              const lastReadTimestamp = groupData.lastReadMessageTimestamp?.[user.uid]?.toDate();
              const lastMessageTimestamp = msg.createdAt?.toDate();
              const hasUnreadMessages =
                msg.senderId !== user.uid && (!lastReadTimestamp || lastReadTimestamp < lastMessageTimestamp);
              const unreadCount = hasUnreadMessages ?
                await countUnreadMessages(groupId, true, lastReadTimestamp) : 0;
              newGroupChatItem = {
                chatId: groupId,
                otherUsername: groupData.name || 'קבוצה',
                otherUserImage: groupData.groupImage || 'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
                lastMessage: msg.text || '',
                lastMessageTimestamp: lastMessageTimestamp?.getTime() || 0,
                isGroup: true,
                hasUnreadMessages,
                unreadCount,
              };
            }
            chatMapRef.current.set(groupId, newGroupChatItem);
            setChats(sortChats(Array.from(chatMapRef.current.values())));
            setLoading(false);
          }, (error) => {
            console.error('Error fetching last group message:', error);
          });
          chatListeners.current.push(unsubscribeGroupMsg);
        });
      }, (error) => {
        console.error('Error listening to group chats:', error);
        setLoading(false);
      });
      chatListeners.current.push(unsubscribeGroupChats);
    };
    loadChats();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter((chat) =>
        chat.otherUsername.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  const openChat = (chat: ChatItem) => {
    if (user && chat.hasUnreadMessages) {
      const collectionName = chat.isGroup ? 'group_chats' : 'chats';
      const chatDocRef = doc(db, collectionName, chat.chatId);
      updateDoc(chatDocRef, {
        [`lastReadMessageTimestamp.${user.uid}`]: new Date(),
      }).catch(e => console.error("Error updating read timestamp:", e));
    }
    if (chat.isGroup) {
      router.push({
        pathname: '/Chats/GroupChat/GroupChatModal',
        params: { eventTitle: chat.chatId },
      });
    } else {
      router.push({
        pathname: '/Chats/PersonalChat/chatModal',
        params: {
          otherUserId: chat.otherUserId!,
          otherUsername: chat.otherUsername,
          otherUserImage: chat.otherUserImage,
        },
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' },
        ]}
      >
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.isDark ? '#1F2937' : '#3A8DFF'}
        />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.isDark ? '#4A90E2' : '#3A8DFF'} />
          <Text
            style={[
              styles.loadingText,
              { color: theme.isDark ? '#BDC3C7' : '#666' },
            ]}
          >
            טוען צ'אטים...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.isDark ? '#1F2937' : '#3A8DFF'}
        translucent={Platform.OS === 'android'}
      />
      <ChatHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <View style={styles.contentContainer}>
        <FlatList
          data={filteredChats}
          renderItem={({ item }) => <ChatItem item={item} onPress={() => openChat(item)} />}
          keyExtractor={(item) => item.chatId}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.isDark ? '#BDC3C7' : '#666' }]}>
                  אין לך עדיין צ'אטים.
                </Text>
              </View>
            )
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  chatListContent: {
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
  },
});

export default Chat;