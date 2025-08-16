import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { arrayRemove, arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, listAll, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_IMAGE_SIZE = (SCREEN_WIDTH - 32 - 4) / 3;

const storage = getStorage();

type Props = {
  onImagePress: (imageUri: string) => void;
};

const GALLERY_STORAGE_PATH = 'gallery_images';
const LIKES_COLLECTION = 'imageLikes';

interface LikesData {
  [key: string]: number; // Store like count for each image URI
}

interface IsLikedData {
  [key: string]: boolean; // Store liked status for each image URI
}

export default function Gallery({ onImagePress }: Props) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [longPressActive, setLongPressActive] = useState(false);
  const [firebaseGalleryImages, setFirebaseGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [likesData, setLikesData] = useState<LikesData>({});
  const [isLikedData, setIsLikedData] = useState<IsLikedData>({});

  const user = auth.currentUser;

  const fetchLikesData = useCallback(async (imageUrls: string[]) => {
    const newLikesData: LikesData = {};
    const newIsLikedData: IsLikedData = {};
    if (!user) return;

    const currentUserId = user.uid;

    for (const [index, url] of imageUrls.entries()) {
      try {
        const imageDocRef = doc(db, LIKES_COLLECTION, `${user.uid}_${index}`);
        const imageDoc = await getDoc(imageDocRef);

        if (imageDoc.exists()) {
          const data = imageDoc.data();
          const likes = data.likes || [];
          newLikesData[url] = likes.length;
          newIsLikedData[url] = likes.includes(currentUserId);
        } else {
          newLikesData[url] = 0;
          newIsLikedData[url] = false;
        }
      } catch (error) {
        console.error(`Error fetching likes for image ${index}:`, error);
      }
    }
    setLikesData(newLikesData);
    setIsLikedData(newIsLikedData);
  }, [user]);

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
      await fetchLikesData(urls);
    } catch (error) {
      console.error('Error fetching gallery images from Firebase Storage:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בטעינת התמונות מהגלריה.');
    } finally {
      setLoadingGallery(false);
    }
  }, [user, fetchLikesData]);

  useEffect(() => {
    fetchFirebaseGalleryImages();
  }, [fetchFirebaseGalleryImages]);

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
      // בדיקה שהמשתמש מחובר
      if (!user) {
        Alert.alert('שגיאה', 'יש להתחבר כדי להעלות תמונות.');
        return;
      }

      // בקשת הרשאות
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('הרשאה נדרשת', 'אנחנו צריכים הרשאה לגשת לגלריה שלך');
        return;
      }

      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7, // הורדת האיכות לביצועים טובים יותר
        allowsEditing: true,
        aspect: [1, 1],
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }

      const uri = result.assets[0].uri;
      
      // בדיקת תקינות ה-URI
      if (!uri) {
        throw new Error('URI של התמונה לא חוקי');
      }

      const newImageUrl = await uploadImageToFirebaseStorage(uri);
      
      if (newImageUrl) {
        setFirebaseGalleryImages((prevImages) => [...prevImages, newImageUrl]);
        
        // רענון נתוני הלייקים עבור התמונה החדשה
        await fetchLikesData([...firebaseGalleryImages, newImageUrl]);
      }
    } catch (error: any) {
      console.error('Error picking or uploading image:', error);
      Alert.alert('שגיאה', `לא הצלחנו להעלות את התמונה: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSelected = async () => {
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
              setFirebaseGalleryImages((prevImages) => prevImages.filter((url) => !toDeleteUrls.includes(url)));
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

  const handleItemPress = (index: number, isAddButton: boolean) => {
    if (isAddButton) {
      handlePickImage();
      return;
    }

    if (longPressActive) {
      const newSelected = new Set(selectedImages);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedImages(newSelected);
    } else {
      onImagePress(firebaseGalleryImages[index]);
    }
  };

  const handleLongPress = (index: number, isAddButton: boolean) => {
    if (isAddButton) return;

    setLongPressActive(true);
    const newSelected = new Set(selectedImages);
    if (!newSelected.has(index)) {
      newSelected.add(index);
      setSelectedImages(newSelected);
    }
  };

  const handleLike = async (imageUri: string, imageIndex: number) => {
    if (!user) {
      Alert.alert('שגיאה', 'עליך להתחבר כדי לאהוב תמונות');
      return;
    }

    const currentUserId = user.uid;
    const isCurrentlyLiked = isLikedData[imageUri];
    const imageDocRef = doc(db, LIKES_COLLECTION, `${user.uid}_${imageIndex}`);

    try {
      // Optimistically update the UI
      setLikesData(prev => ({ ...prev, [imageUri]: isCurrentlyLiked ? prev[imageUri] - 1 : prev[imageUri] + 1 }));
      setIsLikedData(prev => ({ ...prev, [imageUri]: !isCurrentlyLiked }));

      if (!isCurrentlyLiked) {
        // User is liking the image
        const existingDoc = await getDoc(imageDocRef);
        if (!existingDoc.exists()) {
          await setDoc(imageDocRef, {
            likes: [currentUserId],
            imageUri,
            profileOwnerId: user.uid,
            imageIndex,
            lastUpdated: new Date().toISOString(),
          });
        } else {
          await updateDoc(imageDocRef, {
            likes: arrayUnion(currentUserId),
            lastUpdated: new Date().toISOString(),
          });
        }
      } else {
        // User is unliking the image
        await updateDoc(imageDocRef, {
          likes: arrayRemove(currentUserId),
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert UI on error
      setLikesData(prev => ({ ...prev, [imageUri]: isCurrentlyLiked ? prev[imageUri] + 1 : prev[imageUri] - 1 }));
      setIsLikedData(prev => ({ ...prev, [imageUri]: isCurrentlyLiked }));
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הלייק');
    }
  };

  const renderAddButton = () => (
    <TouchableOpacity
      style={[
        styles.galleryItem,
        styles.addImageButton,
        {
          backgroundColor: theme.isDark ? '#1F2937' : '#F8FAFF',
          borderColor: theme.isDark ? '#374151' : '#E5E7EB',
        }
      ]}
      onPress={() => handleItemPress(-1, true)}
      disabled={uploading}
      activeOpacity={0.7}
    >
      {uploading ? (
        <ActivityIndicator size="large" color="#3A8DFF" />
      ) : (
        <>
          <View style={[styles.addIconContainer, { backgroundColor: '#3A8DFF' }]}>
            <Ionicons name="add" size={18} color="white" />
          </View>
          <Text style={[styles.addText, { color: theme.colors.textSecondary }]}>
            הוסף תמונה
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  const renderGalleryImage = ({ item, index }: ListRenderItemInfo<string>) => {
    const isSelected = selectedImages.has(index);
    const likeCount = likesData[item] || 0;
    const isLiked = isLikedData[item];

    return (
      <TouchableOpacity
        style={[
          styles.galleryItem,
          { backgroundColor: theme.colors.surface },
          isSelected && { opacity: 0.7 },
        ]}
        onPress={() => handleItemPress(index, false)}
        onLongPress={() => handleLongPress(index, false)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item }} style={styles.image} />

        {/* Displaying likes information */}
        <View style={styles.likeOverlay}>
          <TouchableOpacity onPress={() => handleLike(item, index)} disabled={longPressActive}>
            <Ionicons name={'heart'} size={18} color={isLiked ? '#FF3B30' : '#FFF'} style={styles.iconShadow} />
          </TouchableOpacity>
          {likeCount > 0 && (
            <Text style={styles.likeCount}>{likeCount}</Text>
          )}
        </View>

        {isSelected && (
          <View style={styles.selectionOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.selectionGradient}
            />
            <View
              style={[
                styles.selectionIndicator,
                { backgroundColor: '#3A8DFF' },
              ]}
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.galleryHeader, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContent}>
        <View style={styles.sectionHeader}>
          <Ionicons name="images" size={20} color="#3A8DFF" />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>גלריה</Text>
        </View>

        {longPressActive && selectedImages.size > 0 && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#FF3B30' }]}
            onPress={handleDeleteSelected}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.deleteButtonText}>{selectedImages.size}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.separator, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]} />
    </View>
  );

  const getAllItems = () => {
    return [renderAddButton(), ...firebaseGalleryImages];
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<any>) => {
    if (index === 0) {
      return item;
    }

    const imageUrl = item as string;
    const adjustedIndex = index - 1;
    return renderGalleryImage({
      item: imageUrl,
      index: adjustedIndex,
      separators: {
        highlight: () => {},
        unhighlight: () => {},
        updateProps: () => {},
      },
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#3A8DFF20', '#3A8DFF10']}
        style={styles.emptyGradient}
      >
        <Ionicons name="images-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          הגלריה שלך ריקה
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          הוסף תמונות כדי לשתף עם חברים
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: '#3A8DFF' }]}
          onPress={handlePickImage}
        >
          <Ionicons name="camera" size={20} color="white" />
          <Text style={styles.emptyButtonText}>הוסף תמונה ראשונה</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  if (loadingGallery) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3A8DFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      {firebaseGalleryImages.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={getAllItems()}
          keyExtractor={(item, index) => {
            if (index === 0) return 'add-button';
            return (item as string) || index.toString();
          }}
          numColumns={3}
          key={'grid'}
          renderItem={renderItem}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        />
      )}
      {(selectedImages.size > 0 || longPressActive) && (
        <TouchableOpacity
          style={styles.floatingClearButton}
          onPress={() => {
            setSelectedImages(new Set());
            setLongPressActive(false);
          }}
        >
          <BlurView
            intensity={80}
            tint={theme.isDark ? 'dark' : 'light'}
            style={styles.blurButton}
          >
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </BlurView>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  galleryHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
  },
  flatListContent: {
    padding: 16,
  },
  galleryItem: {
    width: GALLERY_IMAGE_SIZE,
    height: GALLERY_IMAGE_SIZE,
    margin: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  addImageButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  likeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
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
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectionGradient: {
    flex: 1,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
  },
  floatingClearButton: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    zIndex: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurButton: {
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});