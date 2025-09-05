import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { arrayRemove, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    SafeAreaView,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/ProfileServices/ThemeContext';
import { app, db } from '../../../firebaseConfig';

interface Member {
    uid: string;
    username: string;
    profileImageUrl: string | null;
}

interface EventDetails {
    description: string;
    location: string;
    time: string;
    date: string;
    organizer: string;
    latitude?: number;
    longitude?: number;
    id?: string;
}

const GroupDetailsModal = ({
    eventTitle,
    onClose,
    onOpenImageModal,
}: {
    eventTitle: string;
    onClose: () => void;
    onOpenImageModal: (url: string | null) => void;
}) => {
    const [groupName, setGroupName] = useState('');
    const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const currentUid = currentUser?.uid;
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const handleMemberPress = async (otherUserUid: string) => {
        if (!currentUid) {
            Alert.alert('שגיאה', 'יש להתחבר כדי לבצע פעולה זו.');
            return;
        }

        // 1. If the user presses on their own profile, navigate to the local profile page
        if (otherUserUid === currentUid) {
            router.replace('/profile');
            return;
        }

        // 2. Check if the current user is blocked by the other user
        try {
            const otherUserDocRef = doc(db, 'users', otherUserUid);
            const otherUserDocSnap = await getDoc(otherUserDocRef);

            if (otherUserDocSnap.exists()) {
                const otherUserData = otherUserDocSnap.data();
                const otherUserBlockedList = otherUserData.blocked_users || [];
                
                if (otherUserBlockedList.includes(currentUid)) {
                    Alert.alert('שגיאה', 'אינך יכול לצפות בפרופיל של משתמש שחסם אותך.');
                    return; // Stop the function
                }
            }
        } catch (error) {
            console.error("שגיאה בבדיקת רשימת החסומים של המשתמש השני:", error);
            Alert.alert('שגיאה', 'אירעה שגיאה בבדיקת הפרופיל.');
            return; // Stop the function
        }
    
        // 3. If the check passes, navigate to the other user's profile
        onClose();
        router.push({
            pathname: '/ProfileServices/OtherUser/OtherUserProfile',
            params: { uid: otherUserUid },
        });
    };

    const storage = getStorage(app);

    useEffect(() => {
        if (!eventTitle) {
            setLoading(false);
            return;
        }

        const groupDocRef = doc(db, 'group_chats', eventTitle);

        const unsubscribeGroup = onSnapshot(
            groupDocRef,
            async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setGroupName(data.name || eventTitle);
                    setGroupImageUrl(data.groupImage || null);
                    const memberIds = data.members || [];
                    const fetchedMembers: Member[] = [];

                    for (const uid of memberIds) {
                        const userDocRef = doc(db, 'users', uid);
                        const userDocSnap = await getDoc(userDocRef);
                        const userData = userDocSnap.exists() ? userDocSnap.data() : null;

                        const profileImageUrl = userData?.profile_image || null;

                        fetchedMembers.push({
                            uid,
                            username: userData?.username || 'משתמש',
                            profileImageUrl,
                        });
                    }
                    setMembers(fetchedMembers);
                } else {
                    setGroupName(eventTitle);
                    setGroupImageUrl(null);
                    setMembers([]);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching group details:', error);
                setLoading(false);
            }
        );

        const fetchEventDetails = async () => {
            try {
                const pinsCollection = collection(db, 'pins');
                const q = query(pinsCollection, where('event_title', '==', eventTitle));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const docSnap = querySnapshot.docs[0];
                    const data = docSnap.data();

                    let formattedDate = 'לא צוין';
                    let formattedTime = 'לא צוין';

                    if (data.event_date) {
                        try {
                            const date = new Date(data.event_date);
                            if (date && !isNaN(date.getTime())) {
                                formattedDate = date.toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                });
                                // Extract time from the same Date object
                                formattedTime = date.toLocaleTimeString('he-IL', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                });
                            }
                        } catch (dateError) {
                            console.log('Date formatting error:', dateError);
                        }
                    }

                    setEventDetails({
                        id: docSnap.id,
                        description: data.description && data.description.trim() !== '' ? data.description : 'אין תיאור',
                        location: data.location && data.location.trim() !== '' ? data.location : 'לא צוין',
                        time: formattedTime,
                        date: formattedDate,
                        organizer: data.username || data.organizer || 'לא צוין',
                        latitude: data.latitude,
                        longitude: data.longitude,
                    });
                } else {
                    const eventDocRef = doc(db, 'pins', eventTitle);
                    const docSnap = await getDoc(eventDocRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        
                        let formattedDate = 'לא צוין';
                        let formattedTime = 'לא צוין';

                        if (data.event_date) {
                            try {
                                const date = new Date(data.event_date);
                                if (date && !isNaN(date.getTime())) {
                                    formattedDate = date.toLocaleDateString('he-IL', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                    });
                                    // Extract time from the same Date object
                                    formattedTime = date.toLocaleTimeString('he-IL', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    });
                                }
                            } catch (dateError) {
                                console.log('Date formatting error:', dateError);
                            }
                        }

                        setEventDetails({
                            id: docSnap.id,
                            description: data.description && data.description.trim() !== '' ? data.description : 'אין תיאור',
                            location: data.location && data.location.trim() !== '' ? data.location : 'לא צוין',
                            time: formattedTime,
                            date: formattedDate,
                            organizer: data.username || data.organizer || 'לא צוין',
                            latitude: data.latitude,
                            longitude: data.longitude,
                        });
                    } else {
                        setEventDetails({
                            description: 'אין תיאור',
                            location: 'לא צוין',
                            time: 'לא צוין',
                            date: 'לא צוין',
                            organizer: 'לא צוין',
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching event details:', error);
                setEventDetails({
                    description: 'שגיאה בטעינת נתונים',
                    location: 'שגיאה בטעינת נתונים',
                    time: 'שגיאה בטעינת נתונים',
                    date: 'שגיאה בטעינת נתונים',
                    organizer: 'שגיאה בטעינת נתונים',
                });
            }
        };

        fetchEventDetails();

        return () => unsubscribeGroup();
    }, [eventTitle]);

    const handleOpenInMaps = async () => {
        if (!eventDetails?.latitude || !eventDetails?.longitude) {
            Alert.alert('שגיאה', 'מיקום האירוע לא זמין');
            return;
        }

        try {
            const { latitude, longitude } = eventDetails;
            const googleMapsUrl = `http://maps.google.com/maps?q=${latitude},${longitude}`;
            const supported = await Linking.canOpenURL(googleMapsUrl);

            if (supported) {
                await Linking.openURL(googleMapsUrl);
            } else {
                Alert.alert('שגיאה', 'לא ניתן לפתוח את יישום המפות');
            }
        } catch (error) {
            console.error('Error opening maps:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בפתיחת המפה');
        }
    };

    const handleShareEvent = async () => {
        if (!eventDetails?.id || !eventDetails.latitude || !eventDetails.longitude) {
            Alert.alert('שגיאה', 'לא ניתן לשתף את האירוע. פרטים חסרים.');
            return;
        }

        try {
            const shareUrl = `yourappname://event?id=${eventDetails.id}&lat=${eventDetails.latitude}&lon=${eventDetails.longitude}`;
            const message = `הצטרף אליי לאירוע: ${eventTitle}!\n${eventDetails.location || ''}\n\nלחץ על הקישור כדי לראות את פרטי האירוע באפליקציה:\n${shareUrl}`;

            await Share.share({
                message: message,
                url: shareUrl,
                title: eventTitle,
            });
        } catch (error) {
            console.error('Error sharing event:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בשיתוף האירוע');
        }
    };

    const handleLeaveGroup = () => {
        if (!currentUid) {
            Alert.alert('שגיאה', 'יש להתחבר כדי לבצע פעולה זו.');
            return;
        }

        Alert.alert(
            'יציאה מהקבוצה',
            'האם אתה בטוח שברצונך לצאת מהקבוצה? לא תוכל לשלוח או לקבל הודעות נוספות.',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'יציאה',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const groupDocRef = doc(db, 'group_chats', eventTitle);
                            await updateDoc(groupDocRef, {
                                members: arrayRemove(currentUid),
                            });
                            Alert.alert('יצאת מהקבוצה בהצלחה.', '', [
                                {
                                    text: 'אישור',
                                    onPress: () => {
                                        onClose();
                                        router.replace('/(tabs)/chat');
                                    },
                                },
                            ]);
                        } catch (error) {
                            console.error('Error leaving group:', error);
                            Alert.alert('שגיאה', 'הייתה בעיה ביציאה מהקבוצה. אנא נסה שוב.');
                        }
                    },
                },
            ]
        );
    };

    const renderMember = ({ item }: { item: Member }) => {
        return (
            <TouchableOpacity
                onPress={() => handleMemberPress(item.uid)}
                style={[
                    styles.memberItem,
                    {
                        backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF',
                        borderColor: theme.isDark ? '#3E506B' : '#E8E8E8',
                    },
                ]}
            >
                {item.profileImageUrl ? (
                    <Image source={{ uri: item.profileImageUrl }} style={styles.memberAvatar} />
                ) : (
                    <View
                        style={[
                            styles.memberAvatar,
                            {
                                backgroundColor: theme.isDark ? '#2C3E50' : '#E0E0E0',
                                justifyContent: 'center',
                                alignItems: 'center',
                            },
                        ]}
                    >
                        <Ionicons name="person" size={32} color="#A0A0A0" />
                    </View>
                )}
                <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>
                        {item.username} {item.uid === currentUid && '(אני)'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <Modal
                isVisible={true}
                style={styles.modal}
                onBackButtonPress={onClose}
                onBackdropPress={onClose}
            >
                <View style={[styles.loadingContainer, { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' }]}>
                    <ActivityIndicator size="large" color={theme.isDark ? '#A0C4FF' : '#3A8DFF'} />
                </View>
            </Modal>
        );
    }

    return (
        <Modal
            isVisible={true}
            style={styles.modal}
            onBackButtonPress={onClose}
        >
            <View style={[styles.fullScreenContainer, { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' }]}>
                <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.isDark ? '#2C3946' : '#3A8DFF'} />
                <SafeAreaView style={[styles.headerContainer, { backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF' }]}>
                    <View style={styles.header}>
                        <View style={{ width: 24 }} />
                        <Text style={styles.headerTitle}>פרטי קבוצה</Text>
                        <TouchableOpacity onPress={onClose} style={styles.backButton}>
                            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                <ScrollView
                    style={styles.flexContainer}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.groupHeader}>
                        <TouchableOpacity onPress={() => onOpenImageModal(groupImageUrl)}>
                            <View style={styles.groupImageContainer}>
                                {groupImageUrl ? (
                                    <Image source={{ uri: groupImageUrl }} style={styles.groupImage} />
                                ) : (
                                    <View style={[styles.groupImagePlaceholder, { backgroundColor: theme.isDark ? '#2C3E50' : '#E0E0E0' }]}>
                                        <Ionicons name="people" size={60} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} />
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.groupName, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{groupName}</Text>
                        <Text style={[styles.memberCount, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>{members.length} חברים</Text>
                    </View>

                    {eventDetails && (
                        <View style={[styles.detailsSection, { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA', width: '95%', alignSelf: 'center' }]}>
                            <Text style={[styles.sectionTitle, { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' }]}>פרטי האירוע</Text>
                            <View style={[styles.detailCard, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF', borderColor: theme.isDark ? '#3E506B' : '#E8E8E8' }]}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="person-outline" size={20} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={styles.detailLabel}>מאת:</Text>
                                        <Text style={[styles.detailText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{eventDetails.organizer}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={20} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={styles.detailLabel}>תאריך:</Text>
                                        <Text style={[styles.detailText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{eventDetails.date}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="time-outline" size={20} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={styles.detailLabel}>שעה:</Text>
                                        <Text style={[styles.detailText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{eventDetails.time}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="location-outline" size={20} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={styles.detailLabel}>מיקום:</Text>
                                        {eventDetails.location !== 'לא צוין' ? (
                                            <TouchableOpacity onPress={handleOpenInMaps}>
                                                <Text style={[styles.detailText, styles.detailLocationLink, { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' }]}>{eventDetails.location}</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text style={[styles.detailText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{eventDetails.location}</Text>
                                        )}
                                    </View>
                                </View>
                            
                                <View style={styles.detailRow}>
                                    <Ionicons name="document-text-outline" size={20} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={styles.detailLabel}>תיאור:</Text>
                                        <Text style={[styles.detailText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{eventDetails.description}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={[styles.membersSection, { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA', width: '95%', alignSelf: 'center' }]}>
                        <Text style={[styles.sectionTitle, { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' }]}>חברי קבוצה</Text>
                        <FlatList
                            data={members}
                            renderItem={renderMember}
                            keyExtractor={(item) => item.uid}
                            scrollEnabled={false}
                        />
                    </View>

                    <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShareEvent}>
                        <Ionicons name="share-social-outline" size={20} color="#FFFFFF" style={styles.actionIcon} />
                        <Text style={styles.actionText}>שתף אירוע</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, styles.leaveGroupButton]} onPress={handleLeaveGroup}>
                        <Ionicons name="exit-outline" size={20} color="#FFFFFF" style={styles.actionIcon} />
                        <Text style={styles.actionText}>יציאה מהקבוצה</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        margin: 0,
    },
    fullScreenContainer: { flex: 1 },
    flexContainer: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { paddingTop: 10, paddingHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15 },
    backButton: { padding: 5, marginRight: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1 },
    groupHeader: { alignItems: 'center', paddingVertical: 20, marginBottom: 10 },
    groupImageContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', marginBottom: 10 },
    groupImage: { width: '100%', height: '100%' },
    groupImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    groupName: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginHorizontal: 20 },
    memberCount: { fontSize: 16, textAlign: 'center', marginTop: 5 },
    detailsSection: { padding: 15, borderRadius: 15, marginBottom: 20 },
    detailCard: { padding: 20, borderWidth: 1, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    detailRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
    detailIcon: { marginLeft: 5 },
    detailTextContainer: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' },
    detailLabel: { fontSize: 15, fontWeight: 'bold', marginLeft: 4, textAlign: 'right', color: '#95A5A6' },
    detailText: { fontSize: 16, textAlign: 'right', flexShrink: 1, fontWeight: 'bold' },
    detailLocationLink: { fontSize: 16, fontWeight: 'bold', textDecorationLine: 'underline', textAlign: 'right' },
    membersSection: { padding: 15, borderRadius: 15, marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
    memberItem: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    memberAvatar: { width: 48, height: 48, borderRadius: 24, marginLeft: 15 },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
    
    actionButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignSelf: 'center',
        width: '90%',
        marginVertical: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    actionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginLeft: 10,
    },
    actionIcon: {
        marginRight: 10,
    },
    shareButton: {
        backgroundColor: '#3A8DFF',
    },
    leaveGroupButton: {
        backgroundColor: '#fc3e3eff',
    },
});

export default GroupDetailsModal;