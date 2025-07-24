// profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  // SafeAreaView, // ❌ נסיר את זה כי נשתמש בזה של safe-area-context
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// ✅ ייבוא SafeAreaView ו-useSafeAreaInsets מ-react-native-safe-area-context
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { app, auth } from '../../firebaseConfig';

import Bio from '../ProfileServices/bio';
import EventRequestsHandler from '../ProfileServices/EventRequestsHandler';
import Gallery from '../ProfileServices/Gallery';
import ImageModal from '../ProfileServices/ImageModal';
import NotificationBell from '../ProfileServices/NoficationBell';
import ProfileImage from '../ProfileServices/ProfileImage';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width, height } = Dimensions.get('window');
const SERVER_URL = 'https://tripping-app.onrender.com';
const storage = getStorage(app);

// פונקציית עזר להעלאת תמונה ל-Firebase Storage
const uploadToFirebase = async (uri: string, path: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  const uploadTask = await uploadBytes(storageRef, blob);
  return getDownloadURL(uploadTask.ref);
};

// פונקציית עזר למחיקת תמונה מ-Firebase Storage
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
  const [showRequests, setShowRequests] = useState(false);

  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;
  const requestsPanelAnim = useRef(new Animated.Value(0)).current;

  // ✅ שימוש ב-useSafeAreaInsets כדי לקבל את הריפודים
  const insets = useSafeAreaInsets();

  const fetchGallery = async (uid: string): Promise<string[]> => {
    try {
      const res = await fetch(`${SERVER_URL}/get-gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      return data.gallery || [];
    } catch (error) {
      console.error('Error fetching gallery:', error);
      return [];
    }
  };

  const uploadImageToServer = async (uri: string, isProfilePic = false) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('שגיאה', 'יש להתחבר כדי להעלות תמונות.');
      return;
    }

    try {
      const pathSegment = isProfilePic ? 'profile_images' : 'gallery_images';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;
      const storagePath = `${pathSegment}/${user.uid}/${fileName}`;

      const firebaseImageUrl = await uploadToFirebase(uri, storagePath);

      const serverResponse = await fetch(`${SERVER_URL}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          image_url: firebaseImageUrl,
          type: isProfilePic ? 'profile' : 'gallery',
        }),
      });

      const result = await serverResponse.json();
      if (serverResponse.ok) {
        if (isProfilePic) {
          setProfilePic(firebaseImageUrl);
        } else {
          setGallery(prev => [...prev, firebaseImageUrl]);
        }
        // ✅ הוסר Alert.alert להודעת הצלחה
      } else {
        throw new Error(result.error || 'Upload to server failed');
      }
    } catch (err: any) {
      Alert.alert('שגיאה', `העלאת התמונה נכשלה: ${err.message}`);
      console.error('Upload process error:', err);
    }
  };

  const handleDeleteImagesFromGallery = async (deletedImageUrls: string[]) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('שגיאה', 'יש להתחבר כדי למחוק תמונות.');
      return;
    }

    try {
      for (const imageUrl of deletedImageUrls) {
        await deleteFromFirebase(imageUrl); // שימוש בפונקציית העזר

        const serverResponse = await fetch(`${SERVER_URL}/delete-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, image_url: imageUrl }),
        });

        if (!serverResponse.ok) {
          const errorText = await serverResponse.text();
          throw new Error(`Failed to delete URL from server: ${serverResponse.status} ${errorText}`);
        }
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

  const saveBio = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

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

  const init = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [profileRes, galleryData] = await Promise.all([
        fetch(`${SERVER_URL}/get-user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid }),
        }),
        fetchGallery(user.uid),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfilePic(data.profile_image || null);
        setUsername(data.username || '');
        if (data.bio) setBio(data.bio);
      }
      setGallery(galleryData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useFocusEffect(useCallback(() => {
    const fetchRequests = async () => {
      const user = auth.currentUser;
      if (!user) {
        setPendingRequests([]);
        return;
      }
      try {
        const res = await fetch(`${SERVER_URL}/get-pending-event-requests?receiver_uid=${user.uid}`);
        const data = await res.json();
        if (res.ok) {
          setPendingRequests(data.requests || []);
        } else {
          console.error('Error fetching pending requests:', data.error);
          setPendingRequests([]);
        }
      } catch (error) {
        console.error('Error fetching pending requests:', error);
        setPendingRequests([]);
      }
    };
    fetchRequests();
    init();
  }, [init]));

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
      // ✅ שימוש ב-SafeAreaView של safe-area-context
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* ✅ ה-StatusBar כאן יהיה קבוע לכל מסך הטעינה */}
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>טוען פרופיל...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    // ✅ שימוש ב-SafeAreaView של safe-area-context
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ✅ ה-StatusBar כאן יהיה קבוע לכל מסך הפרופיל */}
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* עוטפים את כל התוכן ב-Animated.View.
        חשוב לוודא שה-paddingTop שנוצר על ידי ה-SafeAreaView
        לא יגרום לקיצוץ של רכיבי ה-topNav או האנימציות.
        מכיוון ש-topNav כבר מקבל paddingBottom ו-paddingHorizontal,
        ונראה שה-settingsPanel וה-requestsPanelAnimated הם `position: 'absolute'`,
        ה-SafeAreaView אמור לדחוף את כל התוכן באופן אוטומטי.
      */}
      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
        <View style={styles.topNav}>
          <NotificationBell hasNotifications={pendingRequests.length > 0} onPress={toggleRequests} />
          <TouchableOpacity onPress={toggleSettings} style={styles.navButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* ✅ עדכון מיקום ה-top של ה-settingsPanel וה-requestsPanelAnimated
           כדי לקחת בחשבון את ה-SafeArea העליון (statusBar).
           הערך 20 כאן הוא דוגמה, ייתכן שתצטרך להתאים אותו.
           אפשר גם להשתמש ב-insets.top ישירות.
        */}
        <Animated.View style={[styles.settingsPanel, {
          backgroundColor: theme.colors.surface,
          transform: [{ translateY: settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] }) }],
          opacity: settingsAnim,
          right: 20,
          left: 'auto',
          top: insets.top + (Platform.OS === 'ios' ? 50 : 60), // ✅ התאמה ל-StatusBar והכפתורים למעלה
        }]}>
          <TouchableOpacity style={styles.settingsItem} onPress={() => { toggleTheme(); toggleSettings(); }}>
            <Ionicons name={theme.isDark ? 'sunny' : 'moon'} size={20} color={theme.colors.text} />
            <Text style={[styles.settingsText, { color: theme.colors.text }]}>
              {theme.isDark ? 'מצב בהיר' : 'מצב כהה'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => { toggleSettings(); fadeOutAndLogout(); }}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.settingsText, { color: '#FF3B30' }]}>התנתקות</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.requestsPanelAnimated, {
          transform: [{ translateY: requestsPanelAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] }) }],
          opacity: requestsPanelAnim,
          top: insets.top + (Platform.OS === 'ios' ? 50 : 60), // ✅ התאמה ל-StatusBar והכפתורים למעלה
        }]}>
          <EventRequestsHandler
            isVisible={showRequests}
            onClose={toggleRequests}
            pendingRequests={pendingRequests}
            setPendingRequests={setPendingRequests}
          />
        </Animated.View>

        <ProfileImage
          profilePic={profilePic}
          username={username}
          galleryLength={gallery.length}
          onChangeImage={(uri: string) => uploadImageToServer(uri, true)}
          onImagePress={openImageModal}
          gallery={gallery}
          onAddImage={(uri: string) => uploadImageToServer(uri, false)}
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
          gallery={gallery}
          onAddImage={(uri: string) => uploadImageToServer(uri, false)}
          onDeleteImages={handleDeleteImagesFromGallery}
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
  // ✅ עטיפה לתוכן הראשי בתוך ה-SafeAreaView, כדי לאפשר ל-Animated.View לטפל באטימות
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    // ✅ הסרת paddingTop כאן, ה-SafeAreaView מטפל בזה.
    // אם תרצה ריפוד נוסף *מתחת* לאזור הבטוח, תוכל להוסיף אותו.
    paddingBottom: 10,
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
    // top: 80, // ✅ יטופל באמצעות חישוב עם insets.top
    right: 20,
    left: 20,
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
    // top: 80, // ✅ יטופל באמצעות חישוב עם insets.top
    left: 20,
    right: 20,
    zIndex: 15,
    maxHeight: height * 0.5,
  },
  settingsItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsText: {
    fontSize: 16,
    marginRight: 12,
    textAlign: 'right',
  },
});