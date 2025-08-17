// הקוד המתוקן עם תיקון לכותרת
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
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
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { app, db } from '../../firebaseConfig';

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

  // הפונקציות נשארות אותו דבר...
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

      const sortedItems = result.items.sort((a, b) =>
        b.name.localeCompare(a.name)
      );
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

      return new Promise<number>((resolve) => {
        const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
          resolve(snapshot.docs.length);
          unsubscribe();
        });
      });
    } catch (error) {
      console.error('Error counting unread messages:', error);
      return 0;
    }
  };

  const sortChats = (chatArray: ChatItem[]) => {
    return [...chatArray].sort(
      (a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp
    );
  };

  // כל ה-useEffect נשארים אותו דבר...
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

      const unsubscribePrivateChats = onSnapshot(
        privateChatsQuery,
        (chatsSnapshot) => {
          chatsSnapshot.docChanges().forEach(async (change) => {
            const chatDoc = change.doc;
            const chatId = chatDoc.id;
            const chatData = chatDoc.data();
            const otherUserId = chatData.participants.find(
              (p: string) => p !== user.uid
            );

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
            const lastMsgQuery = query(
              messagesRef,
              orderBy('createdAt', 'desc'),
              limit(1)
            );

            const unsubscribeMsg = onSnapshot(
              lastMsgQuery,
              async (lastMsgSnapshot) => {
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
                    msg.senderId !== user.uid &&
                    (!lastReadTimestamp || lastReadTimestamp < lastMessageTimestamp);

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
              },
              (error) => {
                console.error('Error fetching last message:', error);
              }
            );
            chatListeners.current.push(unsubscribeMsg);
          });
        },
        (error) => {
          console.error('Error listening to private chats:', error);
          setLoading(false);
        }
      );

      chatListeners.current.push(unsubscribePrivateChats);

      const groupChatsQuery = query(
        collection(db, 'group_chats'),
        where('members', 'array-contains', user.uid)
      );

      const unsubscribeGroupChats = onSnapshot(
        groupChatsQuery,
        (groupSnapshot) => {
          groupSnapshot.docChanges().forEach(async (change) => {
            const groupDoc = change.doc;
            const groupId = groupDoc.id;
            const groupData = groupDoc.data();

            const messagesRef = collection(db, 'group_chats', groupId, 'messages');
            const lastMsgQuery = query(
              messagesRef,
              orderBy('createdAt', 'desc'),
              limit(1)
            );

            const unsubscribeGroupMsg = onSnapshot(
              lastMsgQuery,
              async (lastMsgSnapshot) => {
                let newGroupChatItem: ChatItem;
                if (lastMsgSnapshot.empty) {
                  newGroupChatItem = {
                    chatId: groupId,
                    otherUsername: groupData.name || 'קבוצה',
                    otherUserImage:
                      groupData.groupImage ||
                      'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
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
                    msg.senderId !== user.uid &&
                    (!lastReadTimestamp || lastReadTimestamp < lastMessageTimestamp);

                  const unreadCount = hasUnreadMessages ?
                    await countUnreadMessages(groupId, true, lastReadTimestamp) : 0;

                  newGroupChatItem = {
                    chatId: groupId,
                    otherUsername: groupData.name || 'קבוצה',
                    otherUserImage:
                      groupData.groupImage ||
                      'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
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
              },
              (error) => {
                console.error('Error fetching last group message:', error);
              }
            );
            chatListeners.current.push(unsubscribeGroupMsg);
          });
        },
        (error) => {
          console.error('Error listening to group chats:', error);
          setLoading(false);
        }
      );

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

  // הפונקציות הנוספות נשארות אותו דבר...
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
        pathname: '/Chats/GroupChatModal',
        params: { eventTitle: chat.chatId },
      });
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

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';
    const now = moment();
    const messageTime = moment(timestamp);

    if (now.isSame(messageTime, 'day')) {
      return messageTime.format('HH:mm');
    } else if (now.clone().subtract(1, 'days').isSame(messageTime, 'day')) {
      return 'אתמול';
    } else if (now.isSame(messageTime, 'week')) {
      return messageTime.format('dddd');
    } else if (now.isSame(messageTime, 'year')) {
      return messageTime.format('D MMM');
    } else {
      return messageTime.format('D MMM YY');
    }
  };

  const renderChatAvatar = (item: ChatItem) => {
    if (item.isGroup) {
      if (item.otherUserImage && item.otherUserImage !== 'https://cdn-icons-png.flaticon.com/512/2621/2621042.png') {
        return (
          <Image
            source={{ uri: item.otherUserImage }}
            style={[
              styles.avatar,
              { borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF', },
            ]}
          />
        );
      }
      return (
        <View
          style={[
            styles.groupIcon,
            {
              backgroundColor: theme.isDark ? '#3E506B' : '#FFFFFF',
              borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF',
              shadowColor: theme.isDark ? '#1F2937' : '#000',
            },
          ]}
        >
          <Ionicons name="people" size={24} color={theme.isDark ? '#A0C4FF' : '#3A8DFF'} />
        </View>
      );
    }
    return (
      <Image
        source={{ uri: item.otherUserImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png', }}
        style={[
          styles.avatar,
          { borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF', },
        ]}
      />
    );
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        {
          backgroundColor: theme.isDark ? '#2C3E50' : '#FFFFFF',
          shadowColor: theme.isDark ? '#1F2937' : '#000',
        },
      ]}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {renderChatAvatar(item)}
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.username,
            { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
          ]}
        >
          {item.otherUsername}
        </Text>
        <Text
          style={[
            styles.lastMessage,
            { color: theme.isDark ? '#BDC3C7' : '#7F8C8D' },
          ]}
          numberOfLines={1}
        >
          {item.lastMessage || 'התחל שיחה חדשה'}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        <View style={styles.timeRow}>
          <Text
            style={[
              styles.time,
              { color: theme.isDark ? '#95A5A6' : '#95A5A6' },
            ]}
          >
            {formatTimestamp(item.lastMessageTimestamp)}
          </Text>
          {item.hasUnreadMessages && item.unreadCount > 0 && (
            <View style={[
              styles.unreadBadge,
              { backgroundColor: theme.isDark ? '#4A90E2' : '#3A8DFF' }
            ]}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
      <SafeAreaView
        style={[
          styles.headerSafeArea,
          { backgroundColor: theme.isDark ? '#1F2937' : '#3A8DFF' }
        ]}
        edges={['top']}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.isDark ? '#1F2937' : '#3A8DFF',
              shadowColor: theme.isDark ? '#1F2937' : '#3A8DFF',
            },
          ]}
        >
        <Text
          style={[
            styles.headerTitle,
            { color: theme.isDark ? '#FFFFFF' : '#FFFFFF' },
          ]}
        >
          הצ'אטים שלך
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: theme.isDark ? '#A0C4FF' : '#FFFFFF' },
          ]}
        >
          התחבר עם חברים למסע
        </Text>
              </View>
      </SafeAreaView>
      <View style={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.isDark ? '#2C3E50' : '#FFFFFF',
                shadowColor: theme.isDark ? '#000' : '#000',
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.isDark ? '#BDC3C7' : '#95A5A6'}
              style={{ marginLeft: 10 }}
            />
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.isDark ? '#E0E0E0' : '#333' },
              ]}
              placeholder="חיפוש צ'אטים"
              placeholderTextColor={theme.isDark ? '#BDC3C7' : '#95A5A6'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
          </View>
        </View>
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
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

// עדכון הסטיילים - הוספת סטיילים חדשים וחלוקה נכונה
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
  headerSafeArea: {
    backgroundColor: '#3A8DFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#3A8DFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3A8DFF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: -20,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  searchContainer: {
    padding: 15,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 30,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  chatListContent: {
    paddingTop: 10,
  },
  chatItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#3A8DFF',
  },
  groupIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'right',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'right',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 3,
  },
  unreadBadge: {
    backgroundColor: '#3A8DFF',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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