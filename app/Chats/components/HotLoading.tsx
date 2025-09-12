import { User } from 'firebase/auth';
import {
    collection,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    QueryDocumentSnapshot,
    startAfter,
    where,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

export const CHATS_PER_PAGE = 25;

export interface ChatItem {
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

export interface PaginationCursors {
  lastPrivateChatDoc: QueryDocumentSnapshot<DocumentData> | null;
  lastGroupChatDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export class HotLoadingService {
  private static instance: HotLoadingService;

  public static getInstance(): HotLoadingService {
    if (!HotLoadingService.instance) {
      HotLoadingService.instance = new HotLoadingService();
    }
    return HotLoadingService.instance;
  }

  // Function to get the profile image URL from Firestore
  private async getProfileImageUrl(userId: string): Promise<string> {
    try {
      if (!userId) {
        return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
      }
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().profile_image) {
        return userDoc.data().profile_image;
      } else {
        console.warn(`User profile document not found or missing image for ID: ${userId}`);
        return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
      }
    } catch (e) {
      console.warn(`Error fetching user image for ${userId}:`, e);
      return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
    }
  }

  private async countUnreadMessages(
    chatId: string, 
    isGroup: boolean, 
    userId: string,
    lastReadTimestamp?: Date
  ): Promise<number> {
    try {
      const collectionName = isGroup ? 'group_chats' : 'chats';
      const messagesRef = collection(db, collectionName, chatId, 'messages');
      let unreadQuery;
      if (lastReadTimestamp) {
        unreadQuery = query(
          messagesRef,
          where('createdAt', '>', lastReadTimestamp),
          where('senderId', '!=', userId)
        );
      } else {
        unreadQuery = query(messagesRef, where('senderId', '!=', userId));
      }
      const snapshot = await getDocs(unreadQuery);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error counting unread messages:', error);
      return 0;
    }
  }

  public sortChats(chatArray: ChatItem[]): ChatItem[] {
    return [...chatArray].sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  }

  private async processPrivateChats(
    chatsSnapshot: any, 
    user: User
  ): Promise<ChatItem[]> {
    console.log('Processing private chats:', chatsSnapshot.docs.length, 'docs found.');
    const chatPromises = chatsSnapshot.docs.map(async (chatDoc: any) => {
      const chatId = chatDoc.id;
      const chatData = chatDoc.data();
      const otherUserId = chatData.participants?.find((p: string) => p !== user.uid);
      
      console.log(`Processing chat ID: ${chatId}, found otherUserId: ${otherUserId}`);

      if (!otherUserId) {
        console.warn(`Skipping chat ${chatId}: No other participant found.`);
        return null;
      }

      const userDocRef = doc(db, 'users', otherUserId);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        console.warn(`Skipping chat ${chatId}: User data for ID ${otherUserId} not found.`);
        return null;
      }

      const userData = userDoc.data();
      const profileImageUrl = userData?.profile_image || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
      
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
      const lastMsgSnapshot = await getDocs(lastMsgQuery);

      let newChatItem: ChatItem;
      if (lastMsgSnapshot.empty) {
        console.log(`Chat ${chatId} has no messages. Using lastUpdate.`);
        newChatItem = {
          chatId,
          otherUserId,
          otherUsername: userData?.username || 'משתמש',
          otherUserImage: profileImageUrl,
          lastMessage: 'התחל שיחה חדשה',
          lastMessageTimestamp: chatData.lastUpdate?.toDate()?.getTime() || 0,
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
          await this.countUnreadMessages(chatId, false, user.uid, lastReadTimestamp) : 0;
        
        console.log(`Chat ${chatId} has messages. Last message: ${msg.text || msg.imageUrl}`);
        newChatItem = {
          chatId,
          otherUserId,
          otherUsername: userData?.username || 'משתמש',
          otherUserImage: profileImageUrl,
          lastMessage: msg.imageUrl ? 'תמונה' : (msg.text || 'התחל שיחה חדשה'),
          lastMessageTimestamp: lastMessageTimestamp?.getTime() || 0,
          isGroup: false,
          hasUnreadMessages,
          unreadCount,
        };
      }
      return newChatItem;
    });

    const processedChats = (await Promise.all(chatPromises)).filter(Boolean) as ChatItem[];
    console.log('Finished processing private chats. Total valid chats:', processedChats.length);
    return processedChats;
  }

  private async processGroupChats(
    groupSnapshot: any, 
    user: User
  ): Promise<ChatItem[]> {
    console.log('Processing group chats:', groupSnapshot.docs.length, 'docs found.');
    const groupPromises = groupSnapshot.docs.map(async (groupDoc: any) => {
      const groupId = groupDoc.id;
      const groupData = groupDoc.data();
      
      if (!groupData?.name || !groupData?.groupImage) {
        console.warn(`Skipping group chat ${groupId}: Missing 'name' or 'groupImage' fields.`);
        return null;
      }

      const messagesRef = collection(db, 'group_chats', groupId, 'messages');
      const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
      const lastMsgSnapshot = await getDocs(lastMsgQuery);

      let newGroupChatItem: ChatItem;
      if (lastMsgSnapshot.empty) {
        console.log(`Group chat ${groupId} has no messages. Using lastUpdate.`);
        newGroupChatItem = {
          chatId: groupId,
          otherUsername: groupData.name,
          otherUserImage: groupData.groupImage,
          lastMessage: 'התחל שיחה חדשה',
          lastMessageTimestamp: groupData.lastUpdate?.toDate()?.getTime() || 0,
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
          await this.countUnreadMessages(groupId, true, user.uid, lastReadTimestamp) : 0;
        
        console.log(`Group chat ${groupId} has messages. Last message: ${msg.text || msg.imageUrl}`);
        newGroupChatItem = {
          chatId: groupId,
          otherUsername: groupData.name,
          otherUserImage: groupData.groupImage,
          lastMessage: msg.imageUrl ? 'תמונה' : (msg.text || 'התחל שיחה חדשה'),
          lastMessageTimestamp: lastMessageTimestamp?.getTime() || 0,
          isGroup: true,
          hasUnreadMessages,
          unreadCount,
        };
      }
      return newGroupChatItem;
    });

    const processedGroups = (await Promise.all(groupPromises)).filter(Boolean) as ChatItem[];
    console.log('Finished processing group chats. Total valid groups:', processedGroups.length);
    return processedGroups;
  }

  public async loadInitialChats(user: User): Promise<{
    chats: ChatItem[];
    cursors: PaginationCursors;
    hasMore: boolean;
  }> {
    if (!user?.uid) {
      console.warn('User UID is not available. Returning empty chats array.');
      return { chats: [], cursors: { lastPrivateChatDoc: null, lastGroupChatDoc: null }, hasMore: false };
    }

    try {
      console.log('Attempting to load initial chats for user:', user.uid);
      // Load private chats
      const privateChatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        orderBy('lastUpdate', 'desc'),
        limit(Math.ceil(CHATS_PER_PAGE / 2))
      );
      
      const privateChatSnapshot = await getDocs(privateChatsQuery);
      const privateChats = await this.processPrivateChats(privateChatSnapshot, user);
      
      const lastPrivateChatDoc = privateChatSnapshot.docs.length > 0 ? 
        privateChatSnapshot.docs[privateChatSnapshot.docs.length - 1] : null;

      // Load group chats
      const groupChatsQuery = query(
        collection(db, 'group_chats'),
        where('members', 'array-contains', user.uid),
        orderBy('lastUpdate', 'desc'),
        limit(Math.ceil(CHATS_PER_PAGE / 2))
      );
      
      const groupChatSnapshot = await getDocs(groupChatsQuery);
      const groupChats = await this.processGroupChats(groupChatSnapshot, user);
      
      const lastGroupChatDoc = groupChatSnapshot.docs.length > 0 ? 
        groupChatSnapshot.docs[groupChatSnapshot.docs.length - 1] : null;

      const allChats = [...privateChats, ...groupChats];
      const sortedChats = this.sortChats(allChats);
      
      const hasMore = privateChatSnapshot.docs.length >= Math.ceil(CHATS_PER_PAGE / 2) || 
                     groupChatSnapshot.docs.length >= Math.ceil(CHATS_PER_PAGE / 2);

      console.log(`Total chats loaded: ${sortedChats.length}. Has more: ${hasMore}`);
      
      return {
        chats: sortedChats,
        cursors: { lastPrivateChatDoc, lastGroupChatDoc },
        hasMore
      };
      
    } catch (error) {
      console.error('CRITICAL ERROR loading initial chats:', error);
      return { chats: [], cursors: { lastPrivateChatDoc: null, lastGroupChatDoc: null }, hasMore: false };
    }
  }

  public async loadMoreChats(
    user: User, 
    cursors: PaginationCursors
  ): Promise<{
    chats: ChatItem[];
    cursors: PaginationCursors;
    hasMore: boolean;
  }> {
    if (!user?.uid) {
      console.warn('User UID is not available. Returning empty chats array.');
      return { chats: [], cursors, hasMore: false };
    }

    try {
      let newPrivateChats: ChatItem[] = [];
      let newGroupChats: ChatItem[] = [];
      let newLastPrivateChatDoc = cursors.lastPrivateChatDoc;
      let newLastGroupChatDoc = cursors.lastGroupChatDoc;

      // Load more private chats if we have a cursor
      if (cursors.lastPrivateChatDoc) {
        const morePrivateChatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid),
          orderBy('lastUpdate', 'desc'),
          startAfter(cursors.lastPrivateChatDoc),
          limit(Math.ceil(CHATS_PER_PAGE / 2))
        );
        
        const morePrivateChatSnapshot = await getDocs(morePrivateChatsQuery);
        newPrivateChats = await this.processPrivateChats(morePrivateChatSnapshot, user);
        
        if (morePrivateChatSnapshot.docs.length > 0) {
          newLastPrivateChatDoc = morePrivateChatSnapshot.docs[morePrivateChatSnapshot.docs.length - 1];
        }
      }

      // Load more group chats if we have a cursor
      if (cursors.lastGroupChatDoc) {
        const moreGroupChatsQuery = query(
          collection(db, 'group_chats'),
          where('members', 'array-contains', user.uid),
          orderBy('lastUpdate', 'desc'),
          startAfter(cursors.lastGroupChatDoc),
          limit(Math.ceil(CHATS_PER_PAGE / 2))
        );
        
        const moreGroupChatSnapshot = await getDocs(moreGroupChatsQuery);
        newGroupChats = await this.processGroupChats(moreGroupChatSnapshot, user);
        
        if (moreGroupChatSnapshot.docs.length > 0) {
          newLastGroupChatDoc = moreGroupChatSnapshot.docs[moreGroupChatSnapshot.docs.length - 1];
        }
      }

      const newChats = [...newPrivateChats, ...newGroupChats];
      const hasMore = newChats.length >= CHATS_PER_PAGE;

      console.log(`Loaded ${newChats.length} more chats.`);

      return {
        chats: newChats,
        cursors: { 
          lastPrivateChatDoc: newLastPrivateChatDoc, 
          lastGroupChatDoc: newLastGroupChatDoc 
        },
        hasMore
      };

    } catch (error) {
      console.error('CRITICAL ERROR loading more chats:', error);
      return { chats: [], cursors, hasMore: false };
    }
  }
}