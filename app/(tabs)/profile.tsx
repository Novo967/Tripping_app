import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated,
  Dimensions,
  Image, Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import Bio from '../ProfileServices/bio';
import Gallery from '../ProfileServices/Gallery';
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
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [showSettings, setShowSettings] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;

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

  const handleDeleteImagesFromGallery = (deletedImageUrls: string[]) => {
    setGallery(prevGallery => 
      prevGallery.filter(imageUrl => !deletedImageUrls.includes(imageUrl))
    );
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

  const fetchPendingRequests = useCallback(async () => {
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
  }, []);

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      const response = await fetch(`${SERVER_URL}/update-event-request-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: action }),
      });
      const result = await response.json();
      if (response.ok) {
        Alert.alert('הצלחה', `הבקשה ${action === 'accepted' ? 'אושרה' : 'נדחתה'} בהצלחה.`);
        // הסר את הבקשה מהמצב המקומי
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        Alert.alert('שגיאה', result.error || `פעולת ה${action} נכשלה.`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      Alert.alert('שגיאה', `אירעה שגיאה בביצוע הפעולה.`);
    }
  };


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
      
      await fetchPendingRequests();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchPendingRequests]);


  useEffect(() => {
    init();
  }, [init]);

  useFocusEffect(useCallback(() => {
    fetchPendingRequests();
    init(); 
  }, [fetchPendingRequests, init]));


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

  const toggleSettings = () => {
    const toValue = showSettings ? 0 : 1;
    Animated.spring(settingsAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    setShowSettings(!showSettings);
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
          <TouchableOpacity onPress={toggleSettings} style={styles.navButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.settingsPanel, {
          backgroundColor: theme.colors.surface,
          transform: [{
            translateY: settingsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, 0],
            }),
          }],
          opacity: settingsAnim,
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

        {pendingRequests.length > 0 && (
          <View style={styles.requestsContainer}>
            <Text style={[styles.requestsTitle, { color: theme.colors.text }]}>בקשות לאירועים:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.requestsScrollView}>
              {pendingRequests.map((request) => (
                <View key={request.id} style={[styles.requestCard, { backgroundColor: theme.colors.card }]}>
                  <Image
                    source={{ uri: `https://placehold.co/50x50/FF6F00/FFFFFF?text=${request.sender_username.charAt(0)}` }}
                    style={styles.requestSenderImage}
                  />
                  <View style={styles.requestTextContent}>
                    <Text style={[styles.requestSenderName, { color: theme.colors.text }]}>
                      {request.sender_username}
                    </Text>
                    <Text style={[styles.requestEventTitle, { color: theme.colors.textSecondary }]}>
                      רוצה להצטרף ל: {request.event_title}
                    </Text>
                  </View>
                  <View style={styles.requestButtons}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleRequestAction(request.id, 'accepted')}
                    >
                      <Text style={styles.acceptButtonText}>אשר</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => handleRequestAction(request.id, 'declined')}
                    >
                      <Text style={styles.declineButtonText}>דחה</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeImageModal}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={closeImageModal}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={closeImageModal}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
              
              {selectedImage && (
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>

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
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
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
  profileHeader: {
    paddingVertical: 20,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  bioSection: {
    marginBottom: 8,
    paddingVertical: 16,
  },
  tabContainer: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  galleryContainer: {
    flex: 1,
    padding: 2,
  },
  galleryItem: {
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  addPhotoButton: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FF6F00',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addPhotoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },    
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 30,
    backgroundColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: width * 0.95,
    height: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  // סטיילים של בקשות אירועים
  requestsContainer: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 10,
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  requestsScrollView: {
    paddingHorizontal: 10,
  },
  requestCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: width * 0.9 - 20,
    minHeight: 80,
  },
  requestSenderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 15,
    borderWidth: 1,
    borderColor: '#FF6F00',
  },
  requestTextContent: {
    flex: 1,
    marginRight: 10,
    alignItems: 'flex-end',
  },
  requestSenderName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  requestEventTitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
    marginTop: 2,
  },
  requestButtons: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginLeft: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  declineButton: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  declineButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
