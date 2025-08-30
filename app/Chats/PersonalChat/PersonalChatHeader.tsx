import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';
import { useTheme } from '../../ProfileServices/ThemeContext';

interface ChatHeaderProps {
  otherUserId: string;
  otherUsername: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ otherUserId, otherUsername }) => {
  const [otherUserProfileImage, setOtherUserProfileImage] = useState<string | null>(null);
  const { theme } = useTheme();

  // New function to get the profile image URL from Firestore
  const getProfileImageUrl = async (userId: string) => {
    if (!userId) {
      return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
    }
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().profile_image) {
        return userDoc.data().profile_image;
      } else {
        return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
      }
    } catch (e) {
      console.warn(`שגיאה בשליפת תמונת פרופיל עבור המשתמש ${userId}:`, e);
      return 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
    }
  };

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!otherUserId) return;
      const imageUrl = await getProfileImageUrl(otherUserId);
      setOtherUserProfileImage(imageUrl);
    };
    fetchProfileImage();
  }, [otherUserId]);

  const goBack = () => router.back();

  const handleUserProfilePress = () => {
    router.push({
      pathname: '/ProfileServices/OtherUserProfile',
      params: { uid: otherUserId },
    });
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF' }}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 0 : 10, backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF', borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color={theme.isDark ? '#FFFFFF' : '#FFFFFF'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserProfilePress} activeOpacity={0.7}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: otherUserProfileImage || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png',
              }}
              style={styles.avatar}
            />
          </View>
          <View style={styles.userTextInfo}>
            <Text style={[styles.username, { color: theme.isDark ? '#FFFFFF' : '#FFFFFF' }]}>{otherUsername}</Text>
            <Text style={[styles.userStatus, { color: theme.isDark ? '#D0D0D0' : '#95A5A6' }]}>פעיל עכשיו</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ChatHeader;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: -6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    shadowColor: '#3A8DFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  userInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginLeft: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userTextInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  userStatus: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 2,
  },
});