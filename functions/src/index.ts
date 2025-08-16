import { Expo } from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

// Set the global region for all functions
setGlobalOptions({ region: 'me-west1' });

// Initialize Firebase Admin
admin.initializeApp();

const expo = new Expo();

exports.sendNotificationOnNewMessage = onDocumentCreated('{chatType}/{chatId}/messages/{messageId}', async (event) => {
    console.log('--- התחלת תהליך שליחת התראה ---');
    
    const snapshot = event.data;
    if (!snapshot) {
        console.log('אין snapshot, הפונקציה חוזרת.');
        return null;
    }
    
    const message = snapshot.data();
    const { chatType, chatId } = event.params;
    
    console.log(`קבלת הודעה חדשה: chatType=${chatType}, chatId=${chatId}`);

    // Check if the message has essential data, using the correct field names
    if (!message.senderId || !message.text) {
        console.log('חסרים נתונים בהודעה (senderId או text). הפונקציה חוזרת.');
        return null;
    }

    console.log(`שולח ההודעה: ${message.senderId}`);
    console.log(`תוכן ההודעה: "${message.text}"`);

    let recipientUids: string[] = [];

    try {
        if (chatType === 'chats') {
            console.log('סוג צ\'אט: פרטי. מחפש משתתף נוסף.');
            const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
            const chatData = chatDoc.data();
            
            // Check if chatData exists and has a 'participants' array
            if (chatData && Array.isArray(chatData.participants)) {
                const recipientUid = chatData.participants.find((uid: string) => uid !== message.senderId);
                if (recipientUid) {
                    recipientUids.push(recipientUid);
                    console.log(`נמען יחיד נמצא: ${recipientUid}`);
                } else {
                    console.log('נמען לא נמצא בצ\'אט.');
                }
            } else {
                console.log('אין נתוני צ\'אט או שאין מערך משתתפים.');
            }
        } else if (chatType === 'group_chats') {
            console.log('סוג צ\'אט: קבוצתי. מחפש את כל חברי הקבוצה.');
            const groupChatDoc = await admin.firestore().collection('group_chats').doc(chatId).get();
            const groupChatData = groupChatDoc.data();

            // Check if groupChatData exists and has a 'members' array
            if (groupChatData && Array.isArray(groupChatData.members)) {
                recipientUids = groupChatData.members.filter((uid: string) => uid !== message.senderId);
                console.log(`נמענים שנמצאו: ${recipientUids.join(', ')}`);
            } else {
                console.log('אין נתוני צ\'אט קבוצתי או שאין מערך חברים.');
            }
        } else {
            console.log('סוג צ\'אט לא מוכר. יציאה.');
            return null;
        }

        const messages: any[] = [];
        for (const recipientUid of recipientUids) {
            console.log(`מעבד התראות עבור נמען: ${recipientUid}`);
            const userDoc = await admin.firestore().collection('users').doc(recipientUid).get();
            const userData = userDoc.data();

            if (userData && userData.expoPushTokens && userData.expoPushTokens.length > 0) {
                for (const pushToken of userData.expoPushTokens) {
                    console.log(`נמצא טוקן פוש: ${pushToken}`);
                    if (!Expo.isExpoPushToken(pushToken)) {
                        console.error(`Push token ${pushToken} is not a valid Expo push token`);
                        continue;
                    }

                    messages.push({
                        to: pushToken,
                        sound: 'default',
                        title: 'הודעה חדשה!',
                        // Use the correct field for the message body and the assumed sender's username
                        body: `${message.senderUsername || 'משתמש לא ידוע'} שלח/ה לך הודעה חדשה.`,
                        data: { from: message.senderId, to: recipientUid, chatType, chatId },
                    });
                    console.log('הודעה נוספה למערך לשליחה.');
                }
            } else {
                console.log(`אין נתוני משתמש או טוקנים עבור נמען: ${recipientUid}`);
            }
        }

        console.log(`סה"כ הודעות להכנה: ${messages.length}`);
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                console.log('שולח חבילת התראות ל-Expo...');
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
                console.log('שליחה ל-Expo הושלמה.');
            } catch (error) {
                console.error('שגיאה בשליחת התראות:', error);
            }
        }

        console.log('--- סיום תהליך שליחת התראה ---');
        return null;
    } catch (error) {
        console.error('שגיאה כללית בפונקציה:', error);
        return null;
    }
});
