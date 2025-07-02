// app/ProfileServices/Gallery.tsx - Enhanced Version
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
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
import { auth } from '../../firebaseConfig';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_IMAGE_SIZE = (SCREEN_WIDTH - 32 - 4) / 3; // 16px margin on each side, 2px gap

type Props = {
  gallery: string[];
  onAddImage: (uri: string) => void;
};

export default function Gallery({ gallery, onAddImage }: Props) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
    Alert.alert('שגיאה', 'משתמש לא מחובר');
    return;
  }

  try {
    const response = await fetch(`https://tripping-app.onrender.com/delete-image`, {
      method: 'POST',  // שים לב כאן POST ולא DELETE
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, image_url: imageUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`מחיקת תמונה נכשלה: ${errorText}`);
    }
  } catch (error) {
    Alert.alert('שגיאה');
    console.error(error);
  }
};


  const handleImagePress = (index: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedImages(newSelected);
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
          const toDelete = [...selectedImages];
          const updatedGallery = [...gallery];

          // חשוב למחוק מהשרת קודם ואז מהגלריה המקומית
          for (const index of toDelete) {
            const imageUrl = gallery[index];
            await deleteImageFromServer(imageUrl);
          }

          // מסיר מהגלריה המקומית את התמונות שנמחקו
          // כדאי להסיר מהסוף להתחלה כדי לא לשבור אינדקסים
          toDelete.sort((a, b) => b - a).forEach(index => {
            updatedGallery.splice(index, 1);
          });

          setSelectedImages(new Set());
          // כאן יעדכן את הגלריה המקומית אחרי המחיקה
          // אם יש לך setGallery:
          // אם אין, תוכל לקרוא ל-onAddImage('refresh') אבל זה פחות ברור
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
        onLongPress={() => handleImagePress(index)}
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
        {selectedImages.size > 0 ? (
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
      
      {selectedImages.size > 0 && (
        <TouchableOpacity
          style={styles.floatingClearButton}
          onPress={() => setSelectedImages(new Set())}
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
  });