import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { app, auth } from '../../firebaseConfig';

import Bio from '../ProfileServices/bio';
import EventRequestsHandler from '../ProfileServices/EventRequestsHandler';
import Gallery from '../ProfileServices/GalleryServices/Gallery';
import ImageModal from '../ProfileServices/ImageModal';
import NotificationBell from '../ProfileServices/NoficationBell';
import ProfileImage from '../ProfileServices/ProfileImage';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width, height } = Dimensions.get('window');

const storage = getStorage(app);
const db = getFirestore(app);

// Helper function to upload image to Firebase Storage
const uploadToFirebase = async (uri: string, path: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  const uploadTask = await uploadBytes(storageRef, blob);
  return getDownloadURL(uploadTask.ref);
};

// Helper function to delete image from Firebase Storage
const deleteFromFirebase = async (imageUrl: string) => {
  try {
    const storageRefToDelete = ref(storage, imageUrl);
    await deleteObject(storageRefToDelete);
    console.log("Image deleted from Firebase Storage:", imageUrl);
  } catch (firebaseErr: any) {
    console.warn(`Could not delete image from Firebase Storage (${imageUrl}):`, firebaseErr.message);
  }
};

export default function ProfileScreen() {
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);
  const [showRequests, setShowRequests] = useState(false);

  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;
  const requestsPanelAnim = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();

  const uploadImageToFirebase = async (uri: string, isProfilePic = false) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('שגיאה', 'יש להתחבר כדי להעלות תמונות.');
      return;
    }

    try {
      const pathSegment = isProfilePic ? 'profile_images' : 'gallery_images';
      const fileName = `${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;
      const storagePath = `${pathSegment}/${user.uid}/${fileName}`;

      const firebaseImageUrl = await uploadToFirebase(uri, storagePath);

      const userDocRef = doc(db, 'users', user.uid);

      if (isProfilePic) {
        // Deleting the previous profile picture if it exists
        if (profilePic) {
          try {
            await deleteFromFirebase(profilePic);
          } catch (deleteError) {
            console.warn('Failed to delete previous profile pic:', deleteError);
          }
        }
        await updateDoc(userDocRef, {
          profile_image: firebaseImageUrl,
        });
        setProfilePic(firebaseImageUrl);
        Alert.alert('הצלחה', 'תמונת הפרופיל עודכנה בהצלחה!');
      } else {
        // Adding the new image to the gallery in Firestore
        await updateDoc(userDocRef, {
          gallery: arrayUnion(firebaseImageUrl),
        });
        setGallery(prev => [...prev, firebaseImageUrl]);
        Alert.alert('הצלחה', 'התמונה עלתה לגלריה בהצלחה!');
      }
    } catch (err: any) {
      console.error('Upload process error:', err);
      Alert.alert('שגיאה', `העלאת התמונה נכשלה: ${err.message || 'שגיאה לא ידועה'}`);
    }
  };

  const handleDeleteImagesFromGallery = async (deletedImageUrls: string[]) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('שגיאה', 'יש להתחבר כדי למחוק תמונות.');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      for (const imageUrl of deletedImageUrls) {
        await deleteFromFirebase(imageUrl);
        await updateDoc(userDocRef, {
          gallery: arrayRemove(imageUrl),
        });
      }

      setGallery(prevGallery =>
        prevGallery.filter(imageUrl => !deletedImageUrls.includes(imageUrl))
      );
      Alert.alert('הצלחה', 'התמונות נמחקו בהצלחה!');
    } catch (err: any) {
      Alert.alert('שגיאה', `מחיקת התמונה נכשלה: ${err.message}`);
      console.error('Delete process error:', err);
    }
  };

  const openImageModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const saveBio = async (newBio: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        bio: newBio,
      });

      setBio(newBio);
      setIsEditingBio(false);
      Alert.alert('הצלחה', 'הביוגרפיה נשמרה בהצלחה!');
    } catch (error: any) {
      Alert.alert('שגיאה', `לא הצלחנו לשמור את הביוגרפיה: ${error.message}`);
      console.error('Save Bio Error:', error);
      throw error; // זורק את השגיאה חזרה לקומפוננטת הביו
    }
  };

  // פונקציה חדשה לפתיחת עריכת ביו מההגדרות
  const handleEditBioFromSettings = () => {
    setShowSettings(false); // סגירת ההגדרות
    setIsEditingBio(true); // פתיחת עריכת הביו
  };

  const init = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const profileDataFromFirestore = userDocSnap.data();
        setProfilePic(profileDataFromFirestore.profile_image || null);
        setUsername(profileDataFromFirestore.username || '');
        setBio(profileDataFromFirestore.bio || '');
        setGallery(profileDataFromFirestore.gallery || []);
      } else {
        console.warn("User document not found in Firestore for UID:", user.uid);
        // Create a basic document if one doesn't exist
        await updateDoc(userDocRef, {
          username: '',
          bio: '',
          profile_image: null,
          gallery: [],
        });
      }
    } catch (err) {
      console.error("Error during profile initialization:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Use onSnapshot to listen for real-time requests
  useFocusEffect(useCallback(() => {
  const user = auth.currentUser;
  if (!user) {
    setPendingRequests([]);
    return () => {};
  }

  const requestsQuery = query(
    collection(db, 'event_requests'), 
    where('receiver_uid', '==', user.uid),
    where('status', '==', 'pending')
  );
  
  const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    // Add a small delay to prevent flickering
    notificationTimeoutRef.current = setTimeout(() => {
      setPendingRequests(requests);
      notificationTimeoutRef.current = null;
    }, 100);
  }, (error) => {
    console.error('Error fetching pending requests from Firestore:', error);
    Alert.alert('שגיאה', 'שגיאה בקבלת בקשות לאירועים.');
  });

  return () => {
    unsubscribe();
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
  };
}, [])); 

  const fadeOutAndLogout = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(async () => {
      try {
        await auth.signOut();
        router.replace('/Authentication/login');
      } catch (error) {
        Alert.alert('שגיאה', 'לא הצלחנו להתנתק');
        fadeAnim.setValue(1);
      }
    });
  };

  const toggleSettings = () => {
    Animated.spring(settingsAnim, {
      toValue: showSettings ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    setShowSettings(prev => !prev);
    if (showRequests) toggleRequests();
  };

  const toggleRequests = () => {
    Animated.spring(requestsPanelAnim, {
      toValue: showRequests ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    setShowRequests(prev => !prev);
    if (showSettings) toggleSettings();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>טוען פרופיל...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={toggleSettings} style={styles.navButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <NotificationBell hasNotifications={pendingRequests.length > 0} onPress={toggleRequests} />
        </View>

        <Animated.View style={[styles.settingsPanel, {
          backgroundColor: theme.colors.surface,
          transform: [{ translateY: settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] }) }],
          opacity: settingsAnim,
          right: 20,
          left: 'auto',
          top: insets.top + (Platform.OS === 'ios' ? 50 : 60),
        }]}>
        {/* New line for editing bio */}
          <TouchableOpacity style={styles.settingsItem} onPress={() => {
            handleEditBioFromSettings();
            toggleSettings(); // Close settings panel
          }}>
          <Ionicons name="create-outline" size={20} color={theme.colors.text} />
          <Text style={[styles.settingsText, { color: theme.colors.text }]}>עריכת ביו</Text>
          </TouchableOpacity>
          {/* Link to the Terms of Service page */}
          <TouchableOpacity style={styles.settingsItem} onPress={() => {
            router.push('/ProfileServices/TermsOfServiceProfile');
            toggleSettings();
          }}>
          <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
          <Text style={[styles.settingsText, { color: theme.colors.text }]}>תנאי שימוש</Text>
          </TouchableOpacity>
          {/* Dark/Light mode toggle */}
          <TouchableOpacity style={styles.settingsItem} onPress={() => {
            toggleTheme();
            toggleSettings(); // Close settings panel
          }}>
          <Ionicons name={theme.isDark ? 'sunny' : 'moon'} size={20} color={theme.colors.text} />
          <Text style={[styles.settingsText, { color: theme.colors.text }]}>
            {theme.isDark ? 'מצב בהיר' : 'מצב כהה'}
          </Text>
          </TouchableOpacity>
          {/* Sign Out */}
          <TouchableOpacity style={styles.settingsItem} onPress={() => {
            toggleSettings();
            fadeOutAndLogout();
          }}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={[styles.settingsText, { color: '#FF3B30' }]}>התנתקות</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.requestsPanelAnimated, {
          transform: [{ translateY: requestsPanelAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] }) }],
          opacity: requestsPanelAnim,
          top: insets.top + (Platform.OS === 'ios' ? 50 : 60),
        }]}>
          <EventRequestsHandler
            isVisible={showRequests}
            onClose={toggleRequests}
            setPendingRequests={setPendingRequests}
          />
        </Animated.View>

        
        <ProfileImage
          profilePic={profilePic}
          username={username}
          galleryLength={gallery.length}
          onChangeImage={(uri: string) => uploadImageToFirebase(uri, true)}
          onImagePress={openImageModal}
          gallery={gallery}
          onAddImage={(uri: string) => uploadImageToFirebase(uri, false)}
          onDeleteImages={handleDeleteImagesFromGallery}
        />

        <Bio
          bio={bio}
          isEditing={isEditingBio}
          onChange={setBio}
          onSave={saveBio}
          onEditToggle={() => setIsEditingBio(prev => !prev)}
        />

        <Gallery
          onImagePress={openImageModal}
        />

        <ImageModal
          visible={modalVisible}
          selectedImage={selectedImage}
          onClose={closeImageModal}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  topNav: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  navButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  settingsPanel: {
    position: 'absolute',
    right: 20,
    left: 20,
    marginTop: -50,
    zIndex: 15,
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  requestsPanelAnimated: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 15,
    maxHeight: height * 0.5,
  },
  settingsItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsText: {
    fontSize: 16,
    marginRight: 12,
    textAlign: 'right',
  },
});