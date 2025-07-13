// profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';
import { auth } from '../../firebaseConfig';
import Bio from '../ProfileServices/bio';
import EventRequestsHandler from '../ProfileServices/EventRequestsHandler';
import Gallery from '../ProfileServices/Gallery';
import ImageModal from '../ProfileServices/ImageModal';
import NotificationBell from '../ProfileServices/NoficationBell';
import ProfileImage from '../ProfileServices/ProfileImage';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width, height } = Dimensions.get('window');
const SERVER_URL = 'https://tripping-app.onrender.com';

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

  // Function to fetch gallery images from the server
  // פונקציה לשליפת תמונות גלריה מהשרת
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

  // Function to upload images to the server (profile pic or gallery)
  // פונקציה להעלאת תמונות לשרת (תמונת פרופיל או גלריה)
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

  // Function to handle deletion of images from the gallery
  // פונקציה לטיפול במחיקת תמונות מהגלריה
  const handleDeleteImagesFromGallery = (deletedImageUrls: string[]) => {
    setGallery(prevGallery =>
      prevGallery.filter(imageUrl => !deletedImageUrls.includes(imageUrl))
    );
  };

  // Functions to manage image modal visibility
  // פונקציות לניהול נראות מודל התמונה
  const openImageModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  // Function to save user bio
  // פונקציה לשמירת ביוגרפיה של המשתמש
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

  // Initial data fetching on component mount or focus
  // שליפת נתונים ראשונית בעת טעינת הרכיב או מיקוד
  const init = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const profileRes = await fetch(`${SERVER_URL}/get-user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfilePic(data.profile_image || null);
        setUsername(data.username || '');
        if (data.bio) setBio(data.bio);
      }

      const galleryData = await fetchGallery(user.uid);
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
    // Re-fetch pending requests when screen is focused
    // שליפה מחדש של בקשות ממתינות כאשר המסך ממוקד
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

  // Animation for fading out and logging out
  // אנימציה לדעיכה והתנתקות
  const fadeOutAndLogout = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await auth.signOut();
        router.replace('/Authentication/login');
      } catch (error) {
        Alert.alert('שגיאה', 'לא הצלחנו להתנתק');
        fadeAnim.setValue(1);
      }
    });
  };

  // Toggle settings panel animation
  // החלפת מצב פאנל הגדרות
  const toggleSettings = () => {
    const toValue = showSettings ? 0 : 1;
    Animated.spring(settingsAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    setShowSettings(!showSettings);
    // Close requests panel if open
    // סגור פאנל בקשות אם פתוח
    if (showRequests) {
      toggleRequests();
    }
  };

  // Toggle requests panel animation
  // החלפת מצב פאנל בקשות
  const toggleRequests = () => {
    const toValue = showRequests ? 0 : 1;
    Animated.spring(requestsPanelAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    setShowRequests(!showRequests);
    // Close settings panel if open
    // סגור פאנל הגדרות אם פתוח
    if (showSettings) {
      toggleSettings();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>טוען פרופיל...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.topNav}>
          {/* Notification Bell */}
          {/* פעמון התראות */}
          <NotificationBell
            hasNotifications={pendingRequests.length > 0}
            onPress={toggleRequests}
          />
          {/* Settings Button */}
          {/* כפתור הגדרות */}
          <TouchableOpacity onPress={toggleSettings} style={styles.navButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Settings Panel */}
        {/* פאנל הגדרות */}
        <Animated.View style={[styles.settingsPanel, {
          backgroundColor: theme.colors.surface,
          transform: [{
            translateY: settingsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, 0],
            }),
          }],
          opacity: settingsAnim,
          right: 20,
          left: 'auto',
        }]}>
          <TouchableOpacity style={styles.settingsItem} onPress={() => {
            toggleTheme();
            toggleSettings();
          }}>
            <Ionicons name={theme.isDark ? 'sunny' : 'moon'} size={20} color={theme.colors.text} />
            <Text style={[styles.settingsText, { color: theme.colors.text }]}>
              {theme.isDark ? 'מצב בהיר' : 'מצב כהה'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={() => {
            toggleSettings();
            fadeOutAndLogout();
          }}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.settingsText, { color: '#FF3B30' }]}>
              התנתקות
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Requests Panel */}
        {/* פאנל בקשות */}
        <Animated.View style={[styles.requestsPanelAnimated, {
          transform: [{
            translateY: requestsPanelAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, 0],
            }),
          }],
          opacity: requestsPanelAnim,
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

        {/* Image Modal */}
        {/* מודל תמונה */}
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
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
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
    top: 80,
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
    top: 80,
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
