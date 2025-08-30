// app/ProfileServices/OtherUser/useOtherUserProfile.ts

import { getAuth } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  doc,
  DocumentData,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, listAll, ref } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated } from 'react-native';
import { db } from '../../../firebaseConfig';

export interface ImageLikesData {
  isLiked: boolean;
  count: number;
}

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

        await fetchLikesForAllImages(galleryImageUrls);

      } catch (error) {
        console.error('An error occurred during data fetching:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [uid]);

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

  const openImageModal = (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImageIndex(null);
  };

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
      setImageLikes((prev) => ({
        ...prev,
        [key]: currentLikes,
      }));
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הלייק');
    } finally {
      setLikeLoading((prev) => ({ ...prev, [key]: false }));
    }
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
    imageLikes,
    likeLoading,
    likeScaleAnim,
    openImageModal,
    closeImageModal,
    handleLike,
    formatJoinDate,
  };
};