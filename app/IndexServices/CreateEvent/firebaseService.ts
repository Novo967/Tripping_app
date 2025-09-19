// app/IndexServices/CreateEvent/firebaseService.ts
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { app } from '../../../firebaseConfig';
import { EventData } from './types';

export class FirebaseService {
    private static db = getFirestore(app);
    private static auth = getAuth(app);

    static async createEvent(eventData: Omit<EventData, 'owner_uid' | 'username' | 'created_at' | 'approved_users'>): Promise<boolean> {
        const userId = this.auth.currentUser?.uid;
        const username = this.auth.currentUser?.displayName || 'משתמש';

        if (!userId) {
            Alert.alert('שגיאה', 'אין משתמש מחובר. אנא התחבר ונסה שוב.');
            return false;
        }

        try {
            const completeEventData: EventData = {
                ...eventData,
                owner_uid: userId,
                username: username,
                created_at: new Date().toISOString(),
                approved_users: [userId],
            };

            await addDoc(collection(this.db, 'pins'), completeEventData);

            await setDoc(doc(this.db, 'group_chats', eventData.event_title), {
                name: eventData.event_title,
                members: [userId],
                groupImage: eventData.eventImageUrl || null,
                createdAt: serverTimestamp(),
            });

            return true;
        } catch (error) {
            console.error('Firestore error:', error);
            Alert.alert(
                'שגיאה',
                'אירעה שגיאה ביצירת האירוע או בשמירה במסד הנתונים.'
            );
            return false;
        }
    }
}