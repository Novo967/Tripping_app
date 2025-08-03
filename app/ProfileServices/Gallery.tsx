import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage';
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

export default function Gallery({ onImagePress }: Props) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [longPressActive, setLongPressActive] = useState(false);
  const [likeCounts, setLikeCounts] = useState<number[]>([]);
  const [firebaseGalleryImages, setFirebaseGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  const fetchFirebaseGalleryImages = useCallback(async () => {
    const user = auth.currentUser;
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
      console.log('Fetched gallery images from Firebase Storage:', urls);
    } catch (error) {
      console.error('Error fetching gallery images from Firebase Storage:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בטעינת התמונות מהגלריה.');
    } finally {
      setLoadingGallery(false);
    }
  }, []);

  useEffect(() => {
    fetchFirebaseGalleryImages();
  }, [fetchFirebaseGalleryImages]);

  useEffect(() => {
    const fetchLikesForGallery = async () => {
      const user = auth.currentUser;
      if (!user || firebaseGalleryImages.length === 0) return;

      const promises = firebaseGalleryImages.map(async (imageUrl) => {
        const fileRef = ref(storage, imageUrl);
        const imagePath = fileRef.fullPath;
        const docRef = doc(db, 'imageLikes', imagePath);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          return Array.isArray(data.likes) ? data.likes.length : 0;
        }
        return 0;
      });

      const results = await Promise.all(promises);
      setLikeCounts(results);
    };

    fetchLikesForGallery();
  }, [firebaseGalleryImages]);

  const uploadImageToFirebaseStorage = async (uri: string) => {
    const user = auth.currentUser;
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
      console.log('Uploaded image to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image to Firebase Storage:', error);
      throw error;
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('הרשאה נדרשת', 'אנחנו צריכים הרשאה לגשת לגלריה שלך');
        return;
      }

      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const newImageUrl = await uploadImageToFirebaseStorage(uri);
        setFirebaseGalleryImages((prevImages) => [...prevImages, newImageUrl]);
        Alert.alert('הצלחה', 'התמונה הועלתה בהצלחה!');
      }
    } catch (error) {
      console.error('Error picking or uploading image:', error);
      Alert.alert('שגיאה', 'לא הצלחנו להעלות את התמונה');
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
              console.log(
                `Successfully deleted ${toDeleteUrls.length} images from Firebase Storage.`
              );
              setFirebaseGalleryImages((prevImages) =>
                prevImages.filter((url) => !toDeleteUrls.includes(url))
              );
              setSelectedImages(new Set());
              setLongPressActive(false);
              Alert.alert('הצלחה', 'התמונות נמחקו בהצלחה!');
            } catch (error) {
              console.error('שגיאה במחיקת תמונות:', error);
              Alert.alert('שגיאה', 'אירעה שגיאה במחיקת התמונות. אנא נסה שוב.');
            }
          },
        },
      ]
    );
  };

  const handleImagePress = (index: number) => {
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

  const handleLongPress = (index: number) => {
    setLongPressActive(true);
    const newSelected = new Set(selectedImages);
    if (!newSelected.has(index)) {
      newSelected.add(index);
      setSelectedImages(newSelected);
    }
  };

  const renderGridItem = ({ item, index }: ListRenderItemInfo<string>) => {
    const isSelected = selectedImages.has(index);

    return (
      <TouchableOpacity
        style={[
          styles.galleryItem,
          { backgroundColor: theme.colors.surface },
          isSelected && { opacity: 0.7 },
        ]}
        onPress={() => handleImagePress(index)}
        onLongPress={() => handleLongPress(index)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item }}
          style={styles.galleryImage}
          resizeMode="cover"
        />

        {isSelected && (
          <View style={styles.selectionOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.selectionGradient}
            />
            <View
              style={[
                styles.selectionIndicator,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.imageOverlay}
        >
          <View style={styles.imageStats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={12} color="white" />
              <Text style={styles.statText}>
                {likeCounts[index] !== undefined ? likeCounts[index] : 0}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.galleryHeader, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerLeft}></View>
      <View style={styles.headerCenter}>
        <Text style={[styles.galleryCount, { color: theme.colors.text }]}>
          {firebaseGalleryImages.length} תמונות
        </Text>
      </View>
      <View style={styles.headerRight}>
        {selectedImages.size > 0 || longPressActive ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={handleDeleteSelected}
            accessibilityLabel={`מחק ${selectedImages.size} תמונות שנבחרו`}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.actionButtonText}>{selectedImages.size}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePickImage}
            disabled={uploading}
            accessibilityLabel={uploading ? 'מעלה תמונה' : 'הוסף תמונה חדשה'}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="add" size={20} color="white" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[theme.colors.primary + '20', theme.colors.secondary + '20']}
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
          style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
          onPress={handlePickImage}
          accessibilityLabel="הוסף תמונה ראשונה"
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (firebaseGalleryImages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      <FlatList
        data={firebaseGalleryImages}
        keyExtractor={(item, index) => item || index.toString()}
        numColumns={3}
        key={'grid'}
        renderItem={renderGridItem}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
      />
      {(selectedImages.size > 0 || longPressActive) && (
        <TouchableOpacity
          style={styles.floatingClearButton}
          onPress={() => {
            setSelectedImages(new Set());
            setLongPressActive(false);
          }}
          accessibilityLabel="בטל בחירה של תמונות"
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
  },
  galleryCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  galleryImage: {
    width: '100%',
    height: '100%',
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
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  imageStats: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
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