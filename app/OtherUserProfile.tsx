// screens/OtherUserProfile.tsx

import { RouteProp, useRoute } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { db } from '../firebaseConfig';
import { RootStackParamList } from './types';

type OtherUserProfileRouteProp = RouteProp<RootStackParamList, 'OtherUserProfile'>;

const OtherUserProfile = () => {
  const route = useRoute<OtherUserProfileRouteProp>();
  const { uid } = route.params;

  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
  const fetchUserData = async () => {
    try {
      // קריאה מ-Flask לגלריה ותמונת פרופיל
      const res = await fetch(`https://tripping-app.onrender.com/get-other-user-profile?uid=${uid}`);
      const data = await res.json();

      setProfileImage(data.profile_image);
      setGalleryImages(data.gallery_images || []);

      // קריאה ל-Firestore בשביל username
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUsername(userData.username || '');
      } else {
        console.warn('No such user in Firestore!');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  fetchUserData();
}, [uid]);


  return (
    <View style={styles.container}>
      <Image source={{ uri: profileImage }} style={styles.profileImage} />
      <Text style={styles.username}>{username}</Text>

      
      <FlatList
        data={galleryImages}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.galleryImage} />
        )}
      />
    </View>
  );
};

export default OtherUserProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  galleryTitle: {
    fontSize: 18,
    marginVertical: 8,
  },
  galleryImage: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
  },
});
