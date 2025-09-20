// app/ProfileServices/ProfileImage.tsx - Enhanced Version
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../ThemeContext';

interface Props {
  profilePic: string | null;
  username: string;
  galleryLength: number;
  onChangeImage: (uri: string) => void;
  onImagePress: (imageUri: string) => void;
  gallery: string[];
  onAddImage: (uri: string) => Promise<void>;
  onDeleteImages: (deletedImageUrls: string[]) => void;
  onRemoveProfilePic?: () => void;
  isEditing: boolean;
}

const ProfileImage: React.FC<Props> = ({
  profilePic,
  username,
  galleryLength,
  onChangeImage,
  onRemoveProfilePic,
  isEditing,
}) => {
  const { theme } = useTheme();
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'נדרשת הרשאת מצלמה כדי לצלם תמונה');
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'נדרשת הרשאת גלריה כדי לבחור תמונה');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
        exif: false,
        cameraType: ImagePicker.CameraType.back, // Use back camera to avoid mirror effect
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageLoading(true);
        setImageError(false);
        onChangeImage(uri);
        setImageLoading(false);
        setShowActionSheet(false); // Close only on success
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לצלם תמונה');
      setImageLoading(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square crop for circle display
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageLoading(true);
        setImageError(false);
        onChangeImage(uri);
        setImageLoading(false);
        setShowActionSheet(false); // Close only on success
      }
      // Don't close ActionSheet if user cancels - they might want to try again
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את התמונה');
      setImageLoading(false);
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'הסרת תמונה',
      'האם אתה בטוח שברצונך להסיר את תמונת הפרופיל?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'הסר',
          style: 'destructive',
          onPress: () => {
            setImageError(false);
            setImageLoading(false);
            if (onRemoveProfilePic) {
              onRemoveProfilePic();
            }
            setShowActionSheet(false); // Close after removal
          },
        },
      ]
    );
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const renderProfileImage = () => {
    if (imageError || !profilePic) {
      return (
        <View style={[styles.placeholderContainer, { backgroundColor: theme.colors.surface }]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={styles.placeholderGradient}
          >
            <Text style={styles.placeholderText}>
              {username ? username.charAt(0).toUpperCase() : '?'}
            </Text>
          </LinearGradient>
        </View>
      );
    }

    return (
      <>
        <Image
          source={{ 
            uri: profilePic,
            cache: Platform.OS === 'ios' ? 'force-cache' : 'default'
          }}
          style={[styles.profileImage, { borderColor: theme.colors.primary }]}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode="cover"
        />
        
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
      </>
    );
  };

  const ActionSheet = () => (
    <Modal
      visible={showActionSheet}
      transparent
      animationType="slide"
      onRequestClose={() => setShowActionSheet(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.actionSheet, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.actionSheetHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.actionSheetTitle, { color: theme.colors.text }]}>
              בחר פעולה
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: theme.colors.border }]}
            onPress={takePhoto}
          >
            <Ionicons name="camera" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
              צלם תמונה
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: theme.colors.border }]}
            onPress={pickFromGallery}
          >
            <Ionicons name="images" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
              בחר מהגלריה
            </Text>
          </TouchableOpacity>

          {profilePic && (
            <TouchableOpacity
              style={[styles.actionButton, { borderBottomColor: theme.colors.border }]}
              onPress={removePhoto}
            >
              <Ionicons name="trash" size={24} color={theme.colors.error} />
              <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                הסר תמונה
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowActionSheet(false)}
          >
            <Text style={styles.cancelButtonText}>ביטול</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.profileImageWrapper}>
        {renderProfileImage()}
        {isEditing && (
          <TouchableOpacity 
            style={[styles.editIcon, { backgroundColor: theme.colors.primary }]} 
            onPress={() => setShowActionSheet(true)}
            disabled={imageLoading}
          >
            <Ionicons 
              name={imageLoading ? "hourglass" : "pencil"} 
              size={18} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={[styles.username, { color: theme.colors.text }]}>
        {username || 'משתמש אלמוני'}
      </Text>

      <ActionSheet />
    </View>
  );
};

export default ProfileImage;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 20,
    padding: 10,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  actionSheetHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 16,
    flex: 1,
    textAlign: 'right',
  },
  cancelButton: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});