// app/ProfileServices/Gallery.tsx - Enhanced Version
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react'; // הוספת useRef
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal, // הוספת Modal
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../../firebaseConfig';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window'); // הוספת SCREEN_HEIGHT
const GALLERY_IMAGE_SIZE = (SCREEN_WIDTH - 32 - 4) / 3; // 16px margin on each side, 2px gap

type Props = {
  gallery: string[];
  onAddImage: (uri: string) => void;
  onDeleteImages: (deletedImageUrls: string[]) => void; 
};

export default function Gallery({ gallery, onAddImage, onDeleteImages}: Props) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalVisible, setModalVisible] = useState(false); // מצב המודל לתצוגת תמונה
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null); // ה-URI של התמונה הנבחרת למודל
  const [longPressActive, setLongPressActive] = useState(false); // מצב המציין אם לחיצה ארוכה פעילה

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
        await onAddImage(uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את התמונה');
    } finally {
      setUploading(false);
    }
  };

  const deleteImageFromServer = async (imageUrl: string) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('משתמש לא מחובר'); 
    }

    try {
      const response = await fetch(`https://tripping-app.onrender.com/delete-image`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, image_url: imageUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`מחיקת תמונה נכשלה: ${errorText}`);
      }
    } catch (error) {
      throw error; 
    }
  };

  const handleImagePress = (index: number) => {
    if (longPressActive) { // אם לחיצה ארוכה פעילה, המשך עם לוגיקת הבחירה
      const newSelected = new Set(selectedImages);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedImages(newSelected);
    } else { // אחרת, הצג את התמונה במודל
      setSelectedImageUri(gallery[index]);
      setModalVisible(true);
    }
  };

  const handleLongPress = (index: number) => {
    // הפעלת מצב לחיצה ארוכה וסימון התמונה
    setLongPressActive(true);
    const newSelected = new Set(selectedImages);
    if (!newSelected.has(index)) { // סמן את התמונה רק אם היא לא מסומנת כבר
      newSelected.add(index);
      setSelectedImages(newSelected);
    }
  };


  const handleDeleteSelected = async () => {
    Alert.alert(
      'מחיקת תמונות',
      `האם אתה בטוח שתרצה למחוק ${selectedImages.size} תמונות?`,
      [
        { text: 'ביטול', style: 'cancel' },
        { 
          text: 'מחק', 
          style: 'destructive',
          onPress: async () => {
            const toDeleteUrls: string[] = []; 
            const deletePromises: Promise<void>[] = [];

            for (const index of Array.from(selectedImages)) {
              const imageUrl = gallery[index];
              if (imageUrl) {
                toDeleteUrls.push(imageUrl);
                deletePromises.push(deleteImageFromServer(imageUrl));
              }
            }

            try {
              await Promise.all(deletePromises)
              
              onDeleteImages(toDeleteUrls); 
              setSelectedImages(new Set()); 
              setLongPressActive(false); // יציאה ממצב לחיצה ארוכה לאחר מחיקה
              Alert.alert('הצלחה', 'התמונות נמחקו בהצלחה');

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
        onLongPress={() => handleLongPress(index)} // שימוש ב-handleLongPress
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
              <Text style={styles.statText}>24</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={12} color="white" />
              <Text style={styles.statText}>8</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.galleryHeader, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'grid' && { backgroundColor: theme.colors.primary + '20' }
          ]}
          onPress={() => setViewMode('grid')}
        >
          <Ionicons 
            name="grid" 
            size={20} 
            color={viewMode === 'grid' ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'list' && { backgroundColor: theme.colors.primary + '20' }
          ]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons 
            name="list" 
            size={20} 
            color={viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.headerCenter}>
        <Text style={[styles.galleryCount, { color: theme.colors.text }]}>
          {gallery.length} תמונות
        </Text>
      </View>

      <View style={styles.headerRight}>
        {selectedImages.size > 0 || longPressActive ? ( // הצג כפתור איפוס בחירה או מחיקה אם יש תמונות שנבחרו או מצב לחיצה ארוכה פעיל
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={handleDeleteSelected}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.actionButtonText}>{selectedImages.size}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="add" size={16} color="white" />
                <Text style={styles.addButtonText}>הוסף</Text>
              </>
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
        >
          <Ionicons name="camera" size={20} color="white" />
          <Text style={styles.emptyButtonText}>הוסף תמונה ראשונה</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  // במידה ואין תמונות, עדיין מציגים את ההדר ואת מצב הריק
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
        numColumns={viewMode === 'grid' ? 3 : 1}
        key={viewMode} // Force re-render when view mode changes
        renderItem={renderGridItem}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
      />
      
      {/* כפתור לביטול בחירה כשמצב לחיצה ארוכה פעיל או תמונות נבחרו */}
      {(selectedImages.size > 0 || longPressActive) && (
        <TouchableOpacity
          style={styles.floatingClearButton}
          onPress={() => {
            setSelectedImages(new Set());
            setLongPressActive(false); // ביטול מצב לחיצה ארוכה
          }}
        >
          <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={styles.blurButton}>
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </BlurView>
        </TouchableOpacity>
      )}

      {/* Modal for displaying single image */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          setSelectedImageUri(null); // איפוס התמונה שנבחרה בעת סגירה
        }}
      >
        <View style={styles.modalOverlay}>
          <BlurView style={styles.modalBlur} intensity={80} tint={theme.isDark ? 'dark' : 'light'} />
          <View style={styles.modalContent}>
            {selectedImageUri && <Image source={{ uri: selectedImageUri }} style={styles.modalImage} resizeMode="contain" />}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setModalVisible(!modalVisible);
                setSelectedImageUri(null);
              }}
            >
              <Ionicons name="close-circle" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    minWidth: 80,
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
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
  // סגנונות חדשים למודל התצוגה המוגדלת
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // רקע שחור שקוף למילוי המסך
  },
  modalBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'white', // ייתכן שתרצה לשנות זאת לצבע רקע של התמה
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH * 0.8, // 80% מרוחב המסך
    maxHeight: SCREEN_HEIGHT * 0.45, // 70% מגובה המסך
    position: 'relative', // כדי למקם את כפתור הסגירה ביחס אליו
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
});