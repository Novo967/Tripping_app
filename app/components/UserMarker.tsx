import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

interface UserMarkerProps {
  user: {
    uid: string;
    latitude: number;
    longitude: number;
    profile_image?: string;
    username?: string;
  };
  currentUserUid?: string; // UID של המשתמש הנוכחי
  onPress: (user: any) => void;
}

const UserMarker: React.FC<UserMarkerProps> = ({ user, currentUserUid, onPress }) => {
  const [shouldTrackViewChanges, setShouldTrackViewChanges] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // בדיקה אם זה המשתמש הנוכחי (לא רלוונטי יותר עבור רינדור המרקר שלו)
  const isCurrentUser = user.uid === currentUserUid;

  useEffect(() => {
    // אם אין תמונה, או אם זה המשתמש הנוכחי (שאינו מרונדר יותר על ידי מרקר זה)
    if (!user.profile_image) {
      const timer = setTimeout(() => {
        setShouldTrackViewChanges(false);
      }, 100);
      return () => clearTimeout(timer);
    } else { // This block handles users with profile images
      setIsImageLoading(true);
      setShouldTrackViewChanges(true); // עקוב אחר שינויים בתצוגה עד שהתמונה נטענת
    }
  }, [user.profile_image]);

  const handleImageLoadEnd = () => {
    setIsImageLoading(false);
    setShouldTrackViewChanges(false); // Stop tracking after image loads
  };

  const handleImageError = (e: any) => {
    console.warn(`Error loading image for user ${user.uid}:`, e.nativeEvent.error);
    setIsImageLoading(false);
    setShouldTrackViewChanges(false); // Stop tracking on error
  };

  // אם זה המשתמש הנוכחי, לא נרנדר לו מרקר
  if (isCurrentUser) {
    return null;
  }

  return (
    <Marker
      key={user.uid}
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={() => onPress(user)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={shouldTrackViewChanges}
    >
      {user.profile_image ? (
        <View style={styles.imageContainer}>
          {isImageLoading && (
            <ActivityIndicator size="small" color="#3A8DFF" style={StyleSheet.absoluteFillObject} />
          )}
          <Image
            source={{ uri: user.profile_image }}
            style={styles.profileMarker}
            resizeMode="cover"
            onLoadEnd={handleImageLoadEnd}
            onError={handleImageError}
          />
        </View>
      ) : (
        <View style={styles.defaultMarkerIcon}>
          <Ionicons name="person" size={24} color="#3A8DFF" />
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
  imageContainer: {
    width: 36, // Ensure container has dimensions to match profileMarker
    height: 36, //
    borderRadius: 25, // Match border radius of profileMarker
    overflow: 'hidden', // Clip content to border radius
    justifyContent: 'center',
    alignItems: 'center',
  },
  // סגנונות עבור העיגול הכחול של המשתמש הנוכחי - **הוסרו לחלוטין**
});

export default React.memo(UserMarker);