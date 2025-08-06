// --- Imports ---
import { Feather, Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { doc, DocumentData, getDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, listAll, ref } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../app/ProfileServices/ThemeContext'; // Ensure this path is correct
import { db } from '../../firebaseConfig';
import { LikeableImage } from '../components/LikeableImage';
import { RootStackParamList } from '../types';

type OtherUserProfileRouteProp = RouteProp<RootStackParamList, 'OtherUserProfile'>;

const { width } = Dimensions.get('window');
const PROFILE_IMAGE_SIZE = 120;
const GALLERY_MARGIN = 24;
const GALLERY_SPACING = 12;
const GALLERY_COLUMNS = 3;
const BOTTOM_BUTTON_HEIGHT = Platform.OS === 'ios' ? 100 : 80;

const galleryItemSize = (width - GALLERY_MARGIN * 2 - GALLERY_SPACING * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;

// הגדרת הממשק עבור נתוני המשתמש
interface UserData {
  username: string;
  profileImage: string;
  galleryImages: string[];
  location?: { country: string; city: string; } | null;
  currentLocation?: { country: string; city: string; } | null;
  bio?: string;
  favoriteDestinations?: string[];
  travelStyle?: string;
  joinDate?: string;
  isOnline?: boolean;
}

const OtherUserProfile = () => {
  const route = useRoute<OtherUserProfileRouteProp>();
  const { uid } = route.params;
  const router = useRouter();

  // שימוש ב-useTheme כדי לקבל את ערכת הנושא הנוכחית
  const { theme } = useTheme();

  const [userData, setUserData] = useState<UserData>({
    username: '',
    profileImage: '',
    galleryImages: [],
  });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const modalFlatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const storage = getStorage();
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);

        let firestoreData: DocumentData | null = null;
        if (userSnap.exists()) {
          firestoreData = userSnap.data();
        } else {
          console.warn("User document not found in Firestore.");
          setLoading(false);
          return;
        }

        let profileImageUrl = '';
        try {
          const profileImageRef = ref(storage, `profile_images/${uid}`);
          const profileImageList = await listAll(profileImageRef);
          if (profileImageList.items.length > 0) {
            profileImageUrl = await getDownloadURL(profileImageList.items[0]);
          }
        } catch (error) {
          console.warn("Profile image not found in Firebase Storage:", error);
        }

        let galleryImageUrls = [];
        try {
          const galleryRef = ref(storage, `gallery_images/${uid}`);
          const galleryList = await listAll(galleryRef);
          const urlPromises = galleryList.items.map((item) => getDownloadURL(item));
          galleryImageUrls = await Promise.all(urlPromises);
        } catch (error) {
          console.warn("Gallery images not found in Firebase Storage:", error);
        }

        setUserData({
          username: firestoreData?.username || '',
          profileImage: profileImageUrl,
          galleryImages: galleryImageUrls,
          location: firestoreData?.location && firestoreData?.location.city && firestoreData?.location.country
            ? firestoreData.location
            : null,
          currentLocation: firestoreData?.currentLocation && firestoreData?.currentLocation.city && firestoreData?.currentLocation.country
            ? firestoreData.currentLocation
            : null,
          bio: firestoreData?.bio || '',
          favoriteDestinations: firestoreData?.favoriteDestinations || [],
          travelStyle: firestoreData?.travelStyle || '',
          joinDate: firestoreData?.joinDate || '',
          isOnline: firestoreData?.isOnline || false,
        });
      } catch (error) {
        console.error('An error occurred during data fetching:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [uid]);

  const handleSendMessage = () => {
    router.push({
      pathname: '/Chats/chatModal',
      params: {
        otherUserId: uid,
        otherUsername: userData.username,
        otherUserImage: userData.profileImage,
      },
    });
  };

  const formatJoinDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `הצטרף ${date.getFullYear()}`;
  };

  const openImageModal = (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImageIndex(null);
  };

  const renderGalleryImage = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={[
        styles.galleryItem,
        {
          marginLeft: (index + 1) % GALLERY_COLUMNS === 0 ? 0 : GALLERY_SPACING,
          marginBottom: GALLERY_SPACING,
        },
      ]}
      onPress={() => openImageModal(userData.galleryImages.slice(0, 9).length - 1 - index)}
    >
      <LikeableImage
        imageUri={item}
        imageIndex={index}
        profileOwnerId={uid}
        style={styles.galleryImage}
        showLikeButton={true}
      />
      {index === 8 && userData.galleryImages.length > 9 && (
        <View style={styles.moreImagesOverlay}>
          <Text style={styles.moreImagesText}>+{userData.galleryImages.length - 9}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const statusBarStyle = theme.isDark ? 'light-content' : 'dark-content';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>טוען פרופיל...</Text>
      </View>
    );
  }

  if (!userData.username) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>הפרופיל לא נמצא או אין לו נתונים זמינים.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        {userData.isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: theme.isDark ? '#4CAF5020' : '#F0F8F0' }]}>
            <View style={styles.onlineDot} />
            <Text style={[styles.onlineText, { color: '#4CAF50' }]}>פעיל עכשיו</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.isDark ? theme.colors.card : '#f8f9fa' }]} onPress={() => router.push('/(tabs)/home')}>
          <Feather name="arrow-right" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_BUTTON_HEIGHT + 20 }]}
      >
        {/* Profile Section - Centered */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {userData.profileImage ? (
              <Image source={{ uri: userData.profileImage }} style={[styles.profileImage, { borderColor: theme.colors.primary }]} />
            ) : (
              <View style={[styles.defaultProfileIcon, { backgroundColor: theme.isDark ? theme.colors.card : '#FFF3E0', borderColor: theme.colors.primary }]}>
                <Ionicons name="person" size={60} color={theme.colors.primary} />
              </View>
            )}
            {userData.isOnline && <View style={[styles.onlineBadge, { borderColor: theme.colors.background }]} />}
          </View>

          <Text style={[styles.username, { color: theme.colors.text }]}>{userData.username}</Text>

          {/* Location Info */}
          <View style={styles.locationContainer}>
            {userData.currentLocation?.city && userData.currentLocation?.country && (
              <View style={styles.currentLocationRow}>
                <Feather name="map-pin" size={16} color={theme.colors.primary} />
                <Text style={[styles.currentLocationText, { color: theme.colors.primary }]}>
                  {userData.currentLocation.city}, {userData.currentLocation.country}
                </Text>
              </View>
            )}

            {userData.location?.city && userData.location?.country && (
              <View style={styles.homeLocationRow}>
                <Feather name="home" size={14} color={theme.colors.text} />
                <Text style={[styles.homeLocationText, { color: theme.colors.text }]}>
                  מ-{userData.location.city}, {userData.location.country}
                </Text>
              </View>
            )}
          </View>

          {userData.joinDate && (
            <Text style={[styles.joinDate, { color: theme.colors.text }]}>{formatJoinDate(userData.joinDate)}</Text>
          )}
        </View>

        {/* Bio */}
        {userData.bio && (
          <View style={styles.bioContainer}>
            <Text style={[styles.bioText, { color: theme.colors.text }]}>{userData.bio}</Text>
          </View>
        )}

        {/* Travel Info */}
        {(userData.travelStyle || (userData.favoriteDestinations && userData.favoriteDestinations.length > 0)) && (
          <View style={styles.travelInfoContainer}>
            {userData.travelStyle && (
              <View style={[styles.travelCard, { backgroundColor: theme.isDark ? '#3D4D5C' : '#FFF8F0', borderRightColor: theme.colors.primary }]}>
                <Feather name="compass" size={18} color={theme.colors.primary} />
                <Text style={[styles.travelCardText, { color: theme.colors.text }]}>{userData.travelStyle}</Text>
              </View>
            )}

            {userData.favoriteDestinations && userData.favoriteDestinations.length > 0 && (
              <View style={[styles.travelCard, { backgroundColor: theme.isDark ? '#3D4D5C' : '#FFF8F0', borderRightColor: theme.colors.primary }]}>
                <Feather name="heart" size={18} color={theme.colors.primary} />
                <Text style={[styles.travelCardText, { color: theme.colors.text }]} numberOfLines={2}>
                  {userData.favoriteDestinations.join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Gallery with RTL support */}
        {userData.galleryImages.length > 0 && (
          <View style={styles.galleryContainer}>
            <FlatList
              data={userData.galleryImages.slice(0, 9).reverse()}
              keyExtractor={(item, index) => index.toString()}
              numColumns={GALLERY_COLUMNS}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => renderGalleryImage({
                item,
                index: userData.galleryImages.slice(0, 9).length - 1 - index,
              })}
              contentContainerStyle={styles.galleryContent}
              style={styles.galleryList}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Message Button */}
      <View style={[styles.floatingButtonContainer, { backgroundColor: theme.isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
        <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
          <Feather name="message-circle" size={20} color="white" />
          <Text style={styles.messageButtonText}>שלח הודעה</Text>
        </TouchableOpacity>
      </View>

      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)' }]}
          onPress={closeImageModal}
        >
          {selectedImageIndex !== null && (
            <Image
              source={{ uri: userData.galleryImages[selectedImageIndex] }}
              style={styles.expandedImage}
              resizeMode="contain"
            />
          )}
          <View style={[styles.imageCounter, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.5)' }]}>
            <Text style={styles.imageCounterText}>{selectedImageIndex + 1} / {userData.galleryImages.length}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default OtherUserProfile;

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
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 310,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    borderWidth: 3,
  },
  defaultProfileIcon: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    borderWidth: 4,
  },
  username: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  currentLocationText: {
    fontSize: 16,
    marginLeft: 6,
    fontWeight: '600',
  },
  homeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeLocationText: {
    fontSize: 14,
    marginLeft: 6,
  },
  joinDate: {
    fontSize: 13,
    textAlign: 'center',
  },
  bioContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  travelInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  travelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderRightWidth: 3,
  },
  travelCardText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  galleryContainer: {
    paddingHorizontal: GALLERY_MARGIN,
    marginBottom: 32,
  },
  galleryContent: {
    paddingTop: 0,
  },
  galleryList: {
    transform: [{ scaleX: -1 }],
  },
  galleryItem: {
    width: galleryItemSize,
    height: galleryItemSize,
    position: 'relative',
    transform: [{ scaleX: -1 }],
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 48,
    paddingTop: 16,
  },
  messageButton: {
    flexDirection: 'row',
    backgroundColor: '#3A8DFF',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3A8DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  messageButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: {
    width: '90%',
    height: '90%',
    borderRadius: 10,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
});