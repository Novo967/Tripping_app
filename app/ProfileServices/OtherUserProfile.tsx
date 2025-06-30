// screens/OtherUserProfile.tsx

import { Feather, Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../firebaseConfig';
import { RootStackParamList } from '../types';


type OtherUserProfileRouteProp = RouteProp<RootStackParamList, 'OtherUserProfile'>;

const { width } = Dimensions.get('window');

interface UserData {
  username: string;
  profileImage: string;
  galleryImages: string[];
  location?: {
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

  const [userData, setUserData] = useState<UserData>({
    username: '',
    profileImage: '',
    galleryImages: [],
  });
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch from API
        const res = await fetch(`https://tripping-app.onrender.com/get-other-user-profile?uid=${uid}`);
        const apiData = await res.json();

        // Fetch from Firestore
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const firestoreData = userSnap.data();
          const profileImageUrl = apiData.profile_image || ''; // קבלת ה-URI
          console.log('Profile Image URI:', profileImageUrl);
          setUserData({
            username: firestoreData.username || '',
            profileImage: apiData.profile_image || '',
            galleryImages: apiData.gallery_images || [],
            location: firestoreData.location && firestoreData.location.city && firestoreData.location.country 
              ? firestoreData.location 
              : null,
            bio: firestoreData.bio || '',
            favoriteDestinations: firestoreData.favoriteDestinations || [],
            travelStyle: firestoreData.travelStyle || '',
            joinDate: firestoreData.joinDate || '',
            isOnline: firestoreData.isOnline || false,
          });
        } else {
          console.warn('No such user in Firestore!');
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

  const InfoCard = ({ icon, title, content }: { icon: string, title: string, content: string }) => (
    <View style={styles.infoCard}>
      <Feather name={icon as any} size={20} color="#FF6F00" />
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{content}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>טוען פרופיל...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/home')}>
            <Feather name="arrow-right" size={22} color="#FF6F00" />
          </TouchableOpacity>
        </View>
        
        {userData.isOnline && (
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>פעיל עכשיו</Text>
          </View>
        )}
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          {userData.profileImage ? (
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultProfileIcon}>
              <Ionicons name="person" size={50} color="#FF6F00" />
            </View>
          )}
          {userData.isOnline && <View style={styles.onlineBadge} />}
      </View>

        
        <Text style={styles.username}>{userData.username}</Text>
        
        {/* Location */}
        {(userData.location?.city && userData.location?.country && 
          userData.location.city !== 'לא זמין' && userData.location.country !== 'לא זמין') && (
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={16} color="#666" />
            <Text style={styles.locationText}>
              {userData.location.city}, {userData.location.country}
            </Text>
          </View>
        )}

        {userData.joinDate && (
          <Text style={styles.joinDate}>{formatJoinDate(userData.joinDate)}</Text>
        )}
      </View>

      {/* Bio Section */}
      {userData.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>אודות</Text>
          <Text style={styles.bioText}>{userData.bio}</Text>
        </View>
      )}

      {/* Travel Info */}
      {(userData.travelStyle || (userData.favoriteDestinations && userData.favoriteDestinations.length > 0)) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי נסיעות</Text>
          
          {userData.travelStyle && (
            <InfoCard 
              icon="compass" 
              title="סגנון נסיעה" 
              content={userData.travelStyle} 
            />
          )}
          
          {userData.favoriteDestinations && userData.favoriteDestinations.length > 0 && (
            <InfoCard 
              icon="heart" 
              title="יעדים מועדפים" 
              content={userData.favoriteDestinations.join(', ')} 
            />
          )}
        </View>
      )}

      {/* Gallery Section */}
      {userData.galleryImages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.galleryHeader}>
            <Text style={styles.sectionTitle}>גלריית תמונות</Text>
            <Text style={styles.imageCount}>{userData.galleryImages.length} תמונות</Text>
          </View>
          <FlatList
            data={userData.galleryImages.slice(0, 9)}
            keyExtractor={(item, index) => index.toString()}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.galleryContainer}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={styles.galleryImageContainer}
                onPress={() => {
                  // כאן תוכל להוסיף פתיחת מודל תצוגת תמונות
                  console.log('Open image gallery at index:', index);
                }}
              >
                <Image source={{ uri: item }} style={styles.galleryImage} />
                {index === 8 && userData.galleryImages.length > 9 && (
                  <View style={styles.moreImagesOverlay}>
                    <Text style={styles.moreImagesText}>+{userData.galleryImages.length - 9}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Message Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
          <Feather name="message-circle" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.messageButtonText}>שלח הודעה</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default OtherUserProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  backButton: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
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
    color: '#4CAF50',
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FF6F00',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: 'white',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  joinDate: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  imageCount: {
    fontSize: 14,
    color: '#FF6F00',
    fontWeight: '600',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryContainer: {
    paddingTop: 5,
  },
  galleryImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  galleryImage: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    marginRight: 8,
    borderRadius: 12,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 8,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  messageButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6F00',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  messageButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  defaultProfileIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
  }

});