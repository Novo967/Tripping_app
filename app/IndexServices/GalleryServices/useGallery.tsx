// app/IndexServices/GalleyrServices/useGallery.ts

import * as ImagePicker from 'expo-image-picker';
import { deleteObject, getDownloadURL, getStorage, listAll, ref, uploadBytes } from 'firebase/storage';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../../firebaseConfig';

const GALLERY_STORAGE_PATH = 'gallery_images';
const storage = getStorage();

export const useGallery = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [longPressActive, setLongPressActive] = useState(false);
  const [firebaseGalleryImages, setFirebaseGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // הוספת האזנה למצב ההתחברות של המשתמש
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchFirebaseGalleryImages();
      } else {
        setFirebaseGalleryImages([]);
        setLoadingGallery(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchFirebaseGalleryImages = useCallback(async () => {
    if (!user) {
      console.log('User not logged in, cannot fetch gallery.');
      setLoadingGallery(false);
      return;
    }

    setLoadingGallery(true);
    
    try {
      const userGalleryRef = ref(storage, `${GALLERY_STORAGE_PATH}/${user.uid}`);
      const res = await listAll(userGalleryRef);
      const urls = await Promise.all(
        res.items.map((itemRef) => getDownloadURL(itemRef))
      );
      setFirebaseGalleryImages(urls);
    } catch (error) {
      console.error('Error fetching gallery images from Firebase Storage:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בטעינת התמונות מהגלריה.');
    } finally {
      setLoadingGallery(false);
    }
  }, [user]);

  const uploadImageToFirebaseStorage = async (uri: string) => {
    if (!user) {
      throw new Error('משתמש לא מחובר');
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `image_${Date.now()}.jpg`;
      const imageRef = ref(storage, `${GALLERY_STORAGE_PATH}/${user.uid}/${filename}`);
      await uploadBytes(imageRef, blob);
      const downloadUrl = await getDownloadURL(imageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image to Firebase Storage:', error);
      throw error;
    }
  };

  const handlePickImage = async () => {
    try {
      if (!user) {
        Alert.alert('שגיאה', 'יש להתחבר כדי להעלות תמונות.');
        return;
      }
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('הרשאה נדרשת', 'אנחנו צריכים הרשאה לגשת לגלריה שלך');
        return;
      }

      setUploading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }

      const uri = result.assets[0].uri;
      if (!uri) {
        throw new Error('URI של התמונה לא חוקי');
      }

      const newImageUrl = await uploadImageToFirebaseStorage(uri);
      
      if (newImageUrl) {
        const updatedImages = [...firebaseGalleryImages, newImageUrl];
        setFirebaseGalleryImages(updatedImages);
      }
    } catch (error: any) {
      console.error('Error picking or uploading image:', error);
      Alert.alert('שגיאה', `לא הצלחנו להעלות את התמונה: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!user) {
      Alert.alert('שגיאה', 'יש להתחבר כדי למחוק תמונות.');
      return;
    }

    if (selectedImages.size === 0) {
      Alert.alert('שגיאה', 'יש לבחור תמונות למחיקה.');
      return;
    }

    Alert.alert(
      'מחיקת תמונות',
      `האם אתה בטוח שתרצה למחוק ${selectedImages.size} תמונות? פעולה זו הינה בלתי הפיכה.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            const toDeleteUrls: string[] = [];
            const deletePromises: Promise<void>[] = [];

            for (const index of Array.from(selectedImages)) {
              const imageUrl = firebaseGalleryImages[index];
              if (imageUrl) {
                toDeleteUrls.push(imageUrl);
                const fileRef = ref(storage, imageUrl);
                deletePromises.push(deleteObject(fileRef));
              }
            }

            try {
              await Promise.all(deletePromises);
              const updatedImages = firebaseGalleryImages.filter((url) => !toDeleteUrls.includes(url));
              setFirebaseGalleryImages(updatedImages);
              setSelectedImages(new Set());
              setLongPressActive(false);
            } catch (error) {
              console.error('שגיאה במחיקת תמונות:', error);
              Alert.alert('שגיאה', 'אירעה שגיאה במחיקת התמונות. אנא נסה שוב.');
            }
          },
        },
      ]
    );
  };

  const handleToggleSelect = useCallback((index: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedImages(newSelected);
  }, [selectedImages]);

  const handleLongPressStart = useCallback((index: number) => {
    setLongPressActive(true);
    handleToggleSelect(index);
  }, [handleToggleSelect]);

  const clearSelection = useCallback(() => {
    setSelectedImages(new Set());
    setLongPressActive(false);
  }, []);

  const profileOwnerId = user?.uid || '';

  return {
    uploading,
    selectedImages,
    longPressActive,
    firebaseGalleryImages,
    loadingGallery,
    handlePickImage,
    handleDeleteSelected,
    handleToggleSelect,
    handleLongPressStart,
    clearSelection,
    profileOwnerId,
  };
};
