// app/IndexServices/MyLocationButton.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React from 'react';
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

interface MyLocationButtonProps {
  onLocationUpdate: (location: { latitude: number; longitude: number }) => void;
}

const MyLocationButton: React.FC<MyLocationButtonProps> = ({ onLocationUpdate }) => {
  
  /**
   * מטפל בלחיצה על כפתור המיקום
   */
  const handleLocationPress = async () => {
    try {
      // בדיקת הרשאות
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('הרשאה נדחתה', 'לא ניתנה הרשאה לגישה למיקום.');
        return;
      }

      // קבלת המיקום הנוכחי
      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 1
      });

      // העברת המיקום לקומפוננט האב
      onLocationUpdate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

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
        <Ionicons name="locate" size={24} color="#333" />
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
    borderRadius: 26,
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