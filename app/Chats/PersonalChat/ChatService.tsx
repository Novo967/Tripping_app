import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { app } from '../../../firebaseConfig';

const storage = getStorage(app);

export const handleImagePicker = (
  currentUid: string | undefined,
  chatId: string | undefined,
  sendMessage: (imageUrl: string) => Promise<void>
) => {
  const onImageSelected = (uri: string) => {
    if (currentUid && chatId) {
      uploadImageAndSendMessage(uri, currentUid, chatId, sendMessage);
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['ביטול', 'מצלמה', 'גלריה'],
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        if (buttonIndex === 1) openCamera(onImageSelected);
        if (buttonIndex === 2) openGallery(onImageSelected);
      }
    );
  } else {
    Alert.alert('בחר תמונה', '', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מצלמה', onPress: () => openCamera(onImageSelected) },
      { text: 'גלריה', onPress: () => openGallery(onImageSelected) },
    ]);
  }
};

const openCamera = async (onImageSelected: (uri: string) => void) => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Camera permission is required to take photos.');
    return;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (!result.canceled && result.assets && result.assets[0]) {
    onImageSelected(result.assets[0].uri);
  }
};

const openGallery = async (onImageSelected: (uri: string) => void) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Media library permission is required to pick photos.');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (!result.canceled && result.assets && result.assets[0]) {
    onImageSelected(result.assets[0].uri);
  }
};

export const uploadImageAndSendMessage = async (
  localUri: string,
  currentUid: string,
  chatId: string,
  sendMessage: (imageUrl: string) => Promise<void>
) => {
  if (!localUri || !currentUid) return;
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 800 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    const response = await fetch(manipResult.uri);
    const blob = await response.blob();
    const storagePath = `chat_images/${chatId}/${Date.now()}_${currentUid}.jpg`;
    const imageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(imageRef, blob);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.error('שגיאה בהעלאת התמונה:', error);
        Alert.alert('שגיאה', 'אירעה שגיאה בהעלאת התמונה. נסה שוב.');
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        console.log('File available at', downloadURL);
        sendMessage(downloadURL);
      }
    );
  } catch (e) {
    console.error('שגיאה בתהליך העלאת התמונה:', e);
    Alert.alert('שגיאה', 'אירעה שגיאה בתהליך העלאת התמונה. נסה שוב.');
  }
};