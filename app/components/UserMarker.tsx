import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react'; // Added useEffect back
import { Image, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

interface UserMarkerProps {
  user: {
    uid: string;
    latitude: number;
    longitude: number;
    profile_image?: string;
    username?: string;
  };
  onPress: (user: any) => void;
}

const UserMarker: React.FC<UserMarkerProps> = ({ user, onPress }) => {
  const [shouldTrackViewChanges, setShouldTrackViewChanges] = useState(true);

  // Use useEffect to handle cases where there's no profile image
  useEffect(() => {
    if (!user.profile_image) {
      // If no profile image, set tracksViewChanges to false after a short delay.
      // This allows the initial rendering of the default icon, then stops tracking.
      const timer = setTimeout(() => {
        setShouldTrackViewChanges(false);
      }, 100); // A very short delay should suffice for static icons

      return () => clearTimeout(timer); // Cleanup the timer
    }
    // If there IS a profile image, this useEffect does nothing,
    // and the Image's onLoadEnd/onError will manage shouldTrackViewChanges.
  }, [user.profile_image]); // Dependency on profile_image ensures this runs when relevant

  const handleImageLoadEnd = () => {
    // Only set to false if we are currently tracking changes
    if (shouldTrackViewChanges) {
      setShouldTrackViewChanges(false);
    }
  };

  const handleImageError = () => {
    console.warn(`Error loading image for user ${user.uid}`);
    // Even if there's an error, stop tracking changes to prevent flickering
    if (shouldTrackViewChanges) {
      setShouldTrackViewChanges(false);
    }
  };

  return (
    <Marker
      key={user.uid}
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={() => onPress(user)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={shouldTrackViewChanges}
    >
      {user.profile_image ? (
        <Image
          source={{ uri: user.profile_image }}
          style={styles.profileMarker}
          resizeMode="cover"
          onLoadEnd={handleImageLoadEnd}
          onError={handleImageError}
        />
      ) : (
        <View style={styles.defaultMarkerIcon}>
          <Ionicons name="person" size={24} color="#FF6F00" />
        </View>
      )}
    </Marker>
  );
};

const styles = StyleSheet.create({
  profileMarker: {
    width: 36,
    height: 36,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  defaultMarkerIcon: {
    width: 35,
    height: 35,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default React.memo(UserMarker);