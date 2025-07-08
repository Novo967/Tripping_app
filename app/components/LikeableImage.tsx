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
import { db } from '../../firebaseConfig';
 

interface LikeableImageProps {
  imageUri: string;
  imageIndex: number;
  profileOwnerId: string;
  style?: any;
  onPress?: () => void;
  showLikeButton?: boolean;
}

export const LikeableImage: React.FC<LikeableImageProps> = ({
  imageUri,
  imageIndex,
  profileOwnerId,
  style,
  onPress,
  showLikeButton = true,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    fetchLikeData();
  }, [imageIndex, profileOwnerId]);

  const fetchLikeData = async () => {
    try {
      const imageDocRef = doc(db, 'imageLikes', `${profileOwnerId}_${imageIndex}`);
      const imageDoc = await getDoc(imageDocRef);
      
      if (imageDoc.exists()) {
        const data = imageDoc.data();
        const likes = data.likes || [];
        setLikeCount(likes.length);
        setIsLiked(currentUserId ? likes.includes(currentUserId) : false);
      }
    } catch (error) {
      console.error('Error fetching like data:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      Alert.alert('שגיאה', 'עליך להתחבר כדי לאהוב תמונות');
      return;
    }

    if (loading) return;

    setLoading(true);

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

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

      if (!existingDoc.exists()) {
        // אם זה לייק ראשון, צור את המסמך
        if (newIsLiked) {
          await setDoc(imageDocRef, {
            likes: [currentUserId],
            imageUri,
            profileOwnerId,
            imageIndex,
            lastUpdated: new Date().toISOString(),
          });
        }
      } else {
        if (newIsLiked) {
          await updateDoc(imageDocRef, {
            likes: arrayUnion(currentUserId),
            lastUpdated: new Date().toISOString(),
          });
        } else {
          await updateDoc(imageDocRef, {
            likes: arrayRemove(currentUserId),
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
      setIsLiked(!newIsLiked);
      setLikeCount((prev) => (newIsLiked ? prev - 1 : prev + 1));
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הלייק');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={[styles.imageContainer, style]} onPress={onPress}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      
      {showLikeButton && (
        <View style={styles.likeOverlay}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLike}
            disabled={loading}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? '#FF3B30' : '#FFF'}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 40,
    justifyContent: 'center',
  },
  likeCount: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default LikeableImage;