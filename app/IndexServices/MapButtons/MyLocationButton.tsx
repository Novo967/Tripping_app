// app/IndexServices/MyLocationButton.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

interface MyLocationButtonProps {
  onLocationUpdate: (location: { latitude: number; longitude: number }) => void;
}

const MyLocationButton: React.FC<MyLocationButtonProps> = ({ onLocationUpdate }) => {
  const [lastLocation, setLastLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  /**
   * הפעלת מעקב ברקע לשמירת מיקום עדכני
   */
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setLastLocation(coords);
        }
      );
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  /**
   * ניסיון להביא מיקום עם טיפול בשגיאות
   */
  const fetchLocation = async (retry = true) => {
    try {
      setIsFetching(true);

      // בדיקת הרשאות
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('הרשאה חסרה', 'כדי להשתמש במיקום יש לאפשר הרשאות בהגדרות המכשיר.');
        return null;
      }

      // קודם ננסה מיקום אחרון שמור
      let location = await Location.getLastKnownPositionAsync();

      if (!location) {
        // ואם אין – נבקש מיקום חדש
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      return location;
    } catch (error: any) {
      console.warn("Error fetching location:", error);

      // טיפול מיוחד ב־kCLErrorDomain error 0
      if (retry && String(error).includes("kCLErrorDomain error 0")) {
        console.log("Retrying to fetch location...");
        await new Promise((res) => setTimeout(res, 2000));
        return await fetchLocation(false); // ניסיון נוסף אחד
      }

      Alert.alert(
        'שגיאה',
        'לא ניתן לקבל את המיקום הנוכחי. ודא שמיקום מופעל ונסה שוב.'
      );
      return null;
    } finally {
      setIsFetching(false);
    }
  };

  /**
   * לחיצה על כפתור המיקום
   */
  const handleLocationPress = async () => {
    if (lastLocation) {
      onLocationUpdate(lastLocation);
      return;
    }

    const location = await fetchLocation(true);

    if (location) {
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setLastLocation(coords);
      onLocationUpdate(coords);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isFetching && { opacity: 0.6 }]}
        onPress={handleLocationPress}
        activeOpacity={0.8}
        disabled={isFetching}
      >
        <Ionicons name="locate" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1000,
  },
  button: {
    backgroundColor: '#3A8DFF',
    borderRadius: 25,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
  },
});

export default MyLocationButton;
