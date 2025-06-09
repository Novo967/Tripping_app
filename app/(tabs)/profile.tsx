import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    ListRenderItemInfo,
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
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
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
          console.log('משתמש לא מחובר');
          setLoading(false);
          return;
        }

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
    } as unknown as Blob); // לעיתים צריך להקפיד על טיפוס נכון

    formData.append('uid', user.uid);
    formData.append('type', isProfilePic ? 'profile' : 'gallery');

    try {
      const response = await fetch(`${SERVER_URL}/upload-image`, {
        method: 'POST',
        headers: {
          // לא מוסיפים כאן 'Content-Type': 'multipart/form-data' כי fetch מגדיר את זה אוטומטית עם boundary
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

      if (!result.canceled && result.assets.length > 0) {
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

  const saveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('שגיאה', 'משתמש לא מחובר');
        return;
      }

      await setDoc(doc(db, 'users', user.uid), { bio }, { merge: true });

      await fetch(`${SERVER_URL}/update-user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const renderGalleryItem = ({ item }: ListRenderItemInfo<string>) => (
    <Image source={{ uri: item }} style={styles.galleryImage} />
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        onPress={fadeOutAndLogout}
        style={styles.logoutButton}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={24} color="#FF6F00" />
      </TouchableOpacity>

      <FlatList
        data={gallery}
        keyExtractor={(_, index) => index.toString()}
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
              <TouchableOpacity
                onPress={() => pickImage(false)}
                style={styles.plusButton}
              >
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={renderGalleryItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
    padding: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  profilePicContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eee',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6F00',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  galleryTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  plusButton: {
    padding: 6,
  },
  galleryImage: {
    width: '31%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
  },
});
