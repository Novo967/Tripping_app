import * as ImagePicker from 'expo-image-picker';
import {
  arrayUnion,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig'; // שים לב: כאן לא משתמשים עוד ב-storage של Firebase

export default function ProfileScreen() {
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // טען פרופיל מ-Firestore (טקסטים בלבד)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!auth.currentUser) {
          console.log('No logged in user');
          setLoading(false);
          return;
        }
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBio(data.bio || '');
          setProfilePic(data.profilePic || null);
          setGallery(data.gallery || []);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // פונקציה שמעלה את התמונה לשרת Flask
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
      const response = await fetch('https://triping-6.onrender.com/upload-profile-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        if (isProfilePic) {
          setProfilePic(result.url);
          // נשמור ב-Firestore את הכתובת החדשה
          await updateDoc(doc(db, 'users', user.uid), { profilePic: result.url });
        } else {
          setGallery(prev => [...prev, result.url]);
          // נשמור ב-Firestore את הכתובת בגלריה (arrayUnion)
          await updateDoc(doc(db, 'users', user.uid), { gallery: arrayUnion(result.url) });
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה');
    }
  };

  // בוחר תמונה ומעלה לשרת
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

  // שמירת הטקסטים בפרופיל בלבד
  const saveProfile = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert('שגיאה', 'משתמש לא מחובר');
        return;
      }
      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        { bio },
        { merge: true }
      );
      Alert.alert('הפרופיל נשמר בהצלחה!');
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את הפרופיל.');
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

  return (
    <View style={styles.container}>
      <FlatList
        data={gallery}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>פרופיל משתמש</Text>

            <View style={styles.profilePicContainer}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profilePic} />
              ) : (
                <View style={[styles.profilePic, styles.placeholder]}>
                  <Text style={{ color: '#999' }}>אין תמונת פרופיל</Text>
                </View>
              )}
              <Button title="בחר תמונת פרופיל" onPress={() => pickImage(true)} />
            </View>

            <TextInput
              style={styles.bioInput}
              placeholder="כתוב משהו על עצמך..."
              multiline
              value={bio}
              onChangeText={setBio}
              textAlign="right"
            />

            <Button title="שמור פרופיל" onPress={saveProfile} />

            <Text style={styles.galleryTitle}>הגלריה שלך</Text>
            <Button title="הוסף תמונה לגלריה" onPress={() => pickImage(false)} />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  placeholder: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    minHeight: 60,
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
    textAlign: 'right',
  },
  galleryImage: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
  },
});
