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
import { useTheme } from '../../app/ProfileServices/ThemeContext'; // ✅ ייבוא useTheme
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
}

const ChatsList = () => {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const chatListeners = useRef<(() => void)[]>([]);
  const storage = getStorage(app);
  const { theme } = useTheme(); // ✅ שימוש ב-useTheme hook

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

  const sortChats = (chatArray: ChatItem[]) => {
    return [...chatArray].sort(
      (a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp
    );
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
    const chatMap = new Map<string, ChatItem>();

    const loadChats = async () => {
      const privateChatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );

      const unsubscribePrivateChats = onSnapshot(
        privateChatsQuery,
        async (chatsSnapshot) => {
          const privateChatPromises = chatsSnapshot.docs.map(
            async (chatDoc) => {
              const chatId = chatDoc.id;
              const chatData = chatDoc.data();
              const otherUserId = chatData.participants.find(
                (p: string) => p !== user.uid
              );

              if (!otherUserId) return null;

              const userDocRef = doc(db, 'users', otherUserId);
              const userDoc = await getDoc(userDocRef);

              if (!userDoc.exists()) {
                console.error('User data not found for ID:', otherUserId);
                return null;
              }
              const userData = userDoc.data();

              const profileImageUrl = await getProfileImageUrl(otherUserId);

              const messagesRef = collection(db, 'chats', chatId, 'messages');
              const lastMsgQuery = query(
                messagesRef,
                orderBy('createdAt', 'desc'),
                limit(1)
              );

              return new Promise<ChatItem | null>((resolve) => {
                const unsubscribeMsg = onSnapshot(
                  lastMsgQuery,
                  (lastMsgSnapshot) => {
                    if (lastMsgSnapshot.empty) {
                      unsubscribeMsg();
                      return resolve({
                        chatId,
                        otherUserId,
                        otherUsername: userData.username || 'משתמש',
                        otherUserImage: profileImageUrl,
                        lastMessage: 'התחל שיחה חדשה',
                        lastMessageTimestamp:
                          chatData.lastUpdate?.toDate().getTime() || 0,
                        isGroup: false,
                      });
                    }

                    const msg = lastMsgSnapshot.docs[0].data();
                    const newChatItem: ChatItem = {
                      chatId,
                      otherUserId,
                      otherUsername: userData.username || 'משתמש',
                      otherUserImage: profileImageUrl,
                      lastMessage: msg.text || '',
                      lastMessageTimestamp:
                        msg.createdAt?.toDate().getTime() || 0,
                      isGroup: false,
                    };
                    resolve(newChatItem);
                  },
                  (error) => {
                    console.error('Error fetching last message:', error);
                    resolve(null);
                  }
                );
                chatListeners.current.push(unsubscribeMsg);
              });
            }
          );

          const newPrivateChats = (await Promise.all(privateChatPromises)).filter(
            Boolean
          );
          newPrivateChats.forEach((chat) => chatMap.set(chat!.chatId, chat!));
          setChats(sortChats(Array.from(chatMap.values())));
          setLoading(false);
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
        async (groupSnapshot) => {
          const groupChatPromises = groupSnapshot.docs.map(async (groupDoc) => {
            const groupId = groupDoc.id;
            const groupData = groupDoc.data();

            const messagesRef = collection(db, 'group_chats', groupId, 'messages');
            const lastMsgQuery = query(
              messagesRef,
              orderBy('createdAt', 'desc'),
              limit(1)
            );

            return new Promise<ChatItem | null>((resolve) => {
              const unsubscribeGroupMsg = onSnapshot(
                lastMsgQuery,
                (lastMsgSnapshot) => {
                  if (lastMsgSnapshot.empty) {
                    unsubscribeGroupMsg();
                    return resolve({
                      chatId: groupId,
                      otherUsername: groupData.name || 'קבוצה',
                      otherUserImage:
                        groupData.groupImage ||
                        'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
                      lastMessage: 'התחל שיחה חדשה',
                      lastMessageTimestamp:
                        groupData.lastUpdate?.toDate().getTime() || 0,
                      isGroup: true,
                    });
                  }

                  const msg = lastMsgSnapshot.docs[0].data();
                  const newGroupChatItem: ChatItem = {
                    chatId: groupId,
                    otherUsername: groupData.name || 'קבוצה',
                    otherUserImage:
                      groupData.groupImage ||
                      'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
                    lastMessage: msg.text || '',
                    lastMessageTimestamp:
                      msg.createdAt?.toDate().getTime() || 0,
                    isGroup: true,
                  };
                  resolve(newGroupChatItem);
                },
                (error) => {
                  console.error('Error fetching last group message:', error);
                  resolve(null);
                }
              );
              chatListeners.current.push(unsubscribeGroupMsg);
            });
          });

          const newGroupChats = (await Promise.all(groupChatPromises)).filter(
            Boolean
          );
          newGroupChats.forEach((chat) => chatMap.set(chat!.chatId, chat!));
          setChats(sortChats(Array.from(chatMap.values())));
          setLoading(false);
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

  const openChat = (chat: ChatItem) => {
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

  /**
   * ✅ פונקציה חדשה שמוסיפה לוגיקה לתמונות של קבוצות
   */
  const renderChatAvatar = (item: ChatItem) => {
    if (item.isGroup) {
      // אם יש תמונה לקבוצה, נציג אותה
      if (item.otherUserImage && item.otherUserImage !== 'https://cdn-icons-png.flaticon.com/512/2621/2621042.png') {
        return (
          <Image
            source={{ uri: item.otherUserImage }}
            style={[
              styles.avatar,
              {
                borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF',
              },
            ]}
          />
        );
      }
      // אם אין תמונה, נציג אייקון של קבוצה
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
          <Ionicons
            name="people"
            size={24}
            color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
          />
        </View>
      );
    }

    // אם זה צ'אט פרטי, נציג את תמונת הפרופיל של המשתמש
    return (
      <Image
        source={{
          uri:
            item.otherUserImage ||
            'https://cdn-icons-png.flaticon.com/512/1946/1946429.png',
        }}
        style={[
          styles.avatar,
          {
            borderColor: theme.isDark ? '#4A90E2' : '#3A8DFF',
          },
        ]}
      />
    );
  };


  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        {
          backgroundColor: theme.isDark ? '#2C3E50' : '#FFFFFF', // צבע רקע
          shadowColor: theme.isDark ? '#1F2937' : '#000', // צבע צל
        },
      ]}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {/* ✅ נחליף את הלוגיקה כאן בקריאה לפונקציה החדשה */}
        {renderChatAvatar(item)}
      </View>

      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
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
              styles.time,
              { color: theme.isDark ? '#95A5A6' : '#95A5A6' },
            ]}
          >
            {formatTimestamp(item.lastMessageTimestamp)}
          </Text>
        </View>
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
      <Ionicons
        name="chevron-back"
        size={20}
        color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
      />
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
          <ActivityIndicator
            size="large"
            color={theme.isDark ? '#4A90E2' : '#3A8DFF'}
          />
          <Text
            style={[
              styles.loadingText,
              { color: theme.isDark ? '#BDC3C7' : '#666' },
            ]}
          >
            טוען צאטים...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' },
      ]}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.isDark ? '#1F2937' : '#3A8DFF'}
      />
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
          הצאטים שלך
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: theme.isDark ? '#A0C4FF' : '#FFE0B3' },
          ]}
        >
          התחבר עם חברים למסע
        </Text>
      </View>
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
            color={theme.isDark ? '#BDC3C7' : '#999'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.isDark ? '#E0E0E0' : '#333',
              },
            ]}
            placeholder="חפש חברים..."
            placeholderTextColor={theme.isDark ? '#BDC3C7' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
        </View>
      </View>
      <View style={styles.listContainer}>
        {filteredChats.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubbles-outline"
              size={80}
              color={theme.isDark ? '#4A90E2' : '#E0E0E0'}
            />
            <Text
              style={[
                styles.emptyStateTitle,
                { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
              ]}
            >
              אין צאטים עדיין
            </Text>
            <Text
              style={[
                styles.emptyStateSubtitle,
                { color: theme.isDark ? '#BDC3C7' : '#95A5A6' },
              ]}
            >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
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
    backgroundColor: '#3A8DFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#3A8DFF',
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
    borderColor: '#3A8DFF',
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
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3A8DFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});