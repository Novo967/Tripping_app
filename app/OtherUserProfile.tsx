// screens/OtherUserProfile.tsx

import { Feather } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../firebaseConfig';
import { RootStackParamList } from './types';

type OtherUserProfileRouteProp = RouteProp<RootStackParamList, 'OtherUserProfile'>;

const OtherUserProfile = () => {
  const route = useRoute<OtherUserProfileRouteProp>();
  const { uid } = route.params;

  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`https://tripping-app.onrender.com/get-other-user-profile?uid=${uid}`);
        const data = await res.json();

        setProfileImage(data.profile_image);
        setGalleryImages(data.gallery_images || []);

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

  const handleSendMessage = () => {
    router.push({
      pathname: '/chatModal',
      params: { otherUserId: uid, otherUsername: username, otherUserImage: profileImage },
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/home')}>
        <Feather name="arrow-right" size={28} color="#FFA500" />
      </TouchableOpacity>

      <Image source={{ uri: profileImage }} style={styles.profileImage} />
      <Text style={styles.username}>{username}</Text>

      <FlatList
        data={galleryImages}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.galleryImage} />
        )}
      />

      {/* כפתור שלח הודעה */}
      <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
        <Text style={styles.messageButtonText}>שלח הודעה</Text>
      </TouchableOpacity>
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
  backButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: 8,
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
  galleryImage: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
  },
  messageButton: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: '#FFA500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
