import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import {
    onDocumentCreated
} from 'firebase-functions/v2/firestore';

// Initialize Firebase Admin
admin.initializeApp();
const expo = new Expo();

// Defining the types for clarity and safety
interface Message {
  from_uid: string;
  from_username: string;
  body: string;
}

interface Chat {
  participants: string[];
}

interface GroupChat {
  members: string[];
}

interface User {
  expoPushTokens: string[];
}

exports.sendNotificationOnNewMessage = onDocumentCreated(
  '{chatType}/{chatId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return null;
    }
    const message = snapshot.data() as Message;
    const { chatType, chatId } = event.params;

    if (!message.from_uid || !message.body) {
      return null;
    }

    let recipientUids: string[] = [];

    if (chatType === 'chats') {
      const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
      const chatData = chatDoc.data() as Chat;

      const recipientUid = chatData.participants.find(uid => uid !== message.from_uid);
      if (recipientUid) {
        recipientUids.push(recipientUid);
      }
    } else if (chatType === 'group_chats') {
      const groupChatDoc = await admin.firestore().collection('group_chats').doc(chatId).get();
      const groupChatData = groupChatDoc.data() as GroupChat;

      recipientUids = groupChatData.members.filter(uid => uid !== message.from_uid);
    } else {
      console.log('Unknown chat type. Exiting.');
      return null;
    }

    const messages: ExpoPushMessage[] = [];
    for (const recipientUid of recipientUids) {
      const userDoc = await admin.firestore().collection('users').doc(recipientUid).get();
      const userData = userDoc.data() as User;

      if (userData && userData.expoPushTokens && userData.expoPushTokens.length > 0) {
        for (const pushToken of userData.expoPushTokens) {
          if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
          }

          messages.push({
            to: pushToken,
            sound: 'default',
            title: 'הודעה חדשה!',
            body: `${message.from_username} שלח/ה לך הודעה חדשה.`,
            data: { from: message.from_uid, to: recipientUid, chatType, chatId },
          });
        }
      }
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('שגיאה בשליחת התראות:', error);
      }
    }

    return null;
  }
);