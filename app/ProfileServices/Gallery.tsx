import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig'; // וודא שזה הנתיב הנכון
import { useTheme } from '../ProfileServices/ThemeContext';

// ייבוא Firebase Storage
import { deleteObject, getStorage, ref } from 'firebase/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GALLERY_IMAGE_SIZE = (SCREEN_WIDTH - 32 - 4) / 3; // 16px margin on each side, 2px gap
const SERVER_URL = 'https://tripping-app.onrender.com'; // השרת שלך עדיין ישמש לניהול ה-URLים

// אתחל את Firebase Storage
const storage = getStorage();

type Props = {
  gallery: string[];
  onAddImage: (uri: string) => void;
  onDeleteImages: (deletedImageUrls: string[]) => void;
  onImagePress: (imageUri: string) => void;
};

export default function Gallery({ gallery, onAddImage, onDeleteImages, onImagePress }: Props) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [longPressActive, setLongPressActive] = useState(false);
  const [likeCounts, setLikeCounts] = useState<number[]>([]);

  useEffect(() => {
    const fetchLikesForGallery = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const promises = gallery.map(async (_, index) => {
        // לוודא שה-docId תואם לאיך שאתה שומר לייקים עבור כל תמונה
        // אם ה-likes משויכים ל-URL ספציפי, עדיף להשתמש ב-URL כחלק מה-ID או כ-query
        // כרגע זה מבוסס על אינדקס, וזה עלול להיות בעייתי אם סדר התמונות משתנה
        // אולי כדאי לשקול לשמור את ה-image ID/URL ב-Firestore במקום Index
        const docId = `${user.uid}_${index}`; // לשנות את זה ל-ID ייחודי של התמונה אם קיים
        const docRef = doc(db, 'imageLikes', docId);
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

    if (gallery.length > 0) {
      fetchLikesForGallery();
    }
  }, [gallery]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
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
        // קורא ל-onAddImage שמועבר מ-profile.tsx
        // onAddImage כבר מטפלת בהעלאה ל-Firebase Storage ובשמירת ה-URL בשרת ה-Render
        await onAddImage(uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את התמונה');
    } finally {
      setUploading(false);
    }
  };

  /**
   * מוחק קובץ מ-Firebase Storage.
   * @param fileUrl ה-Download URL של הקובץ למחיקה.
   */
  const deleteFileFromFirebaseStorage = async (fileUrl: string) => {
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
      console.log(`Successfully deleted ${fileUrl} from Firebase Storage.`);
    } catch (error) {
      console.error(`Error deleting ${fileUrl} from Firebase Storage:`, error);
      // ייתכן שהקובץ כבר לא קיים, אין צורך להציג שגיאה קריטית למשתמש
      // אם תרצה לטפל בשגיאה ספציפית (כמו קובץ לא קיים), תוכל לבדוק את ה-error.code
    }
  };

  /**
   * מוחק רשומה של תמונה ממסד הנתונים בשרת וגם את הקובץ מ-Firebase Storage.
   * @param imageUrl ה-Download URL של התמונה למחיקה.
   */
  const deleteImageRecordFromServer = async (imageUrl: string) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('משתמש לא מחובר');
    }

    try {
      // 1. נסה למחוק את הקובץ מ-Firebase Storage
      await deleteFileFromFirebaseStorage(imageUrl);

      // 2. שלח בקשה לשרת שלך למחוק את רשומת ה-URL ממסד הנתונים
      const response = await fetch(`${SERVER_URL}/delete-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, image_url: imageUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`מחיקת רשומת תמונה מהשרת נכשלה: ${errorText}`);
      }
      console.log(`Successfully deleted image record for ${imageUrl} from server.`);
    } catch (error) {
      console.error('שגיאה בתהליך מחיקת תמונה:', error);
      throw error; // זרוק את השגיאה הלאה כדי ש-handleDeleteSelected יוכל לטפל בה
    }
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
      onImagePress(gallery[index]);
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

            // הכנס את כל ה-URLs של התמונות שנבחרו למחיקה
            for (const index of Array.from(selectedImages)) {
              const imageUrl = gallery[index];
              if (imageUrl) {
                toDeleteUrls.push(imageUrl);
                // הוסף את המחיקה ל-Promises
                deletePromises.push(deleteImageRecordFromServer(imageUrl));
              }
            }

            try {
              // המתן שכל פעולות המחיקה יסתיימו
              await Promise.all(deletePromises);

              // עדכן את הגלריה המקומית ואת המצב
              onDeleteImages(toDeleteUrls); // קורא לפונקציה מ-profile.tsx
              setSelectedImages(new Set());
              setLongPressActive(false);
              Alert.alert('הצלחה', 'התמונות נמחקו בהצלחה!');

            } catch (error) {
              console.error('שגיאה במחיקת תמונות:', error);
              Alert.alert('שגיאה', 'אירעה שגיאה במחיקת התמונות. אנא נסה שוב.');
            }
          }
        }
      ]
    );
  };

  const renderGridItem = ({ item, index }: ListRenderItemInfo<string>) => {
    const isSelected = selectedImages.has(index);

    return (
      <TouchableOpacity
        style={[
          styles.galleryItem,
          { backgroundColor: theme.colors.surface },
          isSelected && { opacity: 0.7 }
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

        {/* Selection overlay */}
        {isSelected && (
          <View style={styles.selectionOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.selectionGradient}
            />
            <View style={[styles.selectionIndicator, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          </View>
        )}

        {/* Image stats overlay */}
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
      <View style={styles.headerLeft}>
        {/* הוסרו כפתורי viewMode */}
      </View>

      <View style={styles.headerCenter}>
        <Text style={[styles.galleryCount, { color: theme.colors.text }]}>
          {gallery.length} תמונות
        </Text>
      </View>

      <View style={styles.headerRight}>
        {selectedImages.size > 0 || longPressActive ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={handleDeleteSelected}
            accessibilityLabel={`מחק ${selectedImages.size} תמונות שנבחרו`} // נגישות
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.actionButtonText}>{selectedImages.size}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePickImage}
            disabled={uploading}
            accessibilityLabel={uploading ? "מעלה תמונה" : "הוסף תמונה חדשה"} // נגישות
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
          accessibilityLabel="הוסף תמונה ראשונה" // נגישות
        >
          <Ionicons name="camera" size={20} color="white" />
          <Text style={styles.emptyButtonText}>הוסף תמונה ראשונה</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  if (gallery.length === 0) {
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
        data={gallery}
        keyExtractor={(_, index) => index.toString()}
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
          accessibilityLabel="בטל בחירה של תמונות" // נגישות
        >
          <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={styles.blurButton}>
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
});