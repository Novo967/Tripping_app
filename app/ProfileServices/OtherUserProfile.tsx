// --- Imports ---
import { Feather, Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth'; // Added for like functionality
import {
  arrayRemove,
  arrayUnion,
  doc,
  DocumentData,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'; // Added for like functionality
import { getDownloadURL, getStorage, listAll, ref } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { db } from '../../firebaseConfig';
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

// הגדרת ממשק לנתוני לייקים
interface ImageLikesData {
  isLiked: boolean;
  count: number;
}

const OtherUserProfile = () => {
  const route = useRoute<OtherUserProfileRouteProp>();
  const { uid } = route.params;
  const router = useRouter();

  const { theme } = useTheme();

  const [userData, setUserData] = useState<UserData>({
    username: '',
    profileImage: '',
    galleryImages: [],
  });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // מצבי useState חדשים לניהול הלייקים
  const [imageLikes, setImageLikes] = useState<{ [key: string]: ImageLikesData }>({});
  const [likeLoading, setLikeLoading] = useState<{ [key: string]: boolean }>({});
  const likeScaleAnim = useRef<{ [key: string]: Animated.Value }>({});

  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

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

         let profileImageUrl = firestoreData?.profile_image || '';
        if (!profileImageUrl) {
          console.warn("Profile image not found in Firestore data. Using default.");
        }

        let galleryImageUrls: string[] = [];
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

        // קריאה לפונקציה חדשה ששולפת את נתוני הלייקים
        await fetchLikesForAllImages(galleryImageUrls);

      } catch (error) {
        console.error('An error occurred during data fetching:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [uid]);

  // פונקציה חדשה לשליפת נתוני לייקים עבור כל התמונות
  const fetchLikesForAllImages = async (imageUrls: string[]) => {
    const allLikesData: { [key: string]: ImageLikesData } = {};
    for (let i = 0; i < imageUrls.length; i++) {
      const imageDocRef = doc(db, 'imageLikes', `${uid}_${i}`);
      try {
        const imageDoc = await getDoc(imageDocRef);
        if (imageDoc.exists()) {
          const data = imageDoc.data();
          const likes = data.likes || [];
          const isLiked = currentUserId ? likes.includes(currentUserId) : false;
          allLikesData[`${uid}_${i}`] = { isLiked, count: likes.length };
        } else {
          allLikesData[`${uid}_${i}`] = { isLiked: false, count: 0 };
        }
      } catch (error) {
        console.error(`Error fetching like data for image ${i}:`, error);
        allLikesData[`${uid}_${i}`] = { isLiked: false, count: 0 };
      }
    }
    setImageLikes(allLikesData);
  };

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

  // פונקציה חדשה לניהול לייקים
  const handleLike = async (imageIndex: number, imageUri: string) => {
    if (!currentUserId) {
      Alert.alert('שגיאה', 'עליך להתחבר כדי לאהוב תמונות');
      return;
    }

    const key = `${uid}_${imageIndex}`;
    if (likeLoading[key]) return;

    setLikeLoading((prev) => ({ ...prev, [key]: true }));

    const currentLikes = imageLikes[key] || { isLiked: false, count: 0 };
    const newIsLiked = !currentLikes.isLiked;
    const newCount = newIsLiked ? currentLikes.count + 1 : currentLikes.count - 1;

    setImageLikes((prev) => ({
      ...prev,
      [key]: { isLiked: newIsLiked, count: newCount },
    }));

    // הפעלת האנימציה
    if (!likeScaleAnim.current[key]) {
      likeScaleAnim.current[key] = new Animated.Value(1);
    }

    Animated.sequence([
      Animated.timing(likeScaleAnim.current[key], {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeScaleAnim.current[key], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    const imageDocRef = doc(db, 'imageLikes', key);

    try {
      const existingDoc = await getDoc(imageDocRef);

      if (!existingDoc.exists()) {
        if (newIsLiked) {
          await setDoc(imageDocRef, {
            likes: [currentUserId],
            imageUri,
            profileOwnerId: uid,
            imageIndex,
            lastUpdated: new Date().toISOString(),
          });
        }
      } else {
        if (newIsLiked) {
          await updateDoc(imageDocRef, {
            likes: arrayUnion(currentUserId),
            lastUpdated: new Date().toISOString(),
          });
        } else {
          await updateDoc(imageDocRef, {
            likes: arrayRemove(currentUserId),
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // החזרת המצב הקודם אם יש שגיאה
      setImageLikes((prev) => ({
        ...prev,
        [key]: currentLikes,
      }));
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הלייק');
    } finally {
      setLikeLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const renderGalleryImage = ({ item, index }: { item: string; index: number }) => {
    const key = `${uid}_${index}`;
    const likesData = imageLikes[key] || { isLiked: false, count: 0 };
    const { isLiked, count } = likesData;

    // הפעלת אנימציה של סקייל אם היא קיימת, אחרת יצירת אחת חדשה
    if (!likeScaleAnim.current[key]) {
      likeScaleAnim.current[key] = new Animated.Value(1);
    }
    const scaleAnim = likeScaleAnim.current[key];

    return (
      <TouchableOpacity
        style={[
          styles.galleryItem,
          {
            marginLeft: (index % GALLERY_COLUMNS) === (GALLERY_COLUMNS - 1) ? 0 : GALLERY_SPACING,
            marginBottom: GALLERY_SPACING,
          },
        ]}
        onPress={() => openImageModal(index)} // Correct index for gallery
      >
        <Image
          source={{ uri: item }}
          style={styles.galleryImage}
        />
        {/* Like Overlay */}
        <View style={styles.likeOverlay}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={(e) => {
              e.stopPropagation(); // מונע את פתיחת המודל
              handleLike(index, item);
            }}
            disabled={likeLoading[key]}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={'heart'}
                size={18}
                color={isLiked ? '#FF3B30' : '#FFF'}
                style={isLiked ? null : styles.iconShadow}
              />
            </Animated.View>
            {count > 0 && (
              <Text style={styles.likeCount}>{count}</Text>
            )}
          </TouchableOpacity>
        </View>
        {index === 8 && userData.galleryImages.length > 9 && (
          <View style={styles.moreImagesOverlay}>
            <Text style={styles.moreImagesText}>+{userData.galleryImages.length - 9}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderModalImage = ({ item }: { item: string }) => (
    <View style={styles.expandedImageContainer}>
      <Image
        source={{ uri: item }}
        style={styles.expandedImage}
        resizeMode="contain"
      />
    </View>
  );

  const statusBarStyle = theme.isDark ? 'light-content' : 'dark-content';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color="#3A8DFF" />
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
          <View style={[styles.onlineIndicator, { backgroundColor: theme.isDark ? '#3A8DFF20' : '#E6F3FF' }]}>
            <View style={styles.onlineDot} />
            <Text style={[styles.onlineText, { color: '#3A8DFF' }]}>פעיל עכשיו</Text>
          </View>
        )}
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.isDark ? theme.colors.background : '#f8f9fa' }]} onPress={() => router.push('/(tabs)/home')}>
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
              <Image source={{ uri: userData.profileImage }} style={[styles.profileImage, { borderColor: '#3A8DFF' }]} />
            ) : (
              <View style={[styles.defaultProfileIcon, { backgroundColor: theme.isDark ? theme.colors.background : '#E6F3FF', borderColor: '#3A8DFF' }]}>
                <Ionicons name="person" size={60} color="#3A8DFF" />
              </View>
            )}
            {userData.isOnline && <View style={[styles.onlineBadge, { borderColor: theme.colors.background }]} />}
          </View>

          <Text style={[styles.username, { color: theme.colors.text }]}>{userData.username}</Text>

          {/* Location Info */}
          <View style={styles.locationContainer}>
            {userData.currentLocation?.city && userData.currentLocation?.country && (
              <View style={styles.currentLocationRow}>
                <Feather name="map-pin" size={16} color="#3A8DFF" />
                <Text style={[styles.currentLocationText, { color: '#3A8DFF' }]}>
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

        {/* Separator */}
        <View style={[styles.separator, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]} />

        {/* Bio Section */}
        {userData.bio && (
          <View style={styles.bioSection}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={20} color="#3A8DFF" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>אודותיי</Text>
            </View>
            <Text style={[styles.bioText, { color: theme.colors.text }]}>{userData.bio}</Text>
          </View>
        )}

        {/* Separator */}
        {userData.bio && <View style={[styles.separator, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]} />}

        {/* Travel Info */}
        {(userData.travelStyle || (userData.favoriteDestinations && userData.favoriteDestinations.length > 0)) && (
          <>
            <View style={styles.travelInfoContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="compass" size={20} color="#3A8DFF" />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>מידע נסיעות</Text>
              </View>
              
              {userData.travelStyle && (
                <View style={[styles.travelCard, { backgroundColor: theme.isDark ? '#1F2937' : '#F8FAFF', borderRightColor: '#3A8DFF' }]}>
                  <Feather name="compass" size={18} color="#3A8DFF" />
                  <Text style={[styles.travelCardText, { color: theme.colors.text }]}>{userData.travelStyle}</Text>
                </View>
              )}

              {userData.favoriteDestinations && userData.favoriteDestinations.length > 0 && (
                <View style={[styles.travelCard, { backgroundColor: theme.isDark ? '#1F2937' : '#F8FAFF', borderRightColor: '#3A8DFF' }]}>
                  <Feather name="heart" size={18} color="#3A8DFF" />
                  <Text style={[styles.travelCardText, { color: theme.colors.text }]} numberOfLines={2}>
                    {userData.favoriteDestinations.join(', ')}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Separator */}
            <View style={[styles.separator, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]} />
          </>
        )}

        {/* Gallery Section */}
        <View style={styles.gallerySection}>
          <View style={styles.sectionHeader}>
            <Feather name="image" size={20} color="#3A8DFF" />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>גלריה</Text>
          </View>
          
          {userData.galleryImages.length > 0 ? (
            <View style={styles.galleryContainer}>
              <FlatList
                data={userData.galleryImages.slice(0, 9).reverse()}
                keyExtractor={(item, index) => `${uid}_${userData.galleryImages.length - 1 - index}`}
                numColumns={GALLERY_COLUMNS}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => renderGalleryImage({
                  item,
                  index: userData.galleryImages.length - 1 - index, // Pass the correct original index
                })}
                contentContainerStyle={styles.galleryContent}
                style={styles.galleryList}
              />
            </View>
          ) : (
            <View style={styles.noImagesContainer}>
              <Feather name="camera" size={48} color={theme.isDark ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.noImagesText, { color: theme.isDark ? '#6B7280' : '#9CA3AF' }]}>
                המשתמש לא העלה תמונות
              </Text>
            </View>
          )}
        </View>
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
            <FlatList
              data={userData.galleryImages}
              renderItem={renderModalImage}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              initialScrollIndex={selectedImageIndex}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.floor(event.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(newIndex);
              }}
            />
          )}
          {selectedImageIndex !== null && (
            <View style={[styles.imageCounter, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.5)' }]}>
              <Text style={styles.imageCounterText}>{selectedImageIndex + 1} / {userData.galleryImages.length}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>
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
    backgroundColor: '#3A8DFF',
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
    backgroundColor: '#3A8DFF',
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
  separator: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bioSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
  },
  travelInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
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
  gallerySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  galleryContainer: {
    paddingHorizontal: 4,
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
  noImagesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noImagesText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
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
  expandedImageContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 80,
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
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  // New styles for the like button
  likeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 15,
  },
  likeCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
