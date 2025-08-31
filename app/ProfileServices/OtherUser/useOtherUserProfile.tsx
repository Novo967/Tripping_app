// app/ProfileServices/OtherUser/useOtherUserProfile.ts

import { getAuth } from 'firebase/auth';
import {
  doc,
  DocumentData,
  getDoc,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, listAll, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { db } from '../../../firebaseConfig';

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

export const useOtherUserProfile = (uid: string) => {
  const [userData, setUserData] = useState<UserData>({
    username: '',
    profileImage: '',
    galleryImages: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const auth = getAuth();

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

      } catch (error) {
        console.error('An error occurred during data fetching:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [uid]);

  const openImageModal = (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImageIndex(null);
  };

  const formatJoinDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `הצטרף ${date.getFullYear()}`;
  };

  return {
    userData,
    loading,
    modalVisible,
    selectedImageIndex,
    openImageModal,
    closeImageModal,
    formatJoinDate,
  };
};