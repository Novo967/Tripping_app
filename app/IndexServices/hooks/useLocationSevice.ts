import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export const useLocationService = () => {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const fetchLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission to access location was denied');
      Alert.alert(
        'הרשאה נדחתה',
        'לא ניתנה הרשאה לגישה למיקום. ייתכן שהמפה לא תפעל כראוי.'
      );
      return null;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const location = { 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude 
      };
      setCurrentLocation(location);
      return location;
    } catch (error) {
      console.error('Error fetching current location:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את המיקום הנוכחי.');
      return null;
    }
  }, []);

  const updateLocation = useCallback((location: { latitude: number; longitude: number }) => {
    setCurrentLocation(location);
  }, []);

  return {
    currentLocation,
    fetchLocation,
    updateLocation,
    setCurrentLocation
  };
};