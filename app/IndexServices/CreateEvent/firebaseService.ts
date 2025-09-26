import { getAuth } from 'firebase/auth';
import { collection, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { app } from '../../../firebaseConfig';
import { EventData } from './types';

// הערה: נניח שה-interface EventData ב-./types עודכן לכלול event_id: string.

export class FirebaseService {
    private static db = getFirestore(app);
    private static auth = getAuth(app);

    static async createEvent(
        eventData: Omit<EventData, 'owner_uid' | 'username' | 'created_at' | 'approved_users' | 'event_id'>
    ): Promise<boolean> {
        const userId = this.auth.currentUser?.uid;
        const username = this.auth.currentUser?.displayName || 'משתמש';

        console.log(`[CreateEvent] Starting event creation for user: ${userId} (${username})`);
            
        if (!userId) {
            Alert.alert('שגיאה', 'אין משתמש מחובר. אנא התחבר ונסה שוב.');
            return false;
        }

        try {
            // 1. צור רפרנס חדש (reference) לפין כדי לקבל Document ID ייחודי מראש
            const pinRef = doc(collection(this.db, 'pins'));
            const eventId = pinRef.id;

            console.log(`[CreateEvent] Generated Pin/Chat ID: ${eventId}`);

            // 2. הכן את הנתונים המלאים של הפין כולל event_id
            const completeEventData = {
                ...eventData,
                owner_uid: userId,
                username: username,
                created_at: new Date().toISOString(),
                approved_users: [userId],
                event_id: eventId, // שומרים את ה-ID שנוצר גם בתוך התיעוד
            };

            // 3. שמור את הפין באמצעות setDoc והרפרנס שיצרנו (משתמש ב-eventId כ-Document ID)
            console.log('[CreateEvent] Attempting to save Pin data:', completeEventData);
            await setDoc(pinRef, completeEventData);
            console.log(`[CreateEvent] Pin saved successfully with ID: ${eventId}`);

            // 4. צור את צ'אט הקבוצה: השתמש ב-eventId שנוצר כ-Document ID של הצ'אט
            const groupChatData = {
                name: eventData.event_title, // השם נשאר ככותרת האירוע
                members: [userId],
                groupImage: eventData.eventImageUrl || null,
                createdAt: serverTimestamp(),
                chat_id: eventId, // שומרים את ה-ID גם בתוך תיעוד הצ'אט
            };

            console.log('[CreateEvent] Attempting to save Group Chat data:', groupChatData);
            await setDoc(doc(this.db, 'group_chats', eventData.event_title), groupChatData); // משתמשים ב-eventId כ-Document ID
            console.log(`[CreateEvent] Group Chat saved successfully with ID: ${eventId}`);

            return true;
        } catch (error) {
            console.error('[CreateEvent] FATAL Firestore error during event creation:', error);
            Alert.alert(
                'שגיאה',
                'אירעה שגיאה ביצירת האירוע או בשמירה במסד הנתונים. בדוק את הלוגים לקבלת פרטים נוספים.'
            );
            return false;
        }
    }
}
