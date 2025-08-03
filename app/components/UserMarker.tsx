import { Ionicons } from '@expo/vector-icons';
import {
  getDownloadURL,
  getStorage,
  listAll, // ייבוא הפונקציה listAll כדי לרשום קבצים בתיקייה
  ref
} from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { app } from '../../firebaseConfig';

interface UserMarkerProps {
  user: {
    uid: string;
    latitude: number;
    longitude: number;
    profile_image?: string;
    username?: string;
  };
  currentUserUid?: string;
  onPress: (user: any) => void;
}

const storage = getStorage(app);

const UserMarker: React.FC<UserMarkerProps> = ({ user, currentUserUid, onPress }) => {
  const [shouldTrackViewChanges, setShouldTrackViewChanges] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const isCurrentUser = user.uid === currentUserUid;

  useEffect(() => {
    const fetchLatestImageUrl = async () => {
      // אם אין UID של משתמש, אין מאיפה לשלוף
      if (!user.uid) {
        setIsImageLoading(false);
        setImageUrl(null);
        setShouldTrackViewChanges(false);
        return;
      }

      setIsImageLoading(true);
      setShouldTrackViewChanges(true);

      try {
        // יצירת הפניה לתיקייה של המשתמש ב-Firebase Storage
        const folderRef = ref(storage, `profile_images/${user.uid}`);
        
        // קבלת רשימה של כל הקבצים בתיקייה
        const result = await listAll(folderRef);

        if (result.items.length === 0) {
          // אם אין קבצים בתיקייה, נשתמש באייקון ברירת מחדל
          setImageUrl(null);
          return;
        }

        // מיון הקבצים לפי שם כדי למצוא את העדכני ביותר.
        // אנו מניחים ששם הקובץ מכיל חותמת זמן כלשהי
        const sortedItems = result.items.sort((a, b) => b.name.localeCompare(a.name));
        const latestFileRef = sortedItems[0];
        
        // קבלת ה-URL הציבורי של התמונה העדכנית ביותר
        const url = await getDownloadURL(latestFileRef);
        setImageUrl(url);

      } catch (e) {
        console.warn(`שגיאה בשליפת תמונה עבור משתמש ${user.uid}:`, e);
        setImageUrl(null);
      } finally {
        setIsImageLoading(false);
      }
    };

    fetchLatestImageUrl();
  }, [user.uid]);

  const handleImageLoadEnd = () => {
    setIsImageLoading(false);
    setShouldTrackViewChanges(false);
  };

  const handleImageError = (e: any) => {
    console.warn(`שגיאה בטעינת התמונה עבור משתמש ${user.uid}:`, e.nativeEvent.error);
    setIsImageLoading(false);
    setShouldTrackViewChanges(false);
    setImageUrl(null);
  };

  if (isCurrentUser) {
    return null;
  }

  return (
    <Marker
      key={user.uid}
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={() => onPress(user)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={shouldTrackViewChanges}
    >
      {imageUrl ? (
        <View style={styles.imageContainer}>
          {isImageLoading && (
            <ActivityIndicator size="small" color="#3A8DFF" style={StyleSheet.absoluteFillObject} />
          )}
          <Image
            source={{ uri: imageUrl }}
            style={styles.profileMarker}
            resizeMode="cover"
            onLoadEnd={handleImageLoadEnd}
            onError={handleImageError}
          />
        </View>
      ) : (
        <View style={styles.defaultMarkerIcon}>
          <Ionicons name="person" size={24} color="#3A8DFF" />
        </View>
      )}
    </Marker>
  );
};

const styles = StyleSheet.create({
  profileMarker: {
    width: 36,
    height: 36,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  defaultMarkerIcon: {
    width: 35,
    height: 35,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageContainer: {
    width: 36,
    height: 36,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(UserMarker);
