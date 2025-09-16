// app/IndexServices/EventDetailsModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addDoc, collection, getDocs, getFirestore, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useCallback, useMemo } from 'react';
import { Alert, Dimensions, Linking, Modal, Share, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { app } from '../../firebaseConfig';

interface SelectedEventType {
    id: string;
    latitude: number;
    longitude: number;
    event_date: string;
    username: string;
    event_title: string;
    event_type: string;
    description?: string;
    location?: string;
    owner_uid: string;
    approved_users?: string[];
}

interface EventDetailsModalProps {
    visible: boolean;
    selectedEvent: SelectedEventType | null;
    onClose: () => void;
    user: any;
    currentUserUsername: string;
    userLocation: { latitude: number; longitude: number } | null;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
    visible,
    selectedEvent,
    onClose,
    user,
    currentUserUsername,
    userLocation,
}) => {
    const db = getFirestore(app);
    const { width } = Dimensions.get('window');

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

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const eventDistance = useMemo(() => {
        if (userLocation && selectedEvent) {
            const dist = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                selectedEvent.latitude,
                selectedEvent.longitude
            );
            return dist.toFixed(1);
        }
        return null;
    }, [userLocation, selectedEvent]);

    const handleOpenInMaps = useCallback(async () => {
        if (!selectedEvent) return;
        try {
            const { latitude, longitude } = selectedEvent;
            const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('שגיאה', 'לא ניתן לפתוח את יישום המפות');
            }
        } catch (error) {
            console.error('Error opening maps:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בפתיחת המפה');
        }
    }, [selectedEvent]);

    const handleSendRequest = useCallback(async () => {
        if (!user || !selectedEvent || !currentUserUsername) {
            Alert.alert('שגיאה', 'לא ניתן לשלוח בקשה כרגע. נתונים חסרים.');
            return;
        }
        if (user.uid === selectedEvent.owner_uid) {
            Alert.alert('שגיאה', 'אינך יכול לשלוח בקשה לאירוע שאתה מנהל.');
            return;
        }
        if (selectedEvent.approved_users?.includes(user.uid)) {
            Alert.alert('שים לב', 'אתה כבר חלק מהאירוע.');
            onClose();
            return;
        }
        const q = query(
            collection(db, 'event_requests'),
            where('sender_uid', '==', user.uid),
            where('event_id', '==', selectedEvent.id),
            where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            Alert.alert('שים לב', 'כבר שלחת בקשה לאירוע זה. אנא המתן לאישור.');
            onClose();
            return;
        }
        try {
            await addDoc(collection(db, 'event_requests'), {
                sender_uid: user.uid,
                sender_username: currentUserUsername,
                event_id: selectedEvent.id,
                event_title: selectedEvent.event_title,
                receiver_uid: selectedEvent.owner_uid,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            Alert.alert('בקשה נשלחה', 'הבקשה שלך נשלחה בהצלחה וממתינה לאישור בעל האירוע.');
        } catch (error: any) {
            console.error('Error sending request:', error);
            const errorMessage = error.message || 'אירעה שגיאה לא ידועה בשליחת הבקשה.';
            Alert.alert('שגיאה בשליחת בקשה', `אירעה שגיאה: ${errorMessage}`);
        } finally {
            onClose();
        }
    }, [user, selectedEvent, currentUserUsername, db, onClose]);

    const handleOpenGroupChat = useCallback((eventTitle: string) => {
        if (eventTitle) {
            onClose();
            router.push({
                pathname: '/Chats/GroupChat/GroupChatModal',
                params: { eventTitle: eventTitle }
            });
        }
    }, [onClose]);

    const handleAuthorPress = useCallback(() => {
        if (!selectedEvent || !user) return;
        const isMyEvent = user.uid === selectedEvent.owner_uid;
        onClose();
        if (isMyEvent) {
            router.push('/profile');
        } else {
            router.push({
                pathname: '/ProfileServices/OtherUser/OtherUserProfile',
                params: { uid: selectedEvent.owner_uid }
            });
        }
    }, [selectedEvent, user, onClose]);

    const handleShareEvent = useCallback(async () => {
        if (!selectedEvent) return;
        try {
            const shareUrl = `yourappname://event?id=${selectedEvent.id}&lat=${selectedEvent.latitude}&lon=${selectedEvent.longitude}`;
            const message = `הצטרף אלי לאירוע: ${selectedEvent.event_title}!\n${selectedEvent.location || ''}\n\nלחץ על הקישור כדי לראות את פרטי האירוע באפליקציה:\n${shareUrl}`;
            await Share.share({
                message: message,
                url: shareUrl,
                title: selectedEvent.event_title,
            });
        } catch (error) {
            console.error('Error sharing event:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בשיתוף האירוע');
        }
    }, [selectedEvent]);

    const renderEventActionButton = () => {
        if (!user || !selectedEvent) return null;
        const isOwner = user.uid === selectedEvent.owner_uid;
        const isApproved = selectedEvent.approved_users?.includes(user.uid);

        if (isOwner || isApproved) {
            return (
                <TouchableOpacity
                    style={[styles.actionButton, styles.chatButton,styles.fullWidthButton]}
                    onPress={() => handleOpenGroupChat(selectedEvent.event_title)}
                >
                    <Ionicons name="chatbubbles-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>עבור לצ'אט הקבוצתי</Text>
                </TouchableOpacity>
            );
        } else {
            return (
                <TouchableOpacity
                    style={[styles.actionButton, styles.requestButton,,styles.fullWidthButton]}
                    onPress={handleSendRequest}
                >
                    <Ionicons name="paper-plane-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>שלח בקשת הצטרפות</Text>
                </TouchableOpacity>
            );
        }
    };

    // New function to choose icon based on event type
    const getEventTypeIcon = (eventType: string) => {
        switch (eventType) {
            case 'trip': return 'navigate-circle-outline';
            case 'party': return 'star-outline';
            case 'attraction': return 'map-outline';
            case 'food': return 'restaurant-outline';
            case 'nightlife': return 'wine-outline';
            case 'beach': return 'water-outline';
            case 'sport': return 'barbell-outline';
            default: return 'bookmark-outline';
        }
    };

    if (!selectedEvent) return null;

    const formattedDate = new Date(selectedEvent.event_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = new Date(selectedEvent.event_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {/* Header Container */}
                        <View style={styles.headerContainer}>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close-circle-outline" size={28} color="#999" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {selectedEvent.event_title}
                            </Text>
                            <View style={styles.closeButtonPlaceholder} />
                        </View>
                        
                        {/* Event Type Bubble with dynamic icon */}
                        <View style={styles.eventTypeBubbleContainer}>
                            <Ionicons name={getEventTypeIcon(selectedEvent.event_type)} size={16} color="#3A8DFF" style={styles.eventTypeIcon} />
                            <Text style={styles.eventTypeBubbleText}>{getEventTypeInHebrew(selectedEvent.event_type)}</Text>
                        </View>

                        <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                                <Ionicons name="person-outline" size={18} color="#3A8DFF" style={styles.detailIcon} />
                               <Text style={[styles.modalAuthorLink, { textDecorationLine: 'none' }]}>מנהל: </Text>
                                <TouchableOpacity onPress={handleAuthorPress}>
                                    <Text style={styles.modalAuthorLink}>{selectedEvent.username}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="calendar-outline" size={18} color="#555" style={styles.detailIcon} />
                                <Text style={styles.modalDate}>{formattedDate}</Text>
                                <Ionicons name="time-outline" size={18} color="#555" style={styles.detailIcon} />
                                <Text style={styles.modalDate}>{formattedTime}</Text>
                            </View>
                            {selectedEvent.description && (
                                <View style={styles.descriptionContainer}>
                                    <View style={styles.descriptionHeader}>
                                        <Ionicons name="information-circle-outline" size={18} color="#555" style={styles.detailIconDescription} />
                                        <Text style={styles.modalDescriptionTitle}>תיאור האירוע</Text>
                                    </View>
                                    <Text style={styles.modalDescription}>{selectedEvent.description}</Text>
                                </View>
                            )}
                        </View>

                        {renderEventActionButton()}
                        
                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.shareButton, styles.halfWidthButton]}
                                onPress={handleShareEvent}
                            >
                                <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>שתף אירוע</Text>
                            </TouchableOpacity>
                            {selectedEvent.latitude && selectedEvent.longitude && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.navigationButton, styles.halfWidthButton]}
                                    onPress={handleOpenInMaps}
                                >
                                    <Ionicons name="navigate-circle-outline" size={24} color="#FFFFFF" />
                                    <View style={styles.navigationButtonTextContainer}>
                                        <Text style={styles.actionButtonText}>נווט לאירוע</Text>
                                        {eventDistance && (
                                            <Text style={styles.distanceText}>({eventDistance} ק"מ)</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '85%',
        maxWidth: 380,
        padding: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    headerContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        paddingBottom: 5,
    },
    modalTitle: {
        fontSize: 24, // Reverted to a static size
        fontWeight: '700',
        color: '#333',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
        flexWrap: 'wrap',
    },
    closeButton: {
        padding: 5,
        zIndex: 1,
    },
    closeButtonPlaceholder: {
        width: 28 + 10,
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
        transform: [{ scaleX: -1 }], // Flip icon to match RTL layout
    },
    eventTypeBubbleText: {
        color: '#3A8DFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    detailsContainer: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    detailIcon: {
        marginLeft: 0,
        marginRight: 10,
        width: 20,
        textAlign: 'center',
    },
    modalAuthorLink: {
        fontSize: 15,
        color: '#3A8DFF',
        textAlign: 'right',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    modalAuthorPrefix: {
        fontSize: 15,
        color: '#555',
        textAlign: 'right',
    },
    modalDate: {
        fontSize: 15,
        color: '#555',
        textAlign: 'right',
    },
    descriptionContainer: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    descriptionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 5,
    },
    modalDescriptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#444',
        marginRight: 5,
        textAlign: 'right',
    },
    detailIconDescription: {
        marginLeft: 0,
        marginRight: 10,
        width: 20,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
        textAlign: 'right',
        marginRight: 15,
        marginTop: 0,
    },
    actionButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
    },
    requestButton: {
        backgroundColor: '#3A8DFF',
    },
    chatButton: {
        backgroundColor: '#3A8DFF',
    },
    buttonsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    shareButton: {
        backgroundColor: '#3A8DFF',
        paddingHorizontal: 12,
    },
    navigationButton: {
        backgroundColor: '#3A8DFF',
    },
    halfWidthButton: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 12,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navigationButtonTextContainer: {
        alignItems: 'center',
        marginLeft: 0,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 2,
        paddingLeft: 5,
        textAlign: 'center',
    },
    distanceText: {
        fontSize: 11,
        color: '#FFFFFF',
        fontWeight: 'normal',
        marginTop: 2,
    },
    fullWidthButton: {
        width: '100%',
    },
});

export default EventDetailsModal;