import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

interface HideMyLocationProps {
  onLocationVisibilityChange?: (isVisible: boolean) => void;
  initialVisibility?: boolean;
}

const LOCATION_VISIBILITY_KEY = 'user_location_visibility';

export default function HideMyLocation({ 
  onLocationVisibilityChange = () => {}, 
  initialVisibility = true 
}: HideMyLocationProps) {
  const [isLocationVisible, setIsLocationVisible] = useState<boolean>(initialVisibility);

  // טעינת הגדרת המיקום מ-AsyncStorage בעת טעינת הרכיב
  useEffect(() => {
    loadLocationVisibility();
  }, []);

  const loadLocationVisibility = async () => {
    try {
      const savedVisibility = await AsyncStorage.getItem(LOCATION_VISIBILITY_KEY);
      if (savedVisibility !== null) {
        const visibility = JSON.parse(savedVisibility);
        setIsLocationVisible(visibility);
        onLocationVisibilityChange?.(visibility);
      }
    } catch (error) {
      console.error('Error loading location visibility:', error);
    }
  };

  const toggleLocationVisibility = async () => {
    try {
      const newVisibility = !isLocationVisible;
      setIsLocationVisible(newVisibility);
      
      // שמירת ההגדרה ב-AsyncStorage
      await AsyncStorage.setItem(LOCATION_VISIBILITY_KEY, JSON.stringify(newVisibility));
      
      // יידוע לרכיב האב על השינוי
      onLocationVisibilityChange?.(newVisibility);
      
      // כאן תוכל להוסיף קריאה לשרת לעדכון סטטוס המיקום במסד הנתונים
      await updateLocationVisibilityOnServer(newVisibility);
      
    } catch (error) {
      console.error('Error toggling location visibility:', error);
    }
  };

  // פונקציה לעדכון הגדרת המיקום בשרת
  const updateLocationVisibilityOnServer = async (isVisible: boolean) => {
    try {
      // כאן תוסיף את הקריאה ל-API שלך לעדכון הגדרת המיקום
      // לדוגמה:
      /*
      const response = await fetch('/api/user/location-visibility', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ isVisible }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update location visibility on server');
      }
      */
      
      console.log(`Location visibility updated to: ${isVisible ? 'visible' : 'hidden'}`);
    } catch (error) {
      console.error('Error updating location visibility on server:', error);
    }
  };

  // פונקציה לקבלת טקסט הכפתור הדינמי
  const getButtonText = (): string => {
    return isLocationVisible ? 'הסתר את המיקום' : 'הצג מיקום';
  };

  // פונקציה לקבלת שם האייקון הדינמי
  const getIconName = (): string => {
    return isLocationVisible ? 'eye-off-outline' : 'eye-outline';
  };

  return {
    isLocationVisible,
    toggleLocationVisibility,
    getButtonText,
    getIconName,
  };
}

// הוק מותאם אישית לשימוש קל יותר ברכיבים אחרים
export const useLocationVisibility = (
  onLocationVisibilityChange?: (isVisible: boolean) => void,
  initialVisibility?: boolean
) => {
  return HideMyLocation({ onLocationVisibilityChange, initialVisibility });
};