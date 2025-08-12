// app/IndexServices/EventDetailsModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
// Note: We need all these imports to handle the Firebase logic
import { addDoc, collection, getDocs, getFirestore, query, serverTimestamp, where } from 'firebase/firestore';
import React from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    };

    const eventDistance = React.useMemo(() => {
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

    const handleSendRequest = async () => {
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

        } catch (error: any) {
            console.error('Error sending request:', error);
            const errorMessage = error.message || 'אירעה שגיאה לא ידועה בשליחת הבקשה.';
            Alert.alert('שגיאה בשליחת בקשה', `אירעה שגיאה: ${errorMessage}\n\nאנא ודא שחוקי האבטחה של Firebase מעודכנים כראוי.`);
        } finally {
            onClose();
        }
    };

    const handleOpenGroupChat = (eventTitle: string) => {
        if (eventTitle) {
            onClose();
            router.push({
                pathname: '/Chats/GroupChatModal',
                params: { eventTitle: eventTitle }
            });
        }
    };

    const handleAuthorPress = () => {
        if (!selectedEvent || !user) return;

        const isMyEvent = user.uid === selectedEvent.owner_uid;
        onClose();

        if (isMyEvent) {
            router.push('/profile');
        } else {
            router.push({
                pathname: '/ProfileServices/OtherUserProfile',
                params: { uid: selectedEvent.owner_uid }
            });
        }
    };

    const renderEventActionButton = () => {
        if (!user || !selectedEvent) return null;

        const isOwner = user.uid === selectedEvent.owner_uid;
        const isApproved = selectedEvent.approved_users?.includes(user.uid);

        if (isOwner || isApproved) {
            return (
                <TouchableOpacity
                    style={[styles.actionButton, styles.chatButton]}
                    onPress={() => handleOpenGroupChat(selectedEvent.event_title)}
                >
                    <Text style={styles.actionButtonText}>עבור לצט הקבוצתי</Text>
                    <Ionicons name="chatbubbles-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            );
        } else {
            return (
                <TouchableOpacity
                    style={[styles.actionButton, styles.requestButton]}
                    onPress={handleSendRequest}
                >
                    <Text style={styles.actionButtonText}>שלח בקשת הצטרפות</Text>
                    <Ionicons name="paper-plane-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            );
        }
    };

    if (!selectedEvent) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {/* UPDATED HEADER CONTAINER */}
                        <View style={styles.headerContainer}>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close-circle-outline" size={28} color="#999" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle} numberOfLines={2}>
                                {selectedEvent.event_title}
                            </Text>
                            <View style={styles.closeButtonPlaceholder} />
                        </View>

                        <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                                <Ionicons name="person-outline" size={18} color="#555" style={styles.detailIcon} />
                                <Text style={styles.modalAuthorPrefix}>מאת: </Text>
                                <TouchableOpacity onPress={handleAuthorPress}>
                                    <Text style={styles.modalAuthorLink}>{selectedEvent.username}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="calendar-outline" size={18} color="#555" style={styles.detailIcon} />
                                <Text style={styles.modalDate}>{new Date(selectedEvent.event_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
                            </View>
                            {selectedEvent.location && (
                                <View style={styles.detailRow}>
                                    <Ionicons name="location-outline" size={18} color="#555" style={styles.detailIcon} />
                                    <Text style={styles.modalLocation}>{selectedEvent.location}</Text>
                                </View>
                            )}
                            {eventDistance && (
                                <View style={styles.detailRow}>
                                    <Ionicons name="navigate-outline" size={18} color="#3A8DFF" style={styles.detailIcon} />
                                    <Text style={styles.modalDistance}>מרחק ממיקומך:</Text>
                                    <Text style={styles.modalDistance}><Text style={styles.distanceValue}>{eventDistance} קמ</Text></Text>
                                </View>
                            )}
                            {selectedEvent.description && (
                                <View style={styles.descriptionContainer}>
                                    <View style={styles.descriptionHeader}>
                                        <Text style={styles.modalDescriptionTitle}>תיאור האירוע</Text>
                                        <Ionicons name="information-circle-outline" size={18} color="#555" style={styles.detailIconDescription} />
                                    </View>
                                    <Text style={styles.modalDescription}>{selectedEvent.description}</Text>
                                </View>
                            )}
                        </View>

                        {renderEventActionButton()}
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
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    closeButton: {
        padding: 5,
        zIndex: 1,
    },
    closeButtonPlaceholder: {
        width: 28 + 10,
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
        fontSize: 16,
        color: '#3A8DFF',
        textAlign: 'right',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    modalAuthorPrefix: {
        fontSize: 16,
        color: '#555',
        textAlign: 'right',
    },
    modalDate: {
        fontSize: 16,
        color: '#555',
        textAlign: 'right',
        flex: 1,
    },
    modalLocation: {
        fontSize: 16,
        color: '#555',
        textAlign: 'right',
        flex: 1,
    },
    modalDistance: {
        fontSize: 16,
        color: '#555',
        textAlign: 'right',
        flex: 1,
    },
    distanceValue: {
        color: '#3A8DFF',
        fontWeight: 'bold',
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
        marginTop: 5,
    },
    actionButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 30,
        marginTop: 15,
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
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 'bold',
        marginRight: 10,
        marginLeft: 0,
    },
});

export default EventDetailsModal;