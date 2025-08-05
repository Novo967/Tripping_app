import { Ionicons } from '@expo/vector-icons';
import {
  getDownloadURL,
  getStorage,
  listAll,
  ref
} from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { app } from '../../firebaseConfig';

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

const storage = getStorage(app);

const UserMarker: React.FC<UserMarkerProps> = ({ user, currentUserUid, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const isCurrentUser = user.uid === currentUserUid;
  
  const fetchLatestImageUrl = async () => {
    if (!user.uid) {
      setImageUrl(null);
      return;
    }

    try {
      const folderRef = ref(storage, `profile_images/${user.uid}`);
      const result = await listAll(folderRef);

      if (result.items.length === 0) {
        setImageUrl(null);
        return;
      }

      const sortedItems = result.items.sort((a, b) => b.name.localeCompare(a.name));
      const latestFileRef = sortedItems[0];
      const url = await getDownloadURL(latestFileRef);
      setImageUrl(url);
    } catch (e) {
      console.warn(`Error fetching user image for ${user.uid}:`, e);
      setImageUrl(null);
    }
  };

  useEffect(() => {
    // Fetch the image URL only once when the component mounts
    fetchLatestImageUrl();
  }, [user.uid]);

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
