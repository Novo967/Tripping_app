import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { arrayRemove, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';
import { useTheme } from '../../ThemeContext';

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
    ownerUid: string;
    eventType?: string;
    latitude?: number;
    longitude?: number;
    pinDocumentId: string; // 🔧 Changed from 'id' to be more explicit
}

interface GroupDetailsModalProps {
    eventTitle: string;
    onClose: () => void;
    onOpenImageModal: () => void;
}

const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({ eventTitle, onClose, onOpenImageModal }) => {
    const [groupName, setGroupName] = useState('');
    const [groupProfileImageUrl, setGroupProfileImageUrl] = useState<string | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const currentUid = currentUser?.uid;
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [chatId, setChatId] = useState<string | null>(null);
    const isOrganizer = eventDetails?.ownerUid === currentUid;

    const getEventTypeInHebrew = (eventType: string): string => {
        const typeLabels: Record<string, string> = {
            'trip': 'טיול',
            'party': 'מסיבה',
            'attraction': 'אטרקציה',
            'food': 'אוכל',
            'nightlife': 'חיי לילה',
            'beach': 'ים/בריכה',
            'sport': 'ספורט',
            'other': 'אחר',
        };
        return typeLabels[eventType] || eventType;
    };

    const getEventTypeIcon = (eventType: string) => {
        switch (eventType) {
            case 'trip': return 'trail-sign-outline';
            case 'party': return 'headset-outline';
            case 'attraction': return 'star-outline';
            case 'food': return 'restaurant-outline';
            case 'nightlife': return 'wine-outline';
            case 'beach': return 'sunny-outline';
            case 'sport': return 'barbell-outline';
            default: return 'ellipsis-horizontal-circle-outline';
        }
    };

    const handleMemberPress = async (otherUserUid: string) => {
        if (!currentUid) {
            Alert.alert('שגיאה', 'יש להתחבר כדי לבצע פעולה זו.');
            return;
        }

        if (otherUserUid === currentUid) {
            router.replace('/profile');
            return;
        }

        try {
            const otherUserDocRef = doc(db, 'users', otherUserUid);
            const otherUserDocSnap = await getDoc(otherUserDocRef);

            if (otherUserDocSnap.exists()) {
                const otherUserData = otherUserDocSnap.data();
                const otherUserBlockedList = otherUserData.blocked_users || [];

                if (otherUserBlockedList.includes(currentUid)) {
                    Alert.alert('שגיאה', 'אינך יכול לצפות בפרופיל של משתמש שחסם אותך.');
                    return;
                }
            }
        } catch (error) {
            console.error("שגיאה בבדיקת רשימת החסומים של המשתמש השני:", error);
            Alert.alert('שגיאה', 'אירעה שגיאה בבדיקת הפרופיל.');
            return;
        }

        router.push({
            pathname: '/ProfileServices/OtherUser/OtherUserProfile',
            params: { uid: otherUserUid },
        });
    };

    // 🔧 Fixed: Now uses the correct pin document ID for editing
    const handleEditEvent = () => {
        if (!eventDetails?.pinDocumentId) {
            Alert.alert('שגיאה', 'לא ניתן לערוך. מזהה אירוע חסר.');
            return;
        }
        
        // Close this modal first
        onClose();
        
        // Navigate to edit page with the correct pin document ID
        router.push({
            pathname: '/EventEdit/EditEventPage',
            params: { eventId: eventDetails.pinDocumentId }, 
        });
    };

    useEffect(() => {
        if (!eventTitle) {
            setLoading(false);
            return;
        }

        // 1. Fetch group chat details
        const groupDocRef = doc(db, 'group_chats', eventTitle);

        const unsubscribeGroup = onSnapshot(
            groupDocRef,
            async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setGroupName(data.name || eventTitle);
                    // 🔧 Fixed: Use consistent field name
                    setGroupProfileImageUrl(data.groupImage || null);
                    if (data.chat_id) {
                        setChatId(data.chat_id);
                    }
                    const memberIds = data.members || [];
                    const fetchedMembers: Member[] = [];
                    
                    for (const uid of memberIds) {
                        const userDocRef = doc(db, 'users', uid);
                        const userDocSnap = await getDoc(userDocRef);
                        const userData = userDocSnap.exists() ? userDocSnap.data() : null;
                        // 🔧 Fixed: Use consistent field name
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
                    setGroupProfileImageUrl(null);
                    setMembers([]);
                }
                
                fetchEventDetails(); 
            },
            (error) => {
                console.error('Error fetching group details:', error);
                setLoading(false);
            }
        );

        // 2. Fetch event (pin) details using the event_id field
        const fetchEventDetails = async () => {
            if (!chatId) return;
            try {
                const pinsCollection = collection(db, 'pins');
                
                // ✅ תיקון: חיפוש פרטי האירוע (Pin) לפי השדה event_id כפי שביקשת, התואם למזהה הצ'אט
                const q = query(pinsCollection, where('event_id', '==', chatId)); // שינוי: מחפש לפי chatId
                console.log('Querying pins with event_id:', chatId);
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const pinDoc = querySnapshot.docs[0];
                    const pinData = pinDoc.data();
                    
                    let formattedDate = 'לא צוין';
                    let formattedTime = 'לא צוין';

                    // 🔧 Fixed: Use consistent field name 'event_date'
                    if (pinData.event_date) {
                        try {
                            const date = new Date(pinData.event_date.toDate ? pinData.event_date.toDate() : pinData.event_date);
                            if (date && !isNaN(date.getTime())) {
                                formattedDate = date.toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                });
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
                        pinDocumentId: pinDoc.id, // 🔧 Store the actual pin document ID
                        // 🔧 Fixed: Use consistent Firebase field names
                        description: pinData.description && pinData.description.trim() !== '' ? pinData.description : 'אין תיאור',
                        location: pinData.location && pinData.location.trim() !== '' ? pinData.location : 'לא צוין',
                        time: formattedTime,
                        date: formattedDate,
                        organizer: pinData.username || pinData.organizer || 'לא צוין',
                        ownerUid: pinData.owner_uid || '',
                        eventType: pinData.event_type || 'אחר',
                        latitude: pinData.latitude,
                        longitude: pinData.longitude,
                    });
                } else {
                    console.log('No pin found with event_id:', eventTitle);
                    setEventDetails(null);
                }
            } catch (error) {
                console.error('Error fetching event details:', error);
                setEventDetails(null);
            } finally {
                setLoading(false);
            }
        };

        return () => unsubscribeGroup();
    }, [eventTitle, currentUid, chatId]);

    const handleOpenInMaps = async () => {
        if (!eventDetails?.latitude || !eventDetails?.longitude) {
            Alert.alert('שגיאה', 'מיקום האירוע לא זמין');
            return;
        }
        try {
            const { latitude, longitude } = eventDetails;
            
            const label = encodeURIComponent(groupName || 'אירוע');
            
            const mapUrl = Platform.select({
                ios: `http://maps.apple.com/?q=${latitude},${longitude}&label=${label}`,
                android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
                default: `http://maps.google.com/maps?q=${latitude},${longitude}`, 
            });
            
            if (mapUrl) {
                const supported = await Linking.canOpenURL(mapUrl);

                if (supported) {
                    await Linking.openURL(mapUrl);
                } else {
                    Alert.alert('שגיאה', 'לא ניתן לפתוח את יישום המפות');
                }
            }
        } catch (error) {
            console.error('Error opening maps:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בפתיחת המפה');
        }
    };

    const handleShareEvent = async () => {
        if (!eventDetails?.pinDocumentId || !eventDetails.latitude || !eventDetails.longitude) {
            Alert.alert('שגיאה', 'לא ניתן לשתף את האירוע. פרטים חסרים.');
            return;
        }
        try {
            // 🔧 Fixed: Use pin document ID for sharing
            const shareUrl = `yourappname://event?id=${eventDetails.pinDocumentId}&lat=${eventDetails.latitude}&lon=${eventDetails.longitude}`;
            const message = `הצטרף אלי לאירוע: ${groupName}!\n${eventDetails.location || ''}\n\nלחץ על הקישור כדי לראות את פרטי האירוע באפליקציה:\n${shareUrl}`;

            await Share.share({
                message: message,
                url: shareUrl,
                title: groupName,
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
                style={[styles.memberItem, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}
            >
                {item.profileImageUrl ? (
                    <Image source={{ uri: item.profileImageUrl }} style={styles.memberAvatar} />
                ) : (
                    <View style={[styles.memberAvatarPlaceholder, { backgroundColor: theme.isDark ? '#3E506B' : '#E8E8E8' }]}>
                        <Ionicons name="person" size={24} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} />
                    </View>
                )}
                <Text style={[styles.memberName, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>
                    {item.username} {item.uid === currentUid && '(אני)'}
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' }]}>
                <ActivityIndicator size="large" color={theme.isDark ? '#A0C4FF' : '#3A8DFF'} />
            </View>
        );
    }

    return (
        <View style={[styles.fullScreenContainer, { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' }]}>
            <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.isDark ? '#2C3946' : '#3A8DFF'} />
            <SafeAreaView style={[styles.headerContainer, { backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF', paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{groupName}</Text>
                    {isOrganizer && eventDetails ? (
                        <TouchableOpacity onPress={handleEditEvent} style={styles.editButton}>
                            <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 34 }} /> 
                    )}
                </View>
            </SafeAreaView>
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
                {/* Group Image Section */}
                <TouchableOpacity onPress={onOpenImageModal} style={[styles.groupImageContainer, { backgroundColor: theme.isDark ? '#1C242E' : '#FFFFFF' }]}>
                    {groupProfileImageUrl ? (
                        <Image source={{ uri: groupProfileImageUrl }} style={styles.groupImage} />
                    ) : (
                        <View style={[styles.groupImagePlaceholder, { backgroundColor: theme.isDark ? '#3E506B' : '#E8E8E8' }]}>
                            <Ionicons name="people-outline" size={80} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Event Details Section */}
                {eventDetails ? (
                    <View style={[styles.section, { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA' }]}>
                        <View style={[styles.eventDetailsCard, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF', borderColor: theme.isDark ? '#3E506B' : '#E8E8E8' }]}>
                            <View style={styles.eventTypeBubbleContainer}>
                                <Ionicons name={getEventTypeIcon(eventDetails.eventType!)} size={16} color={theme.isDark ? '#A0C4FF' : '#3A8DFF'} style={styles.eventTypeIcon} />
                                <Text style={[styles.eventTypeBubbleText, { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' }]}>{getEventTypeInHebrew(eventDetails.eventType!)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="person-outline" size={18} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                <View style={styles.detailTextContainer}>
                                    <Text style={[styles.detailLabel, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>מאת:</Text>
                                    <TouchableOpacity onPress={() => handleMemberPress(eventDetails.ownerUid)}>
                                        <Text style={[styles.detailText, styles.detailLocationLink, { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' }]}>{eventDetails.organizer}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="calendar-outline" size={18} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                <View style={styles.detailTextContainer}>
                                    <Text style={[styles.detailLabel, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>תאריך ושעה:</Text>
                                    <Text style={[styles.detailText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{eventDetails.date}, {eventDetails.time}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleOpenInMaps} disabled={!eventDetails.latitude || !eventDetails.longitude}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="location-outline" size={18} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={[styles.detailLabel, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>מיקום:</Text>
                                        <Text style={[styles.detailText, styles.detailLocationLink, { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' }]}>{eventDetails.location}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            
                            {eventDetails.description !== 'אין תיאור' && (
                                <View style={styles.detailRow}>
                                    <Ionicons name="document-text-outline" size={18} color={theme.isDark ? '#BDC3C7' : '#95A5A6'} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={[styles.detailLabel, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>תיאור:</Text>
                                        <Text style={[styles.detailText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>{eventDetails.description}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={[styles.section, { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA' }]}>
                        <Text style={[styles.sectionTitle, { color: theme.isDark ? '#E0E0E0' : '#2C3E50', textAlign: 'center' }]}>פרטי האירוע לא נמצאו</Text>
                    </View>
                )}

                {/* Members Section */}
                <View style={[styles.section, { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA' }]}>
                    <Text style={[styles.sectionTitle, { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' }]}>חברים ({members.length})</Text>
                    <FlatList
                        data={members}
                        renderItem={renderMember}
                        keyExtractor={(item) => item.uid}
                        scrollEnabled={false}
                        contentContainerStyle={{ paddingHorizontal: 15 }}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <View style={[styles.separator, { backgroundColor: theme.isDark ? '#3E506B' : '#E8E8E8' }]} />
                    {eventDetails?.latitude && eventDetails?.longitude && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.navigationButton]}
                            onPress={handleOpenInMaps}
                        >
                            <Ionicons name="navigate-circle-outline" size={20} color="#FFFFFF" style={styles.actionIcon} />
                            <Text style={styles.actionText}>נווט לאירוע</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.shareButton]}
                        onPress={handleShareEvent}
                    >
                        <Ionicons name="share-social-outline" size={20} color="#FFFFFF" style={styles.actionIcon} />
                        <Text style={styles.actionText}>שתף אירוע</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.leaveGroupButton]}
                        onPress={handleLeaveGroup}
                    >
                        <Ionicons name="exit-outline" size={18} color="#FFFFFF" style={styles.actionIcon} />
                        <Text style={styles.actionText}>יציאה מהקבוצה</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        flex: 1,
    },
    editButton: {
        padding: 5,
        marginLeft: 10,
    },
    groupImageContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 10,
    },
    groupImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderColor: '#E8E8E8',
        borderWidth: 2,
    },
    groupImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: '#E8E8E8',
        borderWidth: 2,
    },
    section: {
        padding: 15,
        borderRadius: 15,
        marginBottom: 20,
        marginHorizontal: 10,
    },
    eventDetailsCard: {
        padding: 20,
        borderWidth: 1,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    eventTypeBubbleContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#E6F0FF',
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 15,
        alignSelf: 'center',
        marginBottom: 20,
    },
    eventTypeIcon: {
        marginRight: 5,
        transform: [{ scaleX: -1 }],
    },
    eventTypeBubbleText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    detailRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 15,
    },
    detailIcon: {
        marginLeft: 5,
    },
    detailTextContainer: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
    },
    detailLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 4,
        textAlign: 'right',
    },
    detailText: {
        fontSize: 16,
        textAlign: 'right',
        flexShrink: 1,
        fontWeight: 'bold',
    },
    detailLocationLink: {
        textDecorationLine: 'underline',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'right',
    },
    memberItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginLeft: 15,
    },
    memberAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginLeft: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    separator: {
        height: 1,
        marginHorizontal: 20,
        marginVertical: 10,
    },
    actionButtonsContainer: {
        paddingHorizontal: 20,
    },
    actionButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%',
        marginVertical: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    actionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginLeft: 8,
    },
    actionIcon: {
        marginRight: 8,
    },
    shareButton: {
        backgroundColor: '#3A8DFF',
    },
    navigationButton: {
        backgroundColor: '#3A8DFF',
    },
    leaveGroupButton: {
        backgroundColor: '#fc3e3eff',
    },
});

export default GroupDetailsModal;