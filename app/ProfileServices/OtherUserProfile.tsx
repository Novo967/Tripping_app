import { Feather, Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { db } from '../../firebaseConfig';
import { LikeableImage } from '../components/LikeableImage';
import { RootStackParamList } from '../types';

type OtherUserProfileRouteProp = RouteProp<RootStackParamList, 'OtherUserProfile'>;

const { width, height } = Dimensions.get('window');
const PROFILE_IMAGE_SIZE = 120;
const GALLERY_MARGIN = 16;
const GALLERY_SPACING = 2;
const GALLERY_COLUMNS = 3;
const BOTTOM_BUTTON_HEIGHT = Platform.OS === 'ios' ? 100 : 80;

const galleryItemSize = (width - GALLERY_MARGIN * 2 - GALLERY_SPACING * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;

interface UserData {
  username: string;
  profileImage: string;
  galleryImages: string[];
  location?: {
    country: string;
    city: string;
  } | null;
  currentLocation?: {
    country: string;
    city: string;
  } | null;
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

  const [userData, setUserData] = useState<UserData>({
    username: '',
    profileImage: '',
    galleryImages: [],
  });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const modalFlatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        const res = await fetch(`https://tripping-app.onrender.com/get-other-user-profile?uid=${uid}`);
        const apiData = await res.json();

        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const firestoreData = userSnap.data();
          setUserData({
            username: firestoreData.username || '',
            profileImage: apiData.profile_image || '',
            galleryImages: apiData.gallery_images || [],
            location: firestoreData.location && firestoreData.location.city && firestoreData.location.country
              ? firestoreData.location
              : null,
            currentLocation: firestoreData.currentLocation && firestoreData.currentLocation.city && firestoreData.currentLocation.country
              ? firestoreData.currentLocation
              : null,
            bio: firestoreData.bio || '',
            favoriteDestinations: firestoreData.favoriteDestinations || [],
            travelStyle: firestoreData.travelStyle || '',
            joinDate: firestoreData.joinDate || '',
            isOnline: firestoreData.isOnline || false,
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
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
        otherUserImage: userData.profileImage
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
    setSelectedImageIndex(0);
  };

  const renderGalleryImage = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={[
        styles.galleryItem,
        { marginLeft: (index + 1) % GALLERY_COLUMNS === 0 ? 0 : GALLERY_SPACING }
      ]}
      onPress={() => openImageModal(index)}
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

  const renderModalImage = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.modalImageContainer}>
      <Image source={{ uri: item }} style={styles.modalImage} resizeMode="contain" />
      <View style={styles.imageCounter}>
        <Text style={styles.imageCounterText}>{index + 1} / {userData.galleryImages.length}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען פרופיל...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/home')}>
          <Feather name="arrow-right" size={24} color="#333" />
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
              <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.defaultProfileIcon}>
                <Ionicons name="person" size={60} color="#FF6F00" />
              </View>
            )}
            {userData.isOnline && <View style={styles.onlineBadge} />}
          </View>

          <Text style={styles.username}>{userData.username}</Text>
          
          {/* Location Info */}
          <View style={styles.locationContainer}>
            {userData.currentLocation?.city && userData.currentLocation?.country && (
              <View style={styles.currentLocationRow}>
                <Feather name="map-pin" size={16} color="#FF6F00" />
                <Text style={styles.currentLocationText}>
                  {userData.currentLocation.city}, {userData.currentLocation.country}
                </Text>
              </View>
            )}

            {userData.location?.city && userData.location?.country && (
              <View style={styles.homeLocationRow}>
                <Feather name="home" size={14} color="#999" />
                <Text style={styles.homeLocationText}>
                  מ-{userData.location.city}, {userData.location.country}
                </Text>
              </View>
            )}
          </View>

          {userData.joinDate && (
            <Text style={styles.joinDate}>{formatJoinDate(userData.joinDate)}</Text>
          )}
        </View>

        {/* Bio */}
        {userData.bio && (
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>{userData.bio}</Text>
          </View>
        )}

        {/* Travel Info */}
        {(userData.travelStyle || (userData.favoriteDestinations && userData.favoriteDestinations.length > 0)) && (
          <View style={styles.travelInfoContainer}>
            {userData.travelStyle && (
              <View style={styles.travelCard}>
                <Feather name="compass" size={18} color="#FF6F00" />
                <Text style={styles.travelCardText}>{userData.travelStyle}</Text>
              </View>
            )}
            
            {userData.favoriteDestinations && userData.favoriteDestinations.length > 0 && (
              <View style={styles.travelCard}>
                <Feather name="heart" size={18} color="#FF6F00" />
                <Text style={styles.travelCardText} numberOfLines={2}>
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
              data={userData.galleryImages.slice(0, 9).reverse()} // Reverse for RTL
              keyExtractor={(item, index) => index.toString()}
              numColumns={GALLERY_COLUMNS}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => renderGalleryImage({ 
                item, 
                index: userData.galleryImages.slice(0, 9).length - 1 - index // Adjust index for reversed array
              })}
              contentContainerStyle={styles.galleryContent}
              style={styles.galleryList}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Message Button */}
      <View style={styles.floatingButtonContainer}>
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
        <View style={styles.modalOverlay}>
          {Platform.OS === 'ios' ? (
            <BlurView style={styles.modalBlur} intensity={80} tint="dark" />
          ) : (
            <View style={styles.androidBlurFallback} />
          )}

          <View style={styles.modalContent}>
            <FlatList
              ref={modalFlatListRef}
              data={userData.galleryImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderModalImage}
              initialScrollIndex={selectedImageIndex}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(newIndex);
              }}
            />

            {/* Navigation arrows */}
            {userData.galleryImages.length > 1 && (
              <>
                {selectedImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonRight]}
                    onPress={() => {
                      const newIndex = selectedImageIndex - 1;
                      setSelectedImageIndex(newIndex);
                      modalFlatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                    }}
                  >
                    <Feather name="chevron-right" size={24} color="#fff" />
                  </TouchableOpacity>
                )}

                {selectedImageIndex < userData.galleryImages.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonLeft]}
                    onPress={() => {
                      const newIndex = selectedImageIndex + 1;
                      setSelectedImageIndex(newIndex);
                      modalFlatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                    }}
                  >
                    <Feather name="chevron-left" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OtherUserProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginLeft: 310,
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
    borderColor: '#FF6F00',
  },
  defaultProfileIcon: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: '#FFF3E0',
    borderWidth: 3,
    borderColor: '#FF6F00',
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
    borderColor: 'white',
  },
  username: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#FF6F00',
    marginLeft: 6,
    fontWeight: '600',
  },
  homeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeLocationText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 6,
  },
  joinDate: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  bioContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bioText: {
    fontSize: 15,
    color: '#333',
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
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: '#FF6F00',
  },
  travelCardText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  galleryContainer: {
    paddingHorizontal: GALLERY_MARGIN,
    marginBottom: 20,
  },
  galleryContent: {
    paddingTop: 0,
  },
  galleryList: {
    transform: [{ scaleX: -1 }], // Flip for RTL
  },
  galleryItem: {
    width: galleryItemSize,
    height: galleryItemSize,
    marginBottom: GALLERY_SPACING,
    position: 'relative',
    transform: [{ scaleX: -1 }], // Flip back individual items
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
  },
  messageButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6F00',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6F00',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  androidBlurFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImageContainer: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: '90%',
    height: '90%',
    borderRadius: 12,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    padding: 8,
  },
});