// app/ProfileServices/ProfileImage.tsx - Enhanced Version
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../ProfileServices/ThemeContext';

interface Props {
  profilePic: string | null;
  username: string;
  galleryLength: number;
  onChangeImage: (uri: string) => void;
  onImagePress: (imageUri: string) => void;
  gallery: string[];
  onAddImage: (uri: string) => Promise<void>;
  onDeleteImages: (deletedImageUrls: string[]) => void
};

const ProfileImage: React.FC<Props> = ({
  profilePic,
  username,
  galleryLength,
  onChangeImage,
}) => {
  const { theme } = useTheme();
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const pickImage = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('הרשאה נדרשת', 'אנחנו צריכים הרשאה לגשת לגלריה שלך');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
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
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את התמונה');
      setImageLoading(false);
    }
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

  return (
    <View style={styles.container}>
      <View style={styles.profileImageWrapper}>
        {renderProfileImage()}
        
        <TouchableOpacity 
          style={[styles.editIcon, { backgroundColor: theme.colors.primary }]} 
          onPress={pickImage}
          disabled={imageLoading}
        >
          <Ionicons 
            name={imageLoading ? "hourglass" : "camera"} 
            size={18} 
            color="white" 
          />
        </TouchableOpacity>
        
        {/* Online status indicator */}
        <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]} />
      </View>
      
      <Text style={[styles.username, { color: theme.colors.text }]}>
        {username || 'משתמש אלמוני'}
      </Text>

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
  onlineIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
});