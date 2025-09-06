import { Expo } from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import * as nodemailer from 'nodemailer';

// הגדרת האזור הגלובלי לכל הפונקציות
setGlobalOptions({ region: 'me-west1' });

// אתחול Firebase Admin
admin.initializeApp();

const expo = new Expo();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'trekappil@gmail.com', // החלף בכתובת המייל שלך
        pass: 'rbvf xsmw xoaj dluv' // החלף בסיסמה/סיסמת אפליקציה שלך
    }
});

/**
 * פונקציית Cloud Function הנקראת מהאפליקציה ושולחת אימייל על דיווח משתמש.
 */
exports.sendReportEmail = onCall(async (request) => {
    console.log('--- התחלת תהליך שליחת דיווח על משתמש ---');
    
    // בדיקת אימות המשתמש ששלח את הדיווח
    const reporterUid = request.auth?.uid;
    if (!reporterUid) {
        console.error('משתמש לא מאומת.');
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // קבלת נתונים מהבקשה
    const { reportedUserId, reportedUserUsername, reasons, otherReason } = request.data;
    
    // ודא שהנתונים הנדרשים קיימים
    if (!reportedUserId || !reportedUserUsername || (!reasons && !otherReason)) {
        console.error('חסרים נתוני דיווח חיוניים.');
        throw new functions.https.HttpsError('invalid-argument', 'Missing required report data.');
    }

    try {
        // שליפת שם המשתמש של המדווח מה-Firestore
        const reporterDoc = await admin.firestore().collection('users').doc(reporterUid).get();
        const reporterUsername = reporterDoc.data()?.username || 'משתמש לא ידוע';

        // בניית גוף המייל
        const reasonText = Array.isArray(reasons) ? reasons.join(', ') : '';
        const emailBody = `
            <b>דיווח חדש על משתמש</b><br><br>
            <b>פרטי הדיווח:</b><br>
            <b>מדווח:</b> ${reporterUsername} (${reporterUid})<br>
            <b>משתמש מדווח:</b> ${reportedUserUsername} (${reportedUserId})<br>
            <b>סיבות:</b> ${reasonText}<br>
            <b>פירוט נוסף:</b> ${otherReason || 'אין פירוט נוסף'}<br><br>
            ---
        `;

        const mailOptions = {
            from: 'noreply@yourdomain.com', // מומלץ להשתמש במייל של דומיין כדי להימנע מספאם
            to: 'trekappil@gmail.com', // החלף במייל שלך לקבלת הדיווחים
            subject: `דיווח על משתמש: ${reportedUserUsername}`,
            html: emailBody
        };

        await transporter.sendMail(mailOptions);
        console.log(`מייל דיווח נשלח בהצלחה על המשתמש: ${reportedUserUsername}`);

        return { success: true };
    } catch (error) {
        console.error('שגיאה בשליחת המייל:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send report email.', error);
    }
});

/**
 * פונקציית עזר לשליחת התראות
 */
const sendPushNotification = async (to: string, title: string, body: string, data: any) => {
    // בדיקה אם הטוקן תקין
    if (!Expo.isExpoPushToken(to)) {
        console.error(`Push token ${to} is not a valid Expo push token`);
        return;
    }

    const message = {
        to: to,
        sound: 'default',
        title: title,
        body: body,
        data: data,
    };

    try {
        await expo.sendPushNotificationsAsync([message]);
        console.log(`התראה נשלחה בהצלחה לטוקן: ${to}`);
    } catch (error) {
        console.error('שגיאה בשליחת התראה:', error);
    }
};

/**
 * פונקציה זו מופעלת כאשר מסמך ב-imageLikes מתעדכן.
 * היא שולחת התראת פוש לבעל התמונה כאשר נוסף לייק.
 */
exports.sendNotificationOnImageLike = onDocumentUpdated('imageLikes/{likeableImageId}', async (event) => {
    console.log('--- התחלת תהליך שליחת התראת לייק על תמונה ---');
    
    if (!event.data) {
        console.log('אין נתונים בעדכון, הפונקציה חוזרת.');
        return null;
    }
    
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // בדיקה ששדה הלייקים קיים בשני המצבים ושהוא מערך
    if (!beforeData.likes || !Array.isArray(beforeData.likes) || !afterData.likes || !Array.isArray(afterData.likes)) {
        console.log('נתוני לייקים חסרים או לא תקינים.');
        return null;
    }

    // בדיקה האם נוסף לייק
    if (afterData.likes.length <= beforeData.likes.length) {
        console.log('לא נוסף לייק חדש. הפונקציה חוזרת.');
        return null;
    }

    const likerId = afterData.likes[afterData.likes.length - 1];
    const { profileOwnerId, imageIndex } = afterData;

    // ודא שהליקר הוא לא בעל הפרופיל
    if (likerId === profileOwnerId) {
        console.log('הליקר הוא בעל הפרופיל. לא נשלחת התראה.');
        return null;
    }

    try {
        console.log(`לייק חדש התקבל מתמונה של המשתמש: ${profileOwnerId}`);
        console.log(`המשתמש שעשה לייק: ${likerId}`);

        // שליפת נתוני בעל הפרופיל (כולל טוקן הפוש שלו)
        const ownerDoc = await admin.firestore().collection('users').doc(profileOwnerId).get();
        const ownerData = ownerDoc.data();

        if (ownerData && ownerData.expoPushTokens && ownerData.expoPushTokens.length > 0) {
            console.log(`נמצאו טוקנים עבור בעל הפרופיל: ${profileOwnerId}`);
            
            // שליפת שם המשתמש של הליקר
            const likerDoc = await admin.firestore().collection('users').doc(likerId).get();
            const likerData = likerDoc.data();
            const likerUsername = likerData?.username || 'משתמש לא ידוע';

            // שליחת התראה לכל טוקן של בעל הפרופיל
            for (const pushToken of ownerData.expoPushTokens) {
                
                
                // שימוש בפונקציית העזר
                await sendPushNotification(
                    pushToken,
                    'קיבלת לייק חדש!',
                    `${likerUsername} אהב את התמונה שלך`,
                    {
                        type: 'image_like',
                        profileOwnerId,
                        imageIndex,
                        likerId,
                    }
                );
            }
        } else {
            console.log(`אין נתוני משתמש או טוקנים עבור בעל הפרופיל: ${profileOwnerId}`);
        }

        console.log('--- סיום תהליך שליחת התראת לייק ---');
        return null;
    } catch (error) {
        console.error('שגיאה כללית בפונקציית לייק על תמונה:', error);
        return null;
    }
});

/**
 * פונקציה זו נשלחת כאשר נוצר מסמך חדש ב-event_requests.
 * היא שולחת התראת פוש למנהל האירוע שהתקבלה בקשת הצטרפות.
 */
exports.sendNotificationOnEventRequest = onDocumentCreated('event_requests/{requestId}', async (event) => {
    console.log('--- התחלת תהליך שליחת התראת בקשת אירוע ---');
    
    const snapshot = event.data;
    if (!snapshot) {
        console.log('אין snapshot, הפונקציה חוזרת.');
        return null;
    }

    const requestData = snapshot.data();
    const { sender_uid, sender_username, event_title, receiver_uid } = requestData;

    // בדיקה אם הנתונים החיוניים קיימים
    if (!sender_uid || !receiver_uid) {
        console.log('חסרים נתונים חיוניים (sender_uid או receiver_uid). הפונקציה חוזרת.');
        return null;
    }

    try {
        // שליפת נתוני מנהל האירוע (כולל טוקני הפוש שלו)
        const receiverDoc = await admin.firestore().collection('users').doc(receiver_uid).get();
        const receiverData = receiverDoc.data();

        if (receiverData && receiverData.expoPushTokens && receiverData.expoPushTokens.length > 0) {
            console.log(`נמצאו טוקנים עבור מנהל האירוע: ${receiver_uid}`);
            for (const pushToken of receiverData.expoPushTokens) {
                // קביעת כותרת וגוף ההתראה
                const title = "בקשת הצטרפות לאירוע";
                const body = `${sender_username} מבקש/ת להצטרף לאירוע: ${event_title}`;
                const notificationData = {
                    senderId: sender_uid,
                    eventId: requestData.event_id,
                    requestId: event.params.requestId,
                };
                
                await sendPushNotification(pushToken, title, body, notificationData);
            }
        } else {
            console.log(`אין נתוני משתמש או טוקנים עבור מנהל האירוע: ${receiver_uid}`);
        }

        console.log('--- סיום תהליך שליחת התראת בקשת אירוע ---');
        return null;
    } catch (error) {
        console.error('שגיאה כללית בפונקציית בקשת אירוע:', error);
        return null;
    }
});

/**
 * פונקציה זו מופעלת כאשר מסמך ב-event_requests מתעדכן.
 * היא שולחת התראה למשתמש כאשר בקשתו אושרה או נדחתה.
 */
exports.sendNotificationOnRequestUpdate = onDocumentUpdated('event_requests/{requestId}', async (event) => {
    console.log('--- התחלת תהליך שליחת התראת עדכון בקשת אירוע ---');
    
    if (!event.data) {
        console.log('אין נתונים בעדכון, הפונקציה חוזרת.');
        return null;
    }
    
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // בדיקה אם הסטטוס השתנה
    if (beforeData.status === afterData.status) {
        console.log('סטטוס הבקשה לא השתנה. הפונקציה חוזרת.');
        return null;
    }

    const { sender_uid, event_title, status } = afterData;

    try {
        // שליפת נתוני המשתמש ששלח את הבקשה
        const senderDoc = await admin.firestore().collection('users').doc(sender_uid).get();
        const senderData = senderDoc.data();

        if (senderData && senderData.expoPushTokens && senderData.expoPushTokens.length > 0) {
            console.log(`נמצאו טוקנים עבור שולח הבקשה: ${sender_uid}`);
            
            let title = "";
            let body = "";

            if (status === 'accepted') {
                title = "בקשתך אושרה!";
                body = `הבקשה שלך להצטרף לאירוע "${event_title}" אושרה.`;
            } else if (status === 'declined') {
                title = "בקשתך נדחתה";
                body = `הבקשה שלך להצטרף לאירוע "${event_title}" נדחתה.`;
            } else {
                console.log('סטטוס לא מוכר. הפונקציה חוזרת.');
                return null;
            }

            for (const pushToken of senderData.expoPushTokens) {
                const notificationData = {
                    status: status,
                    eventId: afterData.event_id,
                };

                await sendPushNotification(pushToken, title, body, notificationData);
            }
        } else {
            console.log(`אין נתוני משתמש או טוקנים עבור שולח הבקשה: ${sender_uid}`);
        }

        console.log('--- סיום תהליך שליחת התראת עדכון בקשת אירוע ---');
        return null;
    } catch (error) {
        console.error('שגיאה כללית בפונקציית עדכון בקשה:', error);
        return null;
    }
});

/**
 * פונקציה קיימת לשליחת התראות על הודעות חדשות בצ'אט.
 * עדכון: הבדיקה לוודא שהנמען לא נמצא בצ'אט הנוכחי.
 */
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

        const messagesToSend: any[] = [];
        
        // שליפת שם המשתמש של השולח
        const senderDoc = await admin.firestore().collection('users').doc(message.senderId).get();
        const senderData = senderDoc.data();
        const senderUsername = message.senderUsername || senderData?.username || 'משתמש לא ידוע';

        for (const recipientUid of recipientUids) {
            console.log(`מעבד התראות עבור נמען: ${recipientUid}`);
            const userDoc = await admin.firestore().collection('users').doc(recipientUid).get();
            const userData = userDoc.data();

            if (userData && userData.expoPushTokens && userData.expoPushTokens.length > 0 && userData.activeChatId !== chatId) {
                for (const pushToken of userData.expoPushTokens) {
                    console.log(`נמצא טוקן פוש: ${pushToken}`);
                    if (!Expo.isExpoPushToken(pushToken)) {
                        console.error(`Push token ${pushToken} is not a valid Expo push token`);
                        continue;
                    }

                    messagesToSend.push({
                        to: pushToken,
                        sound: 'default',
                        title: senderUsername,
                        body: message.text,
                        data: { from: message.senderId, to: recipientUid, chatType, chatId },
                    });
                    console.log('הודעה נוספה למערך לשליחה.');
                }
            } else {
                if (userData?.activeChatId === chatId) {
                    console.log(`התראה לא נשלחה לנמען ${recipientUid} כי הוא נמצא בצ'אט הנוכחי.`);
                } else {
                    console.log(`אין נתוני משתמש או טוקנים עבור נמען: ${recipientUid}`);
                }
            }
        }

        console.log(`סה"כ הודעות להכנה: ${messagesToSend.length}`);
        const chunks = expo.chunkPushNotifications(messagesToSend);
        
        for (const chunk of chunks) {
            try {
                console.log('שולח חבילת התראות ל-Expo...');
                await expo.sendPushNotificationsAsync(chunk);
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
