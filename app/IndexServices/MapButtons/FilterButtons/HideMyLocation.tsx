// ./FilterButtons/HideMyLocation.tsx
import { useCallback, useEffect, useState } from 'react';

export const useLocationVisibility = (
  onVisibilityChange: (isVisible: boolean) => void,
  initialVisibility = true,
  userId?: string // הוספתי: userId אופציונלי כדי לשלוח ל-API אם צריך
) => {
  const [isLocationVisible, setIsLocationVisible] = useState(initialVisibility);

  useEffect(() => {
    onVisibilityChange(isLocationVisible);
  }, [isLocationVisible, onVisibilityChange]);

  const toggleLocationVisibility = useCallback(() => {
    setIsLocationVisible(prev => !prev);
  }, []);

  return {
    isLocationVisible,
    toggleLocationVisibility,
  };
};  