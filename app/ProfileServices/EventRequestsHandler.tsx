// app/ProfileServices/EventRequestsHandler.tsx
import { arrayUnion, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

// ✅ שינוי: הוספנו את event_id לממשק כדי שנוכל לעדכן את הפין המתאים
interface EventRequest {
    id: string;
    sender_uid: string;
    sender_username: string;
    event_title: string;
    event_id: string;
    status: 'pending' | 'accepted' | 'declined'; // הוספת סטטוס
}

interface UserProfile {
    uid: string;
    username: string;
    profileImage?: string;
    bio?: string;
    location?: string;
    joinDate?: string;
}

interface EventRequestsHandlerProps {
    isVisible: boolean;
    onClose: () => void;
    setPendingRequests: React.Dispatch<React.SetStateAction<any[]>>;
}

const EventRequestsHandler: React.FC<EventRequestsHandlerProps> = ({ isVisible, onClose, setPendingRequests }) => {
    const { theme } = useTheme();
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    // ✅ שינוי: מצב פנימי לבקשות ממתינות
    const [requests, setRequests] = useState<EventRequest[]>([]);

    /**
     * ✅ שינוי מרכזי: פונקציה זו משתמשת ב-onSnapshot כדי להאזין בזמן אמת
     * לבקשות הממתינות ב-Firestore, במקום לקרוא משרת חיצוני.
     */
    useEffect(() => {
        if (!auth.currentUser || !isVisible) {
            setRequests([]);
            return;
        }

        const q = query(
            collection(db, 'event_requests'),
            where('receiver_uid', '==', auth.currentUser.uid),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const pendingRequests = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as EventRequest));
            setRequests(pendingRequests);
            setPendingRequests(pendingRequests); // עדכון גם ב-state של הקומפוננטה הראשית
        }, (error) => {
            console.error('Error fetching pending requests:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בטעינת הבקשות.');
            setRequests([]);
            setPendingRequests([]);
        });

        return () => unsubscribe();
    }, [isVisible, setPendingRequests]);


    const fetchUserProfile = async (uid: string, username: string) => {
        setLoadingProfile(true);
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setSelectedProfile({
                    uid,
                    username,
                    profileImage: userData.profileImage,
                    bio: userData.bio,
                    location: userData.location,
                    joinDate: userData.createdAt?.toDate?.()?.toLocaleDateString('he-IL') || 'לא זמין',
                });
            } else {
                setSelectedProfile({
                    uid,
                    username,
                    profileImage: undefined,
                    bio: 'אין מידע זמין',
                    location: 'לא זמין',
                    joinDate: 'לא זמין',
                });
            }
            setProfileModalVisible(true);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            Alert.alert('שגיאה', 'לא ניתן לטעון את הפרופיל');
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleUsernamePress = (request: EventRequest) => {
        fetchUserProfile(request.sender_uid, request.sender_username);
    };

    /**
     * ✅ שינוי מרכזי: פונקציה זו מעדכנת את הסטטוס של הבקשה ב-Firestore ישירות.
     * כאשר בקשה מאושרת, היא מוסיפה את המשתמש לרשימת approved_users ב-pins
     * וגם לקבוצת הצ'אט.
     */
    const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
        try {
            const request = requests.find(req => req.id === requestId);
            if (!request) {
                Alert.alert('שגיאה', 'הבקשה לא נמצאה.');
                return;
            }

            const requestRef = doc(db, 'event_requests', requestId);
            await updateDoc(requestRef, {
                status: action,
            });

            if (action === 'accepted') {
                // 1. הוספת המשתמש לרשימת approved_users במסמך ה-pin המתאים
                const pinRef = doc(db, 'pins', request.event_id);
                await updateDoc(pinRef, {
                    approved_users: arrayUnion(request.sender_uid),
                });
                console.log(`User ${request.sender_uid} added to approved_users for event ${request.event_id}`);

                // 2. הוספת המשתמש לקבוצת הצ'אט
                const groupChatRef = doc(db, 'group_chats', request.event_title);
                const groupSnap = await getDoc(groupChatRef);

                if (groupSnap.exists()) {
                    await updateDoc(groupChatRef, {
                        members: arrayUnion(request.sender_uid)
                    });
                } else {
                    await setDoc(groupChatRef, {
                        name: request.event_title,
                        members: [request.sender_uid],
                        createdAt: serverTimestamp(),
                        groupImage: null,
                    });
                }
            }

        } catch (error) {
            console.error(`Error ${action}ing request:`, error);
            Alert.alert('שגיאה', `אירעה שגיאה בביצוע הפעולה.`);
        }
    };

    const ProfileModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={profileModalVisible}
            onRequestClose={() => setProfileModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setProfileModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>פרופיל משתמש</Text>
                    </View>

                    {selectedProfile && (
                        <ScrollView style={styles.profileContent}>
                            <View style={styles.profileHeader}>
                                <Image
                                    source={{
                                        uri: selectedProfile.profileImage ||
                                            `https://placehold.co/100x100/3A8DFF/FFFFFF?text=${selectedProfile.username.charAt(0)}`
                                    }}
                                    style={styles.profileImage}
                                />
                                <Text style={[styles.profileUsername, { color: theme.colors.text }]}>
                                    {selectedProfile.username}
                                </Text>
                            </View>

                            <View style={styles.profileInfo}>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>תיאור:</Text>
                                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                                        {selectedProfile.bio || 'אין תיאור'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>מיקום:</Text>
                                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                                        {selectedProfile.location || 'לא זמין'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>תאריך הצטרפות:</Text>
                                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                                        {selectedProfile.joinDate}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );

    if (!isVisible) {
        return null;
    }

    return (
        <>
            <View style={[styles.requestsPanel, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.requestsTitle, { color: theme.colors.text }]}>בקשות לאירועים:</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.requestsScrollView}>
                    {requests.length === 0 ? (
                        <Text style={[styles.emptyRequestsText, { color: theme.colors.textSecondary }]}>אין בקשות ממתינות.</Text>
                    ) : (
                        requests.map((request) => (
                            <View key={request.id} style={[styles.requestCard, { backgroundColor: theme.colors.background }]}>
                                <Image
                                    source={{ uri: `https://placehold.co/50x50/3A8DFF/FFFFFF?text=${request.sender_username.charAt(0)}` }}
                                    style={styles.requestSenderImage}
                                />
                                <View style={styles.requestTextContent}>
                                    <TouchableOpacity
                                        onPress={() => handleUsernamePress(request)}
                                        disabled={loadingProfile}
                                    >
                                        <Text style={[styles.requestSenderName, { color: theme.colors.text }]}>
                                            {request.sender_username}
                                        </Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.requestEventTitle, { color: theme.colors.textSecondary }]}>
                                        רוצה להצטרף ל: {request.event_title}
                                    </Text>
                                </View>
                                <View style={styles.requestButtons}>
                                    <TouchableOpacity
                                        style={styles.acceptButton}
                                        onPress={() => handleRequestAction(request.id, 'accepted')}
                                    >
                                        <Text style={styles.acceptButtonText}>אשר</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.declineButton}
                                        onPress={() => handleRequestAction(request.id, 'declined')}
                                    >
                                        <Text style={styles.declineButtonText}>דחה</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            <ProfileModal />
        </>
    );
};

const styles = StyleSheet.create({
    requestsPanel: {
        position: 'absolute',
        top: -20,
        left: 20,
        right: 20,
        zIndex: 15,
        borderRadius: 12,
        padding: 16,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        maxHeight: Dimensions.get('window').height * 0.5,
    },
    requestsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    requestsScrollView: {
        paddingHorizontal: 10,
    },
    requestCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderRadius: 10,
        padding: 12,
        marginHorizontal: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: width * 0.9 - 20,
        minHeight: 80,
        marginBottom: 10,
    },
    requestSenderImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginLeft: 15,
        borderWidth: 1,
        borderColor: '#3A8DFF',
    },
    requestTextContent: {
        flex: 1,
        marginRight: 10,
        alignItems: 'flex-end',
    },
    requestSenderName: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
        textDecorationLine: 'underline',
    },
    requestEventTitle: {
        fontSize: 14,
        color: '#555',
        textAlign: 'right',
        marginTop: 2,
    },
    requestButtons: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginLeft: 8,
    },
    acceptButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    declineButton: {
        backgroundColor: '#F44336',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    declineButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyRequestsText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#3A8DFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    profileContent: {
        flex: 1,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
        borderWidth: 3,
        borderColor: '#3A8DFF',
    },
    profileUsername: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileInfo: {
        paddingHorizontal: 10,
    },
    infoRow: {
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'right',
    },
    infoValue: {
        fontSize: 16,
        textAlign: 'right',
        lineHeight: 22,
    },
});

export default EventRequestsHandler;