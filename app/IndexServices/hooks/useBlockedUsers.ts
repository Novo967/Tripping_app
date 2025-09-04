import { getAuth } from 'firebase/auth';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { app } from '../../../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth();

export const useBlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setBlockedUsers([]);
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setBlockedUsers(userData.blocked_users || []);
      } else {
        setBlockedUsers([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  return blockedUsers;
};