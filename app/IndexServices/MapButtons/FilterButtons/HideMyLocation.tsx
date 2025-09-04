// ./FilterButtons/HideMyLocation.tsx
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { app } from '../../../../firebaseConfig';

const db = getFirestore(app);

export const useLocationVisibility = (
  userId?: string, 
  onVisibilityChange?: (isVisible: boolean) => void
) => {
  const [isLocationVisible, setIsLocationVisible] = useState(true);

  useEffect(() => {
    if (!userId) {
      console.log('No user ID, cannot listen to visibility changes.');
      return;
    }
    
    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      const data = docSnap.data();
      const isVisible = data?.isLocationVisible ?? true; // ברירת מחדל ל-true
      setIsLocationVisible(isVisible);
      if (onVisibilityChange) {
        onVisibilityChange(isVisible);
      }
      console.log(`Firestore visibility changed for user ${userId}:`, isVisible);
    });

    return () => unsubscribe();
  }, [userId, onVisibilityChange]);

  const toggleLocationVisibility = useCallback(() => {
    // הפונקציה הזו כעת ריקה כי הלוגיקה תטופל ב-HomeScreen
  }, []);

  return {
    isLocationVisible,
    toggleLocationVisibility,
  };
};