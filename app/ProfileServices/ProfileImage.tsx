// ProfileImage.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  profilePic: string | null;
  username: string;
  galleryLength: number;
  onChangeImage: (uri: string) => void;
}

const ProfileImage: React.FC<Props> = ({
  profilePic,
  username,
  galleryLength,
  onChangeImage,
}) => {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      onChangeImage(uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileImageWrapper}>
        <Image
          source={
            profilePic
              ? { uri: profilePic }
              : require('../../assets/images/avatar-placeholder.psd')
          }
          style={styles.profileImage}
        />
        <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
          <Ionicons name="create-outline" size={18} color="white" />
        </TouchableOpacity>
      </View>
      <Text style={styles.username}>{username}</Text>
      <Text style={styles.imageCount}>{galleryLength} תמונות בגלריה</Text>
    </View>
  );
};

export default ProfileImage;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#FF6F00',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    backgroundColor: '#FF6F00',
    borderRadius: 12,
    padding: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  username: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  imageCount: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
});
