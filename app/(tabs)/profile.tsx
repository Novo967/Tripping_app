// ProfileScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';


import Bio from '../ProfileServices/bio';
import Gallery from '../ProfileServices/Gallery';
import ProfileImage from '../ProfileServices/ProfileImage';

const SERVER_URL = 'https://tripping-app.onrender.com';

export default function ProfileScreen() {
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const navigation = useNavigation();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const fadeOutAndLogout = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await auth.signOut();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error) {
        Alert.alert('שגיאה', 'לא הצלחנו להתנתק');
        fadeAnim.setValue(1);
      }
    });
  };

  const fetchGallery = async (uid: string): Promise<string[]> => {
    try {
      const res = await axios.post(`${SERVER_URL}/get-gallery`, { uid });
      return res.data.gallery;
    } catch (error) {
      console.error('Error fetching gallery:', error);
      return [];
    }
  };

  useEffect(() => {
    const syncUserToBackend = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const userData = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
        };

        await fetch(`${SERVER_URL}/update-user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        const profileRes = await fetch(`${SERVER_URL}/get-user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid }),
        });

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfilePic(data.profile_image || null);
          setBio(data.bio || '');
        }

        const galleryData = await fetchGallery(user.uid);
        setGallery(galleryData);
      } catch (error) {
        console.error('שגיאה בשליחת או קבלת נתוני המשתמש:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsername = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || '');
        }
      }
    };

    syncUserToBackend();
    fetchUsername();
  }, []);

  const uploadImageToServer = async (uri: string, isProfilePic = false) => {
    const user = auth.currentUser;
    if (!user) return;

    const formData = new FormData();
    formData.append('image', {
      uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    formData.append('uid', user.uid);
    formData.append('type', isProfilePic ? 'profile' : 'gallery');

    try {
      const response = await fetch(`${SERVER_URL}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        if (isProfilePic) {
          setProfilePic(result.url + `?v=${Date.now()}`);
        } else {
          setGallery(prev => [...prev, result.url]);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה');
      console.error(err);
    }
  };

  const saveBio = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await setDoc(doc(db, 'users', user.uid), { bio }, { merge: true });

      await fetch(`${SERVER_URL}/update-user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, bio }),
      });

      setIsEditingBio(false);
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את הביוגרפיה.');
      console.log(error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FF6F00" />
      </View>
    );
  }
  const handleImagePicked = (uri: string) => {
    uploadImageToServer(uri, true); // או false אם זה לא תמונת פרופיל
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={fadeOutAndLogout} style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={24} color="#FF6F00" />
      </TouchableOpacity>

      <FlatList
        data={gallery}
        keyExtractor={(_, index) => index.toString()}
        numColumns={3}
        ListHeaderComponent={
          <>
            <ProfileImage 
              profilePic={profilePic}
              username={username}
              galleryLength={gallery.length}
              onChangeImage={(uri: string) => {
                uploadImageToServer(uri, true).catch(console.error);
              }} />
            
            <Bio
              bio={bio}
              isEditing={isEditingBio}
              onChange={setBio}
              onSave={saveBio}
              onEditToggle={() => setIsEditingBio(prev => !prev)}
            />
            <Gallery onAddImage={(uri: string) => {
              uploadImageToServer(uri, false).catch(console.error);
            }} />
          </>
        }
        renderItem={({ item }: ListRenderItemInfo<string>) => (
          <View style={styles.galleryItemContainer}>
            <Animated.Image source={{ uri: item }} style={styles.galleryImage} />
          </View>
        )}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flatListContent: {
    paddingTop: 60,
  },
  galleryItemContainer: {
    width: (Dimensions.get('window').width - 60) / 3,
    height: (Dimensions.get('window').width - 60) / 3,
    margin: 0.5,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
});
