import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import moment from 'moment'; // Library for date formatting (install if not already)
import 'moment/locale/he'; // Import Hebrew locale for moment
import React, { useEffect, useRef, useState } from 'react'; // useRef for handling unmount
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform // Added Platform to handle OS-specific styles
  ,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

// Set moment locale to Hebrew
moment.locale('he');

const { width, height } = Dimensions.get('window');

interface ChatItem {
  chatId: string;
  otherUserId?: string;
  otherUsername: string;
  otherUserImage: string;
  lastMessage: string;
  lastMessageTimestamp: number; // Added for sorting
  isGroup?: boolean;
}

const ChatsList = () => {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets(); // Already correctly using useSafeAreaInsets

  // useRef to keep track of active listeners for cleanup
  const unsubscribeListeners = useRef<(() => void)[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    // Add auth unsubscribe to cleanup
    return () => {
      unsubscribeAuth();
      // Unsubscribe all Firestore listeners when component unmounts
      unsubscribeListeners.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    // Cleanup previous listeners when user changes or component re-renders
    unsubscribeListeners.current.forEach(unsubscribe => unsubscribe());
    unsubscribeListeners.current = [];

    const loadAndListenToChats = async () => {
      const allChatItems: ChatItem[] = [];
      const chatMap = new Map<string, ChatItem>(); // To easily update existing chats

      // --- Private Chats Listener ---
      const privateChatsQuery = query(collection(db, 'chats'));
      const unsubscribePrivateChats = onSnapshot(privateChatsQuery, async (chatsSnapshot) => {
        const privateChatPromises = chatsSnapshot.docs.map(async (chatDoc) => {
          const chatId = chatDoc.id;
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

          return new Promise<ChatItem | null>((resolve) => {
            const unsubscribeMsg = onSnapshot(lastMsgQuery, async (lastMsgSnapshot) => {
              if (lastMsgSnapshot.empty) {
                unsubscribeMsg(); // No messages, so no need to listen
                return resolve(null);
              }

              const msg = lastMsgSnapshot.docs[0].data();
              const { senderId, receiverId, text, createdAt } = msg;

              // Ensure the current user is part of this chat
              if (senderId !== user.uid && receiverId !== user.uid) {
                unsubscribeMsg(); // Not relevant to current user
                return resolve(null);
              }

              const otherUserId = senderId === user.uid ? receiverId : senderId;

              // Fetch other user's profile
              const response = await fetch(`https://tripping-app.onrender.com/get-other-user-profile?uid=${otherUserId}`);
              if (!response.ok) {
                console.error('Failed to fetch user data for ID:', otherUserId);
                unsubscribeMsg();
                return resolve(null);
              }
              const userData = await response.json();

              const newChatItem: ChatItem = {
                chatId,
                otherUserId,
                otherUsername: userData.username || 'משתמש',
                otherUserImage: userData.profile_image || '',
                lastMessage: text || '',
                lastMessageTimestamp: createdAt?.toDate().getTime() || 0,
                isGroup: false,
              };

              // Update the map and trigger state update
              chatMap.set(chatId, newChatItem);
              setChats(sortChats(Array.from(chatMap.values())));
              setLoading(false);
              resolve(newChatItem); // Resolve the promise
            });
            unsubscribeListeners.current.push(unsubscribeMsg); // Store for cleanup
          });
        });

        // Wait for all private chat promises to resolve to update the initial state
        await Promise.all(privateChatPromises);
        setChats(sortChats(Array.from(chatMap.values())));
        setLoading(false);
      }, (error) => {
        console.error('Error listening to private chats:', error);
        setLoading(false);
      });
      unsubscribeListeners.current.push(unsubscribePrivateChats);

      // --- Group Chats Listener ---
      const groupChatsQuery = query(collection(db, 'group_chats'));
      const unsubscribeGroupChats = onSnapshot(groupChatsQuery, async (groupSnapshot) => {
        const groupChatPromises = groupSnapshot.docs.map(async (groupDoc) => {
          const groupId = groupDoc.id;
          // Check if current user is a member of the group (assuming you have a 'members' field)
          const groupData = groupDoc.data();
          if (!groupData.members || !groupData.members.includes(user.uid)) {
            return null; // Skip if user is not a member
          }

          const messagesRef = collection(db, 'group_chats', groupId, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

          return new Promise<ChatItem | null>((resolve) => {
            const unsubscribeGroupMsg = onSnapshot(lastMsgQuery, (lastMsgSnapshot) => {
              if (lastMsgSnapshot.empty) {
                unsubscribeGroupMsg();
                return resolve(null);
              }

              const msg = lastMsgSnapshot.docs[0].data();
              const newGroupChatItem: ChatItem = {
                chatId: groupId,
                otherUsername: groupData.name || 'קבוצה', // Assuming group name is stored here
                otherUserImage: groupData.groupImage || 'https://cdn-icons-png.flaticon.com/512/2621/2621042.png',
                lastMessage: msg.text || '',
                lastMessageTimestamp: msg.createdAt?.toDate().getTime() || 0,
                isGroup: true,
              };

              // Update the map and trigger state update
              chatMap.set(groupId, newGroupChatItem);
              setChats(sortChats(Array.from(chatMap.values())));
              setLoading(false);
              resolve(newGroupChatItem);
            });
            unsubscribeListeners.current.push(unsubscribeGroupMsg);
          });
        });

        // Wait for all group chat promises to resolve to update the initial state
        await Promise.all(groupChatPromises);
        setChats(sortChats(Array.from(chatMap.values())));
        setLoading(false);
      }, (error) => {
        console.error('Error listening to group chats:', error);
        setLoading(false);
      });
      unsubscribeListeners.current.push(unsubscribeGroupChats);
    };

    loadAndListenToChats();

    // Cleanup function for useEffect
    return () => {
      unsubscribeListeners.current.forEach(unsubscribe => unsubscribe());
      unsubscribeListeners.current = [];
    };
  }, [user]); // Rerun when user changes

  // Helper function to sort chats
  const sortChats = (chatArray: ChatItem[]) => {
    return [...chatArray].sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  };

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

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';
    const now = moment();
    const messageTime = moment(timestamp);

    if (now.isSame(messageTime, 'day')) {
      return messageTime.format('HH:mm'); // Today: 14:30
    } else if (now.clone().subtract(1, 'days').isSame(messageTime, 'day')) {
      return 'אתמול'; // Yesterday
    } else if (now.isSame(messageTime, 'week')) {
      return messageTime.format('dddd'); // Same week: Sunday
    } else if (now.isSame(messageTime, 'year')) {
      return messageTime.format('D MMM'); // Same year: 5 ביולי
    } else {
      return messageTime.format('D MMM YY'); // Older: 5 ביולי 24
    }
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.isGroup ? (
          <View style={styles.groupIcon}>
            <Ionicons name="people" size={24} color="#FF6F00" />
          </View>
        ) : (
          <Image
            source={{
              uri: item.otherUserImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png'
            }}
            style={styles.avatar}
          />
        )}
      </View>

      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.username}>{item.otherUsername}</Text>
          <Text style={styles.time}>{formatTimestamp(item.lastMessageTimestamp)}</Text>
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
      // Changed to SafeAreaView for consistent behavior
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
    // Changed to SafeAreaView to correctly handle safe areas
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6F00" />
      {/*
        The header component already has padding based on `paddingTop: 16`.
        Since `SafeAreaView` adds its own padding, we need to adjust the header's paddingTop.
        We can set `edges={['top']}` on SafeAreaView and handle bottom padding for the list.
        Or, more simply, remove the `paddingTop` from `styles.container` and `styles.loadingContainer`
        and let `SafeAreaView` handle it automatically.
      */}
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

const styles = StyleSheet.create({
  // Main container should take full space and SafeAreaView will handle insets
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center', // Added for centering content in loading state
    alignItems: 'center',    // Added for centering content in loading state
  },
  loadingContent: {
    // These styles moved from loadingContainer to here for clarity
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
    // Removed paddingTop and used insets in the component's render method
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Add padding top for Android StatusBar
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
    borderColor: '#FF6F00',
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