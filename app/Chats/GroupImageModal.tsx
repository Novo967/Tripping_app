// app/GroupImageModal.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GroupImageModalProps {
  groupImageUrl: string | null;
  isUploading: boolean;
  onSelectNewImage: (uri: string) => void;
  onClose: () => void;
}

const GroupImageModal = ({ groupImageUrl, isUploading, onSelectNewImage, onClose }: GroupImageModalProps) => {
  const insets = useSafeAreaInsets();
  const [isPicking, setIsPicking] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // מצב חדש לשליטה בנראות סרגל הכלים התחתון

  const openCamera = async () => {
    setIsPicking(true);
    setIsEditMode(false); // סגור מצב עריכה
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'נדרשת הרשאת מצלמה כדי לצלם תמונות.');
      setIsPicking(false);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      onSelectNewImage(result.assets[0].uri);
    } else if (result.canceled) {
      console.log('User cancelled the image picker.');
    } else {
      console.log('Image picker returned with no assets.');
    }
    setIsPicking(false);
  };

  const openGallery = async () => {
    setIsPicking(true);
    setIsEditMode(false); // סגור מצב עריכה
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'נדרשת הרשאת גלריה כדי לבחור תמונות.');
      setIsPicking(false);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      onSelectNewImage(result.assets[0].uri);
    } else if (result.canceled) {
      console.log('User cancelled the image picker.');
    } else {
      console.log('Image picker returned with no assets.');
    }
    setIsPicking(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)} style={styles.editButton}>
          <Ionicons name="create-outline" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.imageContainer}>
        {groupImageUrl ? (
          <Image
            source={{ uri: groupImageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="people" size={150} color="#E0E0E0" />
            <Text style={styles.placeholderText}>אין תמונת קבוצה</Text>
          </View>
        )}
      </View>
      {isEditMode && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
          <Text style={styles.bottomBarTitle}>החלף תמונה</Text>
          {isUploading || isPicking ? (
            <ActivityIndicator size="large" color="#3A8DFF" />
          ) : (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity onPress={openCamera} style={styles.bottomButton}>
                <Ionicons name="camera-outline" size={32} color="#FFFFFF" />
                <Text style={styles.buttonText}>מצלמה</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openGallery} style={styles.bottomButton}>
                <Ionicons name="image-outline" size={32} color="#FFFFFF" />
                <Text style={styles.buttonText}>גלריה</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default GroupImageModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
  },
  editButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#E0E0E0',
    fontSize: 18,
    marginTop: 20,
  },
  bottomBar: {
    backgroundColor: '#222222',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomBarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  bottomButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
});