import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // שינוי כאן
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { app, auth, db } from '../../firebaseConfig'; // שינוי כאן
import { useTheme } from './ThemeContext';

interface User {
    id: string;
    username: string;
    profileImage: string;
}

const REPORT_REASONS = [
    'תוכן פוגעני או בלתי הולם',
    'התחזות למשתמש אחר',
    'הטרדה או בריונות',
    'ספאם או פרסומות בלתי רצויות',
    'פעילות חשודה או הונאה',
    'אחר'
];

export default function ReportUserModal() {
    const { theme } = useTheme();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [foundUsers, setFoundUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [otherReason, setOtherReason] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const currentUser = auth.currentUser;

    const functions = getFunctions(app, 'me-west1'); // אתחול Functions כאן

    useEffect(() => {
        if (searchQuery.length > 2) {
            const fetchUsers = async () => {
                setIsSearching(true);
                try {
                    const q = query(
                        collection(db, 'users'),
                        where('username_lowercase', '>=', searchQuery.toLowerCase()),
                        where('username_lowercase', '<=', searchQuery.toLowerCase() + '\uf8ff')
                    );
                    const querySnapshot = await getDocs(q);
                    const usersList = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as User[];

                    const filteredUsers = usersList.filter(user => user.id !== currentUser?.uid);
                    setFoundUsers(filteredUsers);
                } catch (error) {
                    console.error("Error searching for users: ", error);
                } finally {
                    setIsSearching(false);
                }
            };
            fetchUsers();
        } else {
            setFoundUsers([]);
        }
    }, [searchQuery, currentUser]);

    const handleSelectReason = (reason: string) => {
        if (reason === 'אחר') {
            if (selectedReasons.includes('אחר')) {
                setSelectedReasons(selectedReasons.filter(r => r !== 'אחר'));
            } else {
                setSelectedReasons([...selectedReasons, 'אחר']);
            }
        } else {
            const isSelected = selectedReasons.includes(reason);
            const newReasons = isSelected
                ? selectedReasons.filter(r => r !== reason)
                : [...selectedReasons.filter(r => r !== 'אחר'), reason];
            setSelectedReasons(newReasons);
            setOtherReason('');
        }
    };

    const handleSendReport = async () => {
        if (!selectedUser) {
            Alert.alert('שגיאה', 'יש לבחור משתמש לדיווח.');
            return;
        }

        if (selectedReasons.length === 0 && !otherReason.trim()) {
            Alert.alert('שגיאה', 'יש לבחור סיבת דיווח או להזין סיבה אחרת.');
            return;
        }

        const sendReport = httpsCallable(functions, 'sendReportEmail');

        try {
            await sendReport({
                reportedUserId: selectedUser.id,
                reportedUserUsername: selectedUser.username,
                reasons: selectedReasons,
                otherReason: selectedReasons.includes('אחר') ? otherReason.trim() : null,
            });

            Alert.alert('תודה!', 'הדיווח נשלח בהצלחה. נטפל בו בהקדם.');
            router.back();
        } catch (error) {
            console.error('Error calling Cloud Function:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בשליחת הדיווח. אנא נסה שוב מאוחר יותר.');
        }
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={[styles.userItem, { borderColor: theme.colors.border, backgroundColor: selectedUser?.id === item.id ? theme.colors.primaryLight : 'transparent' }]}
            onPress={() => setSelectedUser(item)}
        >
            <View style={styles.userInfo}>
                {/* {item.profileImage && <Image source={{ uri: item.profileImage }} style={styles.profileImage} />} */}
                <Text style={[styles.userText, { color: theme.colors.text }]}>{item.username}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={true}
            onRequestClose={() => router.back()}
        >
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close-circle-outline" size={30} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                        דווח על משתמש
                    </Text>
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>בחר משתמש לדיווח:</Text>
                    <TextInput
                        style={[styles.searchInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                        placeholder="חפש משתמש לפי שם משתמש..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onFocus={() => {
                            if (selectedUser) {
                                setSelectedUser(null);
                                setSearchQuery('');
                            }
                        }}
                    />

                    {isSearching ? (
                        <ActivityIndicator style={styles.loadingIndicator} size="small" color={theme.colors.primary} />
                    ) : selectedUser ? (
                        <View style={[styles.selectedUserContainer, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary }]}>
                            <Text style={[styles.selectedUserText, { color: theme.colors.text }]}>משתמש נבחר: {selectedUser.username}</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={foundUsers}
                            keyExtractor={(item) => item.id}
                            renderItem={renderUserItem}
                            style={styles.userList}
                            ListEmptyComponent={() => (
                                <Text style={[styles.emptyListText, { color: theme.colors.textSecondary }]}>
                                    {searchQuery.length > 2 ? 'לא נמצאו משתמשים.' : 'הקלד לפחות 3 אותיות לחיפוש.'}
                                </Text>
                            )}
                        />
                    )}

                    <Text style={[styles.label, { color: theme.colors.text, marginTop: 20 }]}>מה הסיבה לדיווח?</Text>
                    <View style={styles.reasonsContainer}>
                        {REPORT_REASONS.map((reason) => (
                            <TouchableOpacity
                                key={reason}
                                style={[
                                    styles.reasonButton,
                                    {
                                        backgroundColor: selectedReasons.includes(reason) ? theme.colors.primary : theme.colors.surface,
                                        borderColor: theme.colors.border
                                    }
                                ]}
                                onPress={() => handleSelectReason(reason)}
                            >
                                <Text style={[styles.reasonText, { color: selectedReasons.includes(reason) ? '#fff' : theme.colors.text }]}>
                                    {reason}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {selectedReasons.includes('אחר') && (
                        <TextInput
                            style={[styles.otherInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                            placeholder="נא פרט את סיבת הדיווח..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={4}
                            value={otherReason}
                            onChangeText={setOtherReason}
                        />
                    )}
                </View>

                {/* Footer and Send Button */}
                <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: selectedUser ? '#0095f6' : theme.colors.textSecondary }]}
                    onPress={handleSendReport}
                    disabled={!selectedUser || (selectedReasons.length === 0 && !otherReason.trim())}
                >
                    <Text style={styles.sendButtonText}>שלח דיווח</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 50,
        direction: 'rtl',
    },
    header: {
        width: '100%',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    closeButton: {
        padding: 8,
    },
    content: {
        width: '100%',
        padding: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'right',
    },
    searchInput: {
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 10,
        textAlign: 'right',
    },
    loadingIndicator: {
        marginVertical: 10,
    },
    userList: {
        maxHeight: 200,
        marginBottom: 10,
    },
    userItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    userInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    userText: {
        fontSize: 16,
        marginRight: 10,
    },
    profileImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    selectedUserContainer: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 10,
        alignItems: 'center',
    },
    selectedUserText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    reasonsContainer: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    reasonButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        marginHorizontal: 4,
        marginVertical: 4,
    },
    reasonText: {
        fontSize: 14,
    },
    otherInput: {
        height: 100,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        textAlign: 'right',
    },
    sendButton: {
        width: '90%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        position: 'absolute',
        bottom: 20,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 20,
    },
});