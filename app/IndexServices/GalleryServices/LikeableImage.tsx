import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { arrayRemove, arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../../firebaseConfig';

interface LikeableImageProps {
  imageUri: string;
  imageIndex: number;
  profileOwnerId: string;
  style?: any;
  onPress?: () => void;
  showLikeButton?: boolean;
  onPressDisabled?: boolean;
}

export const LikeableImage: React.FC<LikeableImageProps> = ({
  imageUri,
  imageIndex,
  profileOwnerId,
  style,
  onPress,
  showLikeButton = true,
  onPressDisabled = false,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    console.log('LikeableImage: הקומפוננטה נטענה. מתחיל לשלוף נתוני לייקים.');
    fetchLikeData();
  }, [imageIndex, profileOwnerId]);

  const fetchLikeData = async () => {
    console.log(`LikeableImage: מנסה לשלוף נתוני לייק עבור תמונה מספר ${imageIndex} של המשתמש ${profileOwnerId}.`);
    try {
      const imageDocRef = doc(db, 'imageLikes', `${profileOwnerId}_${imageIndex}`);
      const imageDoc = await getDoc(imageDocRef);
      
      if (imageDoc.exists()) {
        const data = imageDoc.data();
        const likes = data.likes || [];
        setLikeCount(likes.length);
        setIsLiked(currentUserId ? likes.includes(currentUserId) : false);
        console.log(`LikeableImage: מסמך הלייקים נמצא. כמות לייקים: ${likes.length}. האם המשתמש הנוכחי עשה לייק? ${isLiked}.`);
      } else {
        console.log('LikeableImage: מסמך הלייקים לא נמצא. אין לייקים לתמונה זו.');
      }
    } catch (error) {
      console.error('LikeableImage: שגיאה בשליפת נתוני לייק:', error);
    }
  };

  const handleLike = async () => {
    console.log('LikeableImage: לחיצה על כפתור הלייק.');
    if (!currentUserId) {
      console.log('LikeableImage: אין משתמש מחובר. מציג התראה.');
      Alert.alert('שגיאה', 'עליך להתחבר כדי לאהוב תמונות');
      return;
    }

    if (loading) return;

    setLoading(true);

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
    console.log(`LikeableImage: מצב הלייק השתנה ל: ${newIsLiked}. מספר הלייקים החדש: ${newIsLiked ? likeCount + 1 : likeCount - 1}.`);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    const imageDocRef = doc(db, 'imageLikes', `${profileOwnerId}_${imageIndex}`);

    try {
      const existingDoc = await getDoc(imageDocRef);
      console.log('LikeableImage: מנסה לבצע פעולת Firestore.');

      if (!existingDoc.exists()) {
        if (newIsLiked) {
          console.log('LikeableImage: המסמך לא קיים, יוצר מסמך חדש עם לייק.');
          await setDoc(imageDocRef, {
            likes: [currentUserId],
            imageUri,
            profileOwnerId,
            imageIndex,
            lastUpdated: new Date().toISOString(),
          });
          if (profileOwnerId !== currentUserId) {
            console.log('LikeableImage: שולח התראת לייק לבעל הפרופיל.');
            await sendLikeNotification(profileOwnerId, currentUserId);
          }
        }
      } else {
        if (newIsLiked) {
          console.log('LikeableImage: המסמך קיים, מוסיף לייק (arrayUnion).');
          await updateDoc(imageDocRef, {
            likes: arrayUnion(currentUserId),
            lastUpdated: new Date().toISOString(),
          });
          if (profileOwnerId !== currentUserId) {
            console.log('LikeableImage: שולח התראת לייק לבעל הפרופיל.');
            await sendLikeNotification(profileOwnerId, currentUserId);
          }
        } else {
          console.log('LikeableImage: המסמך קיים, מסיר לייק (arrayRemove).');
          await updateDoc(imageDocRef, {
            likes: arrayRemove(currentUserId),
            lastUpdated: new Date().toISOString(),
          });
        }
      }
      console.log('LikeableImage: פעולת Firestore הושלמה בהצלחה.');
    } catch (error) {
      console.error('LikeableImage: שגיאה בעדכון לייק:', error);
      setIsLiked(!newIsLiked);
      setLikeCount((prev) => (newIsLiked ? prev - 1 : prev + 1));
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הלייק');
    } finally {
      setLoading(false);
      console.log('LikeableImage: הסתיימה תהליך הטיפול בלייק.');
    }
  };

  const sendLikeNotification = async (profileOwnerId: string, likerId: string) => {
    console.log('LikeableImage: מתחיל תהליך שליחת התראה.');
    try {
      // Get the liker's username (person who liked the image)
      const likerDocRef = doc(db, 'users', likerId);
      const likerDoc = await getDoc(likerDocRef);
      if (!likerDoc.exists()) {
        console.warn("LikeableImage: מסמך המשתמש שעשה לייק לא נמצא.");
        return;
      }
      const likerUsername = likerDoc.data().username;

      // Get the profile owner's push token (person who will receive the notification)
      const ownerDocRef = doc(db, 'users', profileOwnerId);
      const ownerDoc = await getDoc(ownerDocRef);
      if (!ownerDoc.exists()) {
        console.warn("LikeableImage: מסמך בעל הפרופיל לא נמצא.");
        return;
      }
      
      const ownerPushToken = ownerDoc.data().expoPushToken || ownerDoc.data().pushToken;

      if (ownerPushToken) {
        console.log('LikeableImage: נמצא טוקן לשליחת התראה.');
        
        // Send notification using Expo's push notification service
        const notificationPayload = {
          to: ownerPushToken,
          sound: 'default',
          title: 'קיבלת לייק חדש!',
          body: `${likerUsername} אהב את התמונה שלך`,
          data: { 
            type: 'image_like',
            profileOwnerId, 
            imageIndex, 
            likerId 
          },
        };
        
        console.log('LikeableImage: שולח התראה לשרת Expo Push Notifications.');
        
        // Send to Expo's push notification service
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload),
        });

        const responseData = await response.json();
        
        if (response.ok) {
          console.log('LikeableImage: ההתראה נשלחה בהצלחה.', responseData);
        } else {
          console.error('LikeableImage: שגיאה בשליחת התראה:', responseData);
        }
      } else {
        console.log('LikeableImage: לא נמצא טוקן push לשליחת התראה.');
      }
    } catch (error) {
      console.error('LikeableImage: שגיאה בשליחת ההתראה:', error);
    }
  };

  const handleImagePress = () => {
    if (onPress && !onPressDisabled) {
      onPress();
    }
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    handleLike();
  };

  return (
    <TouchableOpacity
      style={[styles.imageContainer, style]}
      onPress={handleImagePress}
      disabled={onPressDisabled}
    >
      <Image source={{ uri: imageUri }} style={styles.image} />
      
      {showLikeButton && (
        <View style={styles.likeOverlay}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLikePress}
            disabled={loading}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={'heart'}
                size={18}
                color={isLiked ? '#FF3B30' : '#FFF'}
                style={isLiked ? null : styles.iconShadow}
              />
            </Animated.View>
            {likeCount > 0 && (
              <Text style={styles.likeCount}>{likeCount}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  likeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default LikeableImage;