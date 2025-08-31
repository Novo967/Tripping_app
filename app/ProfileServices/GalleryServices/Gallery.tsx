// app/IndexServices/GalleyrServices/Gallery.tsx

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../ProfileServices/ThemeContext';
import { LikeableImage } from './LikeableImage';
import { useGallery } from './useGallery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_IMAGE_SIZE = (SCREEN_WIDTH - 32 - 4) / 3;

type Props = {
  onImagePress: (imageUri: string) => void;
};

export default function Gallery({ onImagePress }: Props) {
  const { theme } = useTheme();
  const {
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
  } = useGallery();

  const handleItemPress = (index: number, isAddButton: boolean) => {
    if (isAddButton) {
      handlePickImage();
      return;
    }

    if (longPressActive) {
      handleToggleSelect(index);
    } else {
      onImagePress(firebaseGalleryImages[index]);
    }
  };

  const handleLongPress = (index: number, isAddButton: boolean) => {
    if (isAddButton) return;
    handleLongPressStart(index);
  };

  const renderAddButton = () => (
    <TouchableOpacity
      style={[
        styles.galleryItem,
        styles.addImageButton,
        {
          backgroundColor: theme.isDark ? '#1F2937' : '#F8FAFF',
          borderColor: theme.isDark ? '#374151' : '#E5E7EB',
        },
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

    return (
      <View style={[styles.galleryItem, isSelected && { opacity: 0.7 }]}>
        <LikeableImage
          imageUri={item}
          imageIndex={index}
          profileOwnerId={profileOwnerId}
          onPress={() => handleItemPress(index, false)}
          showLikeButton={!longPressActive}
          onPressDisabled={longPressActive}
          style={styles.image}
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
                { backgroundColor: '#3A8DFF' },
              ]}
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          </View>
        )}
      </View>
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
          onPress={clearSelection}
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
