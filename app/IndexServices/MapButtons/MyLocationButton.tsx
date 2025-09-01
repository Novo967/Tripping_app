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
   * מטפל בלחיצה על כפתור המיקום
   */
  const handleLocationPress = async () => {
    try {
      // אם כבר יש מיקום מהמעקב – נקפוץ אליו מיד
      if (lastLocation) {
        onLocationUpdate(lastLocation);
        return;
      }

      // אחרת ננסה מיקום אחרון שמור
      let location = await Location.getLastKnownPositionAsync();

      if (!location) {
        // ואם אין – נבקש מיקום חדש
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      if (location) {
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setLastLocation(coords);
        onLocationUpdate(coords);
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert('שגיאה', 'לא ניתן לקבל את המיקום הנוכחי.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleLocationPress}
        activeOpacity={0.8}
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
    borderColor: '#E0E0E0',
  },
});

export default MyLocationButton;
