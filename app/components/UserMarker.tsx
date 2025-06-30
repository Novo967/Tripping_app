import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'; // Added ActivityIndicator
import { Marker } from 'react-native-maps';

interface UserMarkerProps {
  user: {
    uid: string;
    latitude: number;
    longitude: number;
    profile_image?: string;
    username?: string;
  };
  onPress: (user: any) => void;
}

const UserMarker: React.FC<UserMarkerProps> = ({ user, onPress }) => {
  // shouldTrackViewChanges מתחיל ב-true כדי לאפשר למפה לצייר את המרקר עם התמונה ברגע שהיא זמינה.
  const [shouldTrackViewChanges, setShouldTrackViewChanges] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(false); // מצב חדש לניהול טעינת תמונה

  useEffect(() => {
    if (user.profile_image) {
      // אם יש תמונת פרופיל, נתחיל לעקוב ונסמן שהתמונה בטעינה
      setIsImageLoading(true);
      setShouldTrackViewChanges(true); // ודא שמתחילים לעקוב

      // לא צריך setTimeout כאן, כי onLoadEnd/onError יטפלו בזה.
      // אם התמונה נטענת מהר מהקאש, onLoadEnd יקרה כמעט מיידית.
    } else {
      // אם אין תמונת פרופיל, התוכן סטטי, אז נפסיק לעקוב אחרי עיכוב קצר
      // זה מבטיח שהאייקון יופיע בלי ריצוד.
      const timer = setTimeout(() => {
        setShouldTrackViewChanges(false);
      }, 100); // עיכוב קצרצר (100ms) מספיק לרינדור אייקון סטטי
      return () => clearTimeout(timer); // ניקוי הטיימר
    }
  }, [user.profile_image]); // תלוי רק בשינוי תמונת הפרופיל

  const handleImageLoadEnd = () => {
    // התמונה נטענה בהצלחה, אפשר להפסיק לעקוב.
    setIsImageLoading(false); // סימון שהתמונה סיימה להיטען
  };

  const handleImageError = (e: any) => {
    console.warn(`Error loading image for user ${user.uid}:`, e.nativeEvent.error);
    // גם אם יש שגיאה, נפסיק לעקוב כדי למנוע ריצוד מיותר.
    // אפשר להגדיר כאן גם fall-back לאייקון ברירת המחדל אם רוצים.
    setIsImageLoading(false); // סימון שהטעינה הסתיימה בשגיאה
  };

  return (
    <Marker
      key={user.uid}
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={() => onPress(user)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={shouldTrackViewChanges}
    >
      {user.profile_image ? (
        <View style={styles.imageContainer}>
          {/* מציגים אינדיקטור טעינה אם התמונה עדיין בטעינה */}
          {isImageLoading && (
            <ActivityIndicator size="small" color="#FF6F00" style={StyleSheet.absoluteFillObject} />
          )}
          <Image
            source={{ uri: user.profile_image }}
            style={styles.profileMarker}
            resizeMode="cover"
            onLoadEnd={handleImageLoadEnd}
            onError={handleImageError}
            // opacity: isImageLoading ? 0 : 1 יאפשר טעינה חלקה יותר (התמונה "תופיע" ברגע שהיא מוכנה)
          />
        </View>
      ) : (
        <View style={styles.defaultMarkerIcon}>
          <Ionicons name="person" size={24} color="#FF6F00" />
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
    width: '100%', // התמונה תתפוס את כל הקונטיינר
    height: '100%',
  },
});

export default React.memo(UserMarker);