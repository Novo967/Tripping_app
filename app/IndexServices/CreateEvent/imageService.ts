// app/IndexServices/CreateEvent/imageService.ts
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Alert } from 'react-native';
import { app } from '../../../firebaseConfig';

export class ImageService {
    private static storage = getStorage(app);

    static async pickImage(): Promise<string | null> {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('הרשאה נדרשת', 'נדרשת הרשאת גלריה כדי לבחור תמונות.');
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return null;
            }

            const selectedAsset = result.assets[0];
            if (!selectedAsset.uri) {
                Alert.alert('שגיאה', 'לא ניתן לגשת לתמונה שנבחרה');
                return null;
            }

            return selectedAsset.uri;
        } catch (error: any) {
            console.error('Error picking image:', error);
            Alert.alert('שגיאה', `בחירת התמונה נכשלה: ${error.message || 'שגיאה לא ידועה'}`);
            return null;
        }
    }

    static async uploadImage(uri: string, eventTitle: string): Promise<string | null> {
        try {
            if (!uri || uri.trim() === '') {
                throw new Error('URI של התמונה לא חוקי');
            }

            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error('לא ניתן לטעון את התמונה');
            }

            const blob = await response.blob();

            if (blob.size > 10 * 1024 * 1024) {
                throw new Error('התמונה גדולה מדי (מקסימום 10MB)');
            }

            const sanitizedEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_');
            const fileRef = ref(this.storage, `group_images/${sanitizedEventTitle}/groupImage_${Date.now()}.jpg`);

            await uploadBytes(fileRef, blob);
            const downloadURL = await getDownloadURL(fileRef);

            return downloadURL;
        } catch (error: any) {
            console.error('Error uploading image:', error);
            Alert.alert('שגיאה', `העלאת התמונה נכשלה: ${error.message || 'שגיאה לא ידועה'}`);
            return null;
        }
    }
}