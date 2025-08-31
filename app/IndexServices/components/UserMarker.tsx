import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { db } from '../../../firebaseConfig';

interface UserMarkerProps {
  user: {
    uid: string;
    latitude: number;
    longitude: number;
    profile_image?: string;
    username?: string;
  };
  currentUserUid?: string;
  onPress: (user: any) => void;
}

const UserMarker: React.FC<UserMarkerProps> = ({ user, currentUserUid, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const isCurrentUser = user.uid === currentUserUid;

  // Function to get the profile image URL from Firestore
  const getProfileImageUrl = async (userId: string) => {
    if (!userId) {
      return null;
    }
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().profile_image) {
        return userDoc.data().profile_image;
      }
      return null;
    } catch (e) {
      console.warn(`Error fetching user image for ${userId}:`, e);
      return null;
    }
  };

  useEffect(() => {
    const fetchImage = async () => {
      // Use the profile_image URL if it's already provided in the user object
      if (user.profile_image) {
        setImageUrl(user.profile_image);
      } else {
        // Otherwise, fetch it from Firestore
        const fetchedUrl = await getProfileImageUrl(user.uid);
        setImageUrl(fetchedUrl);
      }
    };
    fetchImage();
  }, [user.uid, user.profile_image]);

  const renderMarkerContent = () => {
    // If an image URL exists, display the image
    if (imageUrl) {
      return (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.profileMarker}
            resizeMode="cover"
          />
        </View>
      );
    }
    // If no image URL, display a placeholder icon
    else {
      return (
        <View style={styles.defaultMarkerIcon}>
          <Ionicons name="person" size={24} color="#3A8DFF" />
        </View>
      );
    }
  };

  if (isCurrentUser) {
    return null;
  }

  return (
    <Marker
      key={user.uid}
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={() => onPress(user)}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {renderMarkerContent()}
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
    width: 36,
    height: 36,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(UserMarker);