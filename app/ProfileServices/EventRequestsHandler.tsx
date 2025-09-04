// app/ProfileServices/EventRequestsHandler.tsx
import { router } from 'expo-router';
import { arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

interface EventRequest {
    id: string;
    sender_uid: string;
    sender_username: string;
    event_title: string;
    event_id: string;
    status: 'pending' | 'accepted' | 'declined';
}

interface EventRequestsHandlerProps {
    isVisible: boolean;
    onClose: () => void;
    setPendingRequests: React.Dispatch<React.SetStateAction<any[]>>;
}

const EventRequestsHandler: React.FC<EventRequestsHandlerProps> = ({ isVisible, onClose, setPendingRequests }) => {
    const { theme } = useTheme();
    const [requests, setRequests] = useState<EventRequest[]>([]);

    useEffect(() => {
        if (!auth.currentUser || !isVisible) {
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
            setPendingRequests(pendingRequests);
        }, (error) => {
            console.error('Error fetching pending requests:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בטעינת הבקשות.');
            setRequests([]);
            setPendingRequests([]);
        });

        return () => unsubscribe();
    }, [isVisible, setPendingRequests]);

    const handleUsernamePress = (request: EventRequest) => {
        router.push({
            pathname: "/ProfileServices/OtherUser/OtherUserProfile",
            params: { uid: request.sender_uid }
        });
    };

    const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
        try {
            const request = requests.find(req => req.id === requestId);
            if (!request) {
                Alert.alert('שגיאה', 'הבקשה לא נמצאה.');
                return;
            }

            const updatedRequests = requests.filter(req => req.id !== requestId);
            setRequests(updatedRequests);
            setPendingRequests(updatedRequests);

            const requestRef = doc(db, 'event_requests', requestId);
            await updateDoc(requestRef, {
                status: action,
            });

            if (action === 'accepted') {
                const pinRef = doc(db, 'pins', request.event_id);
                await updateDoc(pinRef, {
                    approved_users: arrayUnion(request.sender_uid),
                });

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

            const q = query(
                collection(db, 'event_requests'),
                where('receiver_uid', '==', auth.currentUser?.uid),
                where('status', '==', 'pending')
            );

            const snapshot = await getDocs(q);
            const refreshedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as EventRequest));

            setRequests(refreshedRequests);
            setPendingRequests(refreshedRequests);
        }
    };

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
        </>
    );
};

const styles = StyleSheet.create({
    requestsPanel: {
        position: 'absolute',
        top: -40,
        left: 10,
        right: 10,
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
});

export default EventRequestsHandler;
