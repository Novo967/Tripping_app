// Gallery.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ListRenderItemInfo,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const GALLERY_IMAGE_SIZE = Dimensions.get('window').width / 3 - 1;

type Props = {
  gallery: string[];
  onAddImage: (uri: string) => void;
};

export default function Gallery({ gallery, onAddImage }: Props) {
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      onAddImage(uri);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<string>) => (
    <TouchableOpacity style={styles.galleryItemContainer}>
      <Image source={{ uri: item }} style={styles.galleryImage} />
      <View style={styles.imageOverlay}>
        <Ionicons name="heart" size={16} color="white" />
        <Ionicons name="chatbubble" size={16} color="white" style={{ marginLeft: 8 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      <View style={styles.galleryHeader}>
        <View style={styles.galleryTabs}>
          <TouchableOpacity style={[styles.galleryTab, styles.activeTab]}>
            <Ionicons name="grid" size={24} color="#FF6F00" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryTab}>
            <Ionicons name="bookmark" size={24} color="#999" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handlePickImage} style={styles.addPhotoButton}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={gallery}
        keyExtractor={(_, i) => i.toString()}
        numColumns={3}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#efefef',
  },
  galleryTabs: {
    flexDirection: 'row',
  },
  galleryTab: {
    padding: 8,
    marginRight: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6F00',
  },
  addPhotoButton: {
    backgroundColor: '#FF6F00',
    borderRadius: 20,
    padding: 8,
  },
  galleryItemContainer: {
    width: GALLERY_IMAGE_SIZE,
    height: GALLERY_IMAGE_SIZE,
    margin: 0.5,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    opacity: 0.8,
  },
});
