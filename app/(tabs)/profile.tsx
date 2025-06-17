import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const SERVER_URL = 'https://tripping-app.onrender.com';
const { width } = Dimensions.get('window');
const GALLERY_IMAGE_SIZE = (width - 60) / 3; // 3 columns with padding

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
          if (data.bio) {
            setBio(data.bio);
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
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }

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

  const saveBio = async () => {
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

      setIsEditingBio(false);
      Alert.alert('הביוגרפיה נשמרה בהצלחה!');
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

  const renderGalleryItem = ({ item, index }: ListRenderItemInfo<string>) => (
    <TouchableOpacity style={styles.galleryItemContainer}>
      <Image source={{ uri: item }} style={styles.galleryImage} />
      <View style={styles.imageOverlay}>
        <Ionicons name="heart" size={16} color="white" />
        <Ionicons name="chatbubble" size={16} color="white" style={{ marginLeft: 8 }} />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Profile Picture Section */}
      <View style={styles.profileSection}>
        <View style={styles.profilePicContainer}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.profilePic} />
          ) : (
            <View style={[styles.profilePic, styles.placeholder]}>
              <Ionicons name="person" size={40} color="#999" />
            </View>
          )}
          <TouchableOpacity
            onPress={() => pickImage(true)}
            style={styles.editIcon}
          >
            <Ionicons name="camera" size={18} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{gallery.length}</Text>
            <Text style={styles.statLabel}>פוסטים</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>2.1K</Text>
            <Text style={styles.statLabel}>עוקבים</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>180</Text>
            <Text style={styles.statLabel}>עוקב</Text>
          </View>
        </View>
      </View>

      {/* Username as Title */}
      <View style={styles.usernameContainer}>
        <Text style={styles.username}>{username || 'Solo Traveler'}</Text>
        <Ionicons name="checkmark-circle" size={20} color="#FF6F00" style={{ marginLeft: 8 }} />
      </View>

      {/* Bio Section */}
      <View style={styles.bioContainer}>
        {isEditingBio ? (
          <View>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="ספר על עצמך, על החוויות שלך ועל היעדים הבאים..."
              multiline
              maxLength={150}
              textAlignVertical="top"
            />
            <View style={styles.bioActions}>
              <TouchableOpacity onPress={saveBio} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>שמור</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setIsEditingBio(false)} 
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditingBio(true)} style={styles.bioDisplay}>
            <Text style={styles.bioText}>
              {bio || 'לחץ כאן כדי להוסיף תיאור עליך...'}
            </Text>
            <Ionicons name="pencil" size={16} color="#666" style={styles.bioEditIcon} />
          </TouchableOpacity>
        )}
      </View>

      {/* Gallery Header */}
      <View style={styles.galleryHeader}>
        <View style={styles.galleryTabs}>
          <TouchableOpacity style={[styles.galleryTab, styles.activeTab]}>
            <Ionicons name="grid" size={24} color="#FF6F00" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryTab}>
            <Ionicons name="bookmark" size={24} color="#999" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => pickImage(false)}
          style={styles.addPhotoButton}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
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
        ListHeaderComponent={renderHeader}
        renderItem={renderGalleryItem}
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
  headerContainer: {
    backgroundColor: 'white',
    marginBottom: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profilePicContainer: {
    position: 'relative',
    marginRight: 30,
  },
  profilePic: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  editIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FF6F00',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#262626',
  },
  statLabel: {
    fontSize: 13,
    color: '#8e8e8e',
    marginTop: 2,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#262626',
  },
  bioContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bioDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 40,
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  bioTextFilled: {
    color: '#262626',
  },
  bioTextPlaceholder: {
    color: '#8e8e8e',
  },
  bioEditIcon: {
    marginLeft: 10,
    marginTop: 2,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#262626',
    minHeight: 80,
    backgroundColor: '#fafafa',
  },
  bioActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#8e8e8e',
    fontSize: 14,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#efefef',
  },
  galleryTabs: {
    flexDirection: 'row',
  },
  galleryTab: {
    padding: 8,
    marginRight: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6F00',
  },
  addPhotoButton: {
    backgroundColor: '#FF6F00',
    borderRadius: 20,
    padding: 8,
  },
  galleryItemContainer: {
    width: GALLERY_IMAGE_SIZE,
    height: GALLERY_IMAGE_SIZE,
    margin: 0.5,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    opacity: 0.8,
  },
});