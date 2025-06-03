import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import {
  doc,
  setDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const SERVER_URL = 'https://tripping-app.onrender.com';

export default function ProfileScreen() {
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // הפונקציה לתפיסת הגלריה מהשרת - מחוץ לכל פונקציה אחרת
  const fetchGallery = async (uid: string) => {
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
          console.log('משתמש לא מחובר');
          setLoading(false);
          return;
        }

        // שולח את פרטי המשתמש לשרת (עדכון)
        const userData = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
        };

        const updateRes = await fetch(`${SERVER_URL}/update-user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        if (!updateRes.ok) {
          console.error('עדכון המשתמש נכשל', await updateRes.text());
        } else {
          console.log('המשתמש עודכן בשרת בהצלחה');
        }

        // מקבל את תמונת הפרופיל מהשרת
        const profileRes = await fetch(`${SERVER_URL}/get-user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid }),
        });

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.profile_image) {
            setProfilePic(data.profile_image);
          }
          console.log("profile image: " + data.profile_image);
        } else {
          console.error('שגיאה בקבלת פרופיל:', await profileRes.text());
        }

        // 🟦 שליפת הגלריה מהשרת
        const galleryData = await fetchGallery(user.uid);
        setGallery(galleryData);
      } catch (error) {
        console.error('שגיאה בשליחת או קבלת נתוני המשתמש:', error);
      } finally {
        setLoading(false);
      }
    };

    syncUserToBackend();
  }, []);

  const uploadImageToServer = async (uri: string, isProfilePic = false) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }

    const formData = new FormData();
    formData.append('image', {
      uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('uid', user.uid);
    formData.append('type', isProfilePic ? 'profile' : 'gallery');

    try {
      const response = await fetch(`${SERVER_URL}/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        if (isProfilePic) {
          setProfilePic(null);
          setTimeout(() => {
            setProfilePic(result.url + `?v=${Date.now()}`);
          }, 100);
        } else {
          setGallery(prev => [...prev, result.url]);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה');
    }
  };

  const pickImage = async (isProfilePic = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        await uploadImageToServer(uri, isProfilePic);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'אירעה שגיאה בבחירת התמונה.');
      console.log(error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // שמירת הטקסטים בפרופיל בלבד
  const saveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('שגיאה', 'משתמש לא מחובר');
        return;
      }

      // שמירה בפיירבייס
      await setDoc(
        doc(db, 'users', user.uid),
        { bio },
        { merge: true }
      );

      // שליחה לשרת Flask שלך
      await fetch('https://tripping-app.onrender.com/update-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          bio: bio,
        }),
      });

      Alert.alert('הפרופיל נשמר בהצלחה!');
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את הפרופיל.');
      console.log(error);
    }
  };

 

  return (
    <View style={styles.container}>
      <FlatList
        data={gallery}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
        ListHeaderComponent={
          <>
            <View style={styles.profilePicContainer}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profilePic} />
              ) : (
                <View style={[styles.profilePic, styles.placeholder]}>
                  <Text style={{ color: '#999' }}>אין תמונת פרופיל</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => pickImage(true)}
                style={styles.editIcon}
              >
                <Ionicons name="pencil" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.galleryHeader}>
              <Text style={styles.galleryTitle}>הגלריה שלך</Text>
              <TouchableOpacity onPress={() => pickImage(false)} style={styles.plusButton}>
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.galleryImage} />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholder: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  plusButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#eaf4ff',
  },
  galleryImage: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
  },
});
