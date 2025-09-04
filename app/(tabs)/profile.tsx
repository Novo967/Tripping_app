import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { app, auth } from '../../firebaseConfig';
import Bio from '../ProfileServices/bio';
import BlockUserModal from '../ProfileServices/BlockUserModal';
import DeleteAccountModal from '../ProfileServices/DeleteAccountModal';
import EventRequestsHandler from '../ProfileServices/EventRequestsHandler';
import Gallery from '../ProfileServices/GalleryServices/Gallery';
import ImageModal from '../ProfileServices/ImageModal';
import NotificationBell from '../ProfileServices/NoficationBell';
import ProfileImage from '../ProfileServices/ProfileImage';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width, height } = Dimensions.get('window');

const storage = getStorage(app);
const db = getFirestore(app);

// Helper function to upload image to Firebase Storage
const uploadToFirebase = async (uri: string, path: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    const uploadTask = await uploadBytes(storageRef, blob);
    return getDownloadURL(uploadTask.ref);
};

// Helper function to delete image from Firebase Storage
const deleteFromFirebase = async (imageUrl: string) => {
    try {
        const storageRefToDelete = ref(storage, imageUrl);
        await deleteObject(storageRefToDelete);
        console.log("Image deleted from Firebase Storage:", imageUrl);
    } catch (firebaseErr: any) {
        console.warn(`Could not delete image from Firebase Storage (${imageUrl}):`, firebaseErr.message);
    }
};

export default function ProfileScreen() {
    const [bio, setBio] = useState('');
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [gallery, setGallery] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);
    const notificationTimeoutRef = useRef<number | null>(null);
    const [showRequests, setShowRequests] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isBlockModalVisible, setBlockModalVisible] = useState(false);
    const navigation = useNavigation();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const requestsPanelAnim = useRef(new Animated.Value(0)).current;

    // --- השינוי כאן ---
    // שימוש ב-hook הנכון כדי לקבל את הפרמטרים
    const params = useLocalSearchParams();
    // -------------------

    const insets = useSafeAreaInsets();
    
    const uploadImageToFirebase = async (uri: string, isProfilePic = false) => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('שגיאה', 'יש להתחבר כדי להעלות תמונות.');
            return;
        }

        try {
            const pathSegment = isProfilePic ? 'profile_images' : 'gallery_images';
            const fileName = `${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;
            const storagePath = `${pathSegment}/${user.uid}/${fileName}`;

            const firebaseImageUrl = await uploadToFirebase(uri, storagePath);

            const userDocRef = doc(db, 'users', user.uid);

            if (isProfilePic) {
                // Deleting the previous profile picture if it exists
                if (profilePic) {
                    try {
                        await deleteFromFirebase(profilePic);
                    } catch (deleteError) {
                        console.warn('Failed to delete previous profile pic:', deleteError);
                    }
                }
                await updateDoc(userDocRef, {
                    profile_image: firebaseImageUrl,
                });
                setProfilePic(firebaseImageUrl);
                Alert.alert('הצלחה', 'תמונת הפרופיל עודכנה בהצלחה!');
            } else {
                // Adding the new image to the gallery in Firestore
                await updateDoc(userDocRef, {
                    gallery: arrayUnion(firebaseImageUrl),
                });
                setGallery(prev => [...prev, firebaseImageUrl]);
                Alert.alert('הצלחה', 'התמונה עלתה לגלריה בהצלחה!');
            }
        } catch (err: any) {
            console.error('Upload process error:', err);
            Alert.alert('שגיאה', `העלאת התמונה נכשלה: ${err.message || 'שגיאה לא ידועה'}`);
        }
    };

    const handleDeleteImagesFromGallery = async (deletedImageUrls: string[]) => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('שגיאה', 'יש להתחבר כדי למחוק תמונות.');
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.uid);
            for (const imageUrl of deletedImageUrls) {
                await deleteFromFirebase(imageUrl);
                await updateDoc(userDocRef, {
                    gallery: arrayRemove(imageUrl),
                });
            }

            setGallery(prevGallery =>
                prevGallery.filter(imageUrl => !deletedImageUrls.includes(imageUrl))
            );
            Alert.alert('הצלחה', 'התמונות נמחקו בהצלחה!');
        } catch (err: any) {
            Alert.alert('שגיאה', `מחיקת התמונה נכשלה: ${err.message}`);
            console.error('Delete process error:', err);
        }
    };

    const openImageModal = (imageUri: string) => {
        setSelectedImage(imageUri);
        setModalVisible(true);
    };

    const closeImageModal = () => {
        setModalVisible(false);
        setSelectedImage(null);
    };

    const saveBio = async (newBio: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                bio: newBio,
            });

            setBio(newBio);
            setIsEditingBio(false);
            Alert.alert('הצלחה', 'הביוגרפיה נשמרה בהצלחה!');
        } catch (error: any) {
            Alert.alert('שגיאה', `לא הצלחנו לשמור את הביוגרפיה: ${error.message}`);
            console.error('Save Bio Error:', error);
            throw error;
        }
    };

    const handleEditBio = () => {
        setIsEditingBio(true);
    };

    const handleDeleteAccount = () => {
        setDeleteModalVisible(true);
    };

    const handleBlockUser = () => {
        setBlockModalVisible(true);
    };

    const navigateToSettings = () => {
        router.replace({
            pathname: '/ProfileServices/settings/settings',
            params: {
                onEditBio: 'handleEditBio',
                onDeleteAccount: 'handleDeleteAccount', 
                onBlockUser: 'handleBlockUser'
            }
        });
    };

    // Corrected logic using onSnapshot for real-time updates
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return () => {};
        }

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const profileDataFromFirestore = docSnap.data();
                    setProfilePic(profileDataFromFirestore.profile_image || null);
                    setUsername(profileDataFromFirestore.username || '');
                    setBio(profileDataFromFirestore.bio || '');
                    setGallery(profileDataFromFirestore.gallery || []);
                } else {
                    console.warn("User document not found in Firestore for UID:", user.uid);
                    // Handle the case where the document doesn't exist
                    // Optionally, you could create it here with default values
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching profile data from Firestore:", error);
                setLoading(false);
            }
        );

        // Unsubscribe from the listener when the component unmounts
        return () => unsubscribe();
    }, []);

    // Listen for when the user returns from settings and handle callbacks
    useFocusEffect(useCallback(() => {
        // Check if we need to trigger any actions based on route params
        if (params?.triggerAction) {
            switch (params.triggerAction) {
                case 'editBio':
                    handleEditBio();
                    break;
                case 'deleteAccount':
                    handleDeleteAccount();
                    break;
                case 'blockUser':
                    handleBlockUser();
                    break;
            }
        }
    }, [params.triggerAction]));

    useFocusEffect(useCallback(() => {
        const user = auth.currentUser;
        if (!user) {
            setPendingRequests([]);
            return () => {};
        }

        const requestsQuery = query(
            collection(db, 'event_requests'),
            where('receiver_uid', '==', user.uid),
            where('status', '==', 'pending')
        );
        
        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Clear any existing timeout
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
            
            // Add a small delay to prevent flickering
            notificationTimeoutRef.current = setTimeout(() => {
                setPendingRequests(requests);
                notificationTimeoutRef.current = null;
            }, 100);
        }, (error) => {
            console.error('Error fetching pending requests from Firestore:', error);
            Alert.alert('שגיאה', 'שגיאה בקבלת בקשות לאירועים.');
        });

        return () => {
            unsubscribe();
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
                notificationTimeoutRef.current = null;
            }
        };
    }, [])); 

    const toggleRequests = () => {
        console.log(`--- Toggling requests. Current state: ${showRequests} ---`);
        Animated.spring(requestsPanelAnim, {
            toValue: showRequests ? 0 : 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
        }).start();
        setShowRequests(prev => {
            console.log(`--- showRequests state changed from ${prev} to ${!prev} ---`);
            return !prev;
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.text }]}>טוען פרופיל...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
            
            <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={navigateToSettings} style={styles.navButton}>
                        <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <NotificationBell hasNotifications={pendingRequests.length > 0} onPress={toggleRequests} />
                </View>

                <Animated.View style={[styles.requestsPanelAnimated, {
                    transform: [{ translateY: requestsPanelAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] }) }],
                    opacity: requestsPanelAnim,
                    top: insets.top + (Platform.OS === 'ios' ? 50 : 60),
                }]}>
                    <EventRequestsHandler
                        isVisible={showRequests}
                        onClose={toggleRequests}
                        setPendingRequests={setPendingRequests}
                    />
                </Animated.View>
                
                <ProfileImage
                    profilePic={profilePic}
                    username={username}
                    galleryLength={gallery.length}
                    onChangeImage={(uri: string) => uploadImageToFirebase(uri, true)}
                    onImagePress={openImageModal}
                    gallery={gallery}
                    onAddImage={(uri: string) => uploadImageToFirebase(uri, false)}
                    onDeleteImages={handleDeleteImagesFromGallery}
                />

                <Bio
                    bio={bio}
                    isEditing={isEditingBio}
                    onChange={setBio}
                    onSave={saveBio}
                    onEditToggle={() => setIsEditingBio(prev => !prev)}
                />

                <Gallery
                    onImagePress={openImageModal}
                />

                <ImageModal
                    visible={modalVisible}
                    selectedImage={selectedImage}
                    onClose={closeImageModal}
                />
                <DeleteAccountModal
                    isVisible={isDeleteModalVisible}
                    onClose={() => setDeleteModalVisible(false)}
                    profilePic={profilePic}
                    gallery={gallery}
                />
                <BlockUserModal
                    isVisible={isBlockModalVisible}
                    onClose={() => setBlockModalVisible(false)}
                />
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    topNav: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: 10,
        position: 'absolute',
        top: Platform.OS === 'ios' ? 20 : 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    navButton: {
        padding: 10,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
    },
    requestsPanelAnimated: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 15,
        maxHeight: height * 0.5,
    },
});
