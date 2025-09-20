// app/ProfileServices/OtherUser/OtherUserProfileUI.tsx

import { Feather, Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import LikeableImage from '../../ProfileServices/GalleryServices/LikeableImage';
import { useTheme } from '../../ThemeContext';
import { RootStackParamList } from '../../types';
import BlockUserModal from '../BlockUserModal';
import OtherUserProfileOptions from './OtherUserProfileOptions';
import { useOtherUserProfile } from './useOtherUserProfile';

const { width } = Dimensions.get('window');
const PROFILE_IMAGE_SIZE = 120;
const GALLERY_MARGIN = 24;
const GALLERY_SPACING = 12;
const GALLERY_COLUMNS = 3;
const BOTTOM_BUTTON_HEIGHT = Platform.OS === 'ios' ? 100 : 80;

const galleryItemSize = (width - GALLERY_MARGIN * 2 - GALLERY_SPACING * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;

type OtherUserProfileRouteProp = RouteProp<RootStackParamList, 'OtherUserProfile'>;

const OtherUserProfile = () => {
  const route = useRoute<OtherUserProfileRouteProp>();
  const { uid } = route.params;
  const router = useRouter();
  const { theme } = useTheme();
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  const {
    userData,
    loading,
    modalVisible,
    selectedImageIndex,
    openImageModal,
    closeImageModal,
    formatJoinDate,
  } = useOtherUserProfile(uid);

  const handleSendMessage = () => {
    router.push({
      pathname: '/Chats/PersonalChat/chatModal',
      params: {
        otherUserId: uid,
        otherUsername: userData.username,
        otherUserImage: userData.profileImage,
      },
    });
  };

  const handleBlockUser = () => {
    setBlockModalVisible(true);
  };

  const renderGalleryImage = ({ item, index }: { item: string; index: number }) => {
    const reversedIndex = userData.galleryImages.length - 1 - index;
    
    return (
      <View
        style={[
          styles.galleryItem,
          {
            marginBottom: GALLERY_SPACING,
            transform: [{ scaleX: -1 }],
          },
        ]}
      >
        <LikeableImage
          imageUri={item}
          imageIndex={reversedIndex}
          profileOwnerId={uid}
          style={styles.likeableImageStyle}
          onPress={() => openImageModal(reversedIndex)}
          showLikeButton={true}
          onPressDisabled={false}
        />
        {index === 8 && userData.galleryImages.length > 9 && (
          <View style={styles.moreImagesOverlay}>
            <Text style={styles.moreImagesText}>+{userData.galleryImages.length - 9}</Text>
          </View>
        )}
      </View>
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

      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        {userData.isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: theme.isDark ? '#3A8DFF20' : '#E6F3FF' }]}>
            <View style={styles.onlineDot} />
            <Text style={[styles.onlineText, { color: '#3A8DFF' }]}>פעיל עכשיו</Text>
          </View>
        )}
        <View style={styles.headerButtons}>
          <OtherUserProfileOptions 
            username={userData.username}
            userId={uid}
            onBlockUser={handleBlockUser}
          />
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: theme.isDark ? theme.colors.background : '#f8f9fa' }]} 
            onPress={() => router.back()}
          >
            <Feather name="arrow-right" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_BUTTON_HEIGHT + 20 }]}
      >
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

        <View style={[styles.separator, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]} />

        {userData.bio && (
          <View style={styles.bioSection}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={20} color="#3A8DFF" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>אודותיי</Text>
            </View>
            <Text style={[styles.bioText, { color: theme.colors.text }]}>{userData.bio}</Text>
          </View>
        )}

        {userData.bio && <View style={[styles.separator, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]} />}

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
            <View style={[styles.separator, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]} />
          </>
        )}

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
                renderItem={renderGalleryImage}
                contentContainerStyle={styles.galleryContent}
                columnWrapperStyle={styles.galleryColumnWrapper}
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

      <View style={[styles.floatingButtonContainer, { backgroundColor: theme.isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
        <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
          <Feather name="message-circle" size={20} color="white" />
          <Text style={styles.messageButtonText}>שלח הודעה</Text>
        </TouchableOpacity>
      </View>

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
                openImageModal(newIndex);
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

      <BlockUserModal
        isVisible={blockModalVisible}
        onClose={() => setBlockModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default OtherUserProfile;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4 },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8, borderRadius: 20, marginLeft: 280 },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3A8DFF', marginRight: 6 },
  onlineText: { fontSize: 12, fontWeight: '600' },
  scrollContent: { flexGrow: 1 },
  profileSection: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  profileImageContainer: { position: 'relative', marginBottom: 16 },
  profileImage: { width: PROFILE_IMAGE_SIZE, height: PROFILE_IMAGE_SIZE, borderRadius: PROFILE_IMAGE_SIZE / 2, borderWidth: 3 },
  defaultProfileIcon: { width: PROFILE_IMAGE_SIZE, height: PROFILE_IMAGE_SIZE, borderRadius: PROFILE_IMAGE_SIZE / 2, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  onlineBadge: { position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#3A8DFF', borderWidth: 4 },
  username: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  locationContainer: { alignItems: 'center', marginBottom: 8 },
  currentLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  currentLocationText: { fontSize: 16, marginLeft: 6, fontWeight: '600' },
  homeLocationRow: { flexDirection: 'row', alignItems: 'center' },
  homeLocationText: { fontSize: 14, marginLeft: 6 },
  joinDate: { fontSize: 13, textAlign: 'center' },
  separator: { height: 1, marginHorizontal: 20, marginVertical: 16 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  bioSection: { paddingHorizontal: 20, marginBottom: 8 },
  bioText: { fontSize: 15, lineHeight: 22, textAlign: 'right' },
  travelInfoContainer: { paddingHorizontal: 20, marginBottom: 8 },
  travelCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 8, borderRightWidth: 3 },
  travelCardText: { fontSize: 14, marginLeft: 10, flex: 1 },
  gallerySection: { paddingHorizontal: 20, marginBottom: 32 },
  galleryContainer: { },
  galleryContent: { paddingTop: 0 },
  galleryList: { transform: [{ scaleX: -1 }] },
  galleryColumnWrapper: { justifyContent: 'space-between' },
  galleryItem: { width: galleryItemSize, height: galleryItemSize, position: 'relative' },
  likeableImageStyle: { width: '100%', height: '100%', borderRadius: 8 },
  moreImagesOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  moreImagesText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  noImagesContainer: { alignItems: 'center', paddingVertical: 40 },
  noImagesText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
  floatingButtonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 48, paddingTop: 16 },
  messageButton: { flexDirection: 'row', backgroundColor: '#3A8DFF', paddingVertical: 16, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#3A8DFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  messageButtonText: { color: 'white', fontSize: 17, fontWeight: '700', marginLeft: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  expandedImageContainer: { width: width, height: '100%', justifyContent: 'center', alignItems: 'center' },
  expandedImage: { width: '100%', height: '100%' },
  imageCounter: { position: 'absolute', bottom: 80, alignSelf: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  imageCounterText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  closeButton: { position: 'absolute', top: 50, left: 20, zIndex: 1 },
});