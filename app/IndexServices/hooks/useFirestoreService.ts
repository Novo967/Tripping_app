import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { app } from '../../../firebaseConfig';

export interface SelectedEventType {
  id: string;
  latitude: number;
  longitude: number;
  event_date: string;
  username: string;
  event_title: string;
  event_type: string;
  description?: string;
  location?: string;
  owner_uid: string;
  approved_users?: string[];
}

export interface SelectedUserType {
  uid: string;
  username: string;
  latitude: number;
  longitude: number;
  profile_image?: string;
  isLocationVisible?: boolean; // הוספת שדה חדש
}

const db = getFirestore(app);

export const useFirestoreService = () => {
  const [users, setUsers] = useState<SelectedUserType[]>([]);
  const [events, setEvents] = useState<SelectedEventType[]>([]);
  const [currentUserUsername, setCurrentUserUsername] = useState('');
  
  const auth = getAuth();
  const user = auth.currentUser;

  const deletePin = useCallback(async (pinId: string) => {
    try {
      const pinDocRef = doc(db, 'pins', pinId);
      await deleteDoc(pinDocRef);
      console.log(`Pin ${pinId} deleted successfully from Firestore.`);
    } catch (error) {
      console.error(`Error deleting pin ${pinId} from Firestore:`, error);
      Alert.alert('שגיאה', 'אירעה שגיאה במחיקת האירוע.');
    }
  }, []);

  const fetchCurrentUserUsername = useCallback(async () => {
    if (!user) {
      setCurrentUserUsername('');
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData && userData.username) {
          setCurrentUserUsername(userData.username);
        } else {
          console.warn('Current user username not found in Firestore.');
          setCurrentUserUsername('');
        }
      } else {
        console.warn('Current user document not found in Firestore.');
        setCurrentUserUsername('');
      }
    } catch (error) {
      console.error('Error fetching current user username from Firestore:', error);
      setCurrentUserUsername('');
    }
  }, [user]);

  const fetchSingleEvent = useCallback(async (pinId: string): Promise<SelectedEventType | null> => {
    try {
      const pinDocRef = doc(db, 'pins', pinId);
      const pinDocSnap = await getDoc(pinDocRef);

      if (pinDocSnap.exists()) {
        const pinData = pinDocSnap.data() as Omit<SelectedEventType, 'id'>;
        return {
          id: pinId,
          latitude: pinData.latitude,
          longitude: pinData.longitude,
          event_date: pinData.event_date,
          username: pinData.username,
          event_title: pinData.event_title,
          event_type: pinData.event_type,
          description: pinData.description,
          location: pinData.location,
          owner_uid: pinData.owner_uid,
          approved_users: pinData.approved_users || [],
        };
      } else {
        console.warn('Pin document not found in Firestore.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching single pin from Firestore:', error);
      return null;
    }
  }, []);
  
  const toggleUserLocationVisibility = useCallback(async (uid: string, isVisible: boolean) => {
    if (!uid) {
      console.error("User ID is not available.");
      return;
    }
    const userDocRef = doc(db, 'users', uid);
    try {
      await updateDoc(userDocRef, {
        isLocationVisible: isVisible,
      });
      console.log(`User location visibility updated to ${isVisible} for user ${uid}`);
    } catch (error) {
      console.error("Error updating user location visibility:", error);
    }
  }, []);

  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
      const usersData: SelectedUserType[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.latitude != null && data.longitude != null) {
          usersData.push({
            uid: doc.id,
            username: data.username,
            latitude: data.latitude,
            longitude: data.longitude,
            profile_image: data.profile_image || null,
            isLocationVisible: data.isLocationVisible ?? true, // קריאת שדה הנראות
          });
        }
      });
      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users from Firestore:", error);
      Alert.alert('שגיאה', 'לא ניתן לטעון משתמשים.');
    });

    const pinsCollection = collection(db, 'pins');
    const unsubscribePins = onSnapshot(pinsCollection, (snapshot) => {
      const pins: SelectedEventType[] = [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      snapshot.forEach((doc) => {
        const pinData = doc.data() as Omit<SelectedEventType, 'id'>;
        const pinId = doc.id;
        const eventDate = new Date(pinData.event_date);

        if (todayStart.getTime() > eventDate.getTime()) {
          deleteDoc(doc.ref)
            .then(() => console.log(`Event ${pinId} has expired and was deleted.`))
            .catch(error => console.error(`Error deleting expired pin ${pinId}:`, error));
        } else {
          pins.push({
            id: pinId,
            latitude: pinData.latitude,
            longitude: pinData.longitude,
            event_date: pinData.event_date,
            username: pinData.username,
            event_title: pinData.event_title,
            event_type: pinData.event_type,
            description: pinData.description,
            location: pinData.location,
            owner_uid: pinData.owner_uid,
            approved_users: pinData.approved_users || [],
          });
        }
      });
      setEvents(pins);
    }, (error) => {
      console.error('Error fetching pins from Firestore:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון אירועים.');
    });

    return () => {
      unsubscribeUsers();
      unsubscribePins();
    };
  }, []);

  return {
    users,
    events,
    currentUserUsername,
    deletePin,
    fetchCurrentUserUsername,
    fetchSingleEvent,
    user,
    toggleUserLocationVisibility // החזרת הפונקציה החדשה
  };
};