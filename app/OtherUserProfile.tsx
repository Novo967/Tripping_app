// screens/OtherUserProfile.tsx

import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
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
        const res = await fetch(`https://tripping-app.onrender.com/get-other-user-profile?uid=${uid}`);
        const data = await res.json();

        setUsername(data.username);
        setProfileImage(data.profile_image_url);
        setGalleryImages(data.gallery_images || []);
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

      <Text style={styles.galleryTitle}>הגלריה של {username}</Text>
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
