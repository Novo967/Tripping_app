import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { useRouter } from 'expo-router';
import { deleteUser } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { deleteObject, getStorage, listAll, ref } from 'firebase/storage';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { app, auth } from '../../firebaseConfig';
import { useTheme } from '../ProfileServices/ThemeContext';

interface DeleteAccountModalProps {
    isVisible: boolean;
    onClose: () => void;
    profilePic: string | null;
    gallery: string[];
}

const db = getFirestore(app);
const storage = getStorage(app);

export default function DeleteAccountModal({
    isVisible,
    onClose,
}: DeleteAccountModalProps) {
    const [isChecked, setChecked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { theme } = useTheme();
    const router = useRouter();

    const handleDeleteAccount = async () => {
        if (!isChecked) {
            Alert.alert(
                'אישור חובה',
                'עליך לסמן שאתה מבין כי מחיקת החשבון היא לצמיתות.'
            );
            return;
        }

        Alert.alert(
            "אישור סופי",
            "שים לב, לא ניתן לשחזר חשבון לאחר מחיקתו. האם אתה בטוח?",
            [
                { text: "ביטול", style: "cancel" },
                {
                    text: "מחק לצמיתות",
                    style: "destructive",
                    onPress: async () => {
                        const user = auth.currentUser;
                        if (!user) {
                            Alert.alert('שגיאה', 'אין משתמש מחובר.');
                            onClose();
                            return;
                        }

                        setIsLoading(true);

                        try {
                            console.log("Starting account deletion process for user:", user.uid);
                            
                            // 1. Delete all user images from Firebase Storage
                            try {
                                console.log("Attempting to delete all user images from Firebase Storage.");
                                const userFolderRef = ref(storage, `gallery_images/${user.uid}`);
                                const filesList = await listAll(userFolderRef);
                                
                                const deletePromises = filesList.items.map(itemRef => deleteObject(itemRef));
                                await Promise.all(deletePromises);
                                console.log(`Successfully deleted ${filesList.items.length} files from storage.`);
                            } catch (storageError: any) {
                                console.warn(`Could not delete images from storage, but continuing with account deletion: ${storageError.message}`);
                            }

                            // 2. Delete all likes from the 'imageLikes' collection
                            console.log("Attempting to delete user's likes from Firestore.");
                            const likesQuery = query(collection(db, 'imageLikes'), where('likerId', '==', user.uid));
                            const likesSnapshot = await getDocs(likesQuery);
                            const deleteLikesPromises = likesSnapshot.docs.map(doc => deleteDoc(doc.ref));
                            await Promise.all(deleteLikesPromises);
                            console.log("Likes deletion complete.");

                            // 3. Delete the user document from the 'users' collection in Firestore
                            console.log("Attempting to delete user document from Firestore.");
                            const userDocRef = doc(db, 'users', user.uid);
                            await deleteDoc(userDocRef);
                            console.log("User document deletion complete.");

                            // 4. Delete the user from Firebase Authentication
                            console.log("Attempting to delete user from Authentication.");
                            await deleteUser(user);
                            console.log("User successfully deleted from Authentication.");

                            Alert.alert("הצלחה", "חשבונך נמחק בהצלחה.");
                            router.replace('/Authentication/login');

                        } catch (error: any) {
                            console.error('Error deleting account:', error);
                            if (error.code === 'auth/requires-recent-login') {
                                Alert.alert(
                                    'נדרשת כניסה מחדש',
                                    'אנא התנתק והתחבר שוב כדי לבצע פעולה זו.'
                                );
                            } else {
                                Alert.alert('שגיאה', `לא הצלחנו למחוק את החשבון: ${error.message}`);
                            }
                        } finally {
                            setIsLoading(false);
                            onClose();
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View
                    style={[
                        styles.modalView,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                    ]}
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                                מוחק נתונים...
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.header}>
                                <Ionicons
                                    name="warning-outline"
                                    size={50}
                                    color="#FF3B30"
                                />
                                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                    מחיקת חשבון לצמיתות
                                </Text>
                            </View>
                            <Text style={[styles.modalText, { color: theme.colors.text }]}>
                                פעולה זו היא בלתי הפיכה.
                            </Text>
                            <Text style={[styles.modalText, { color: theme.colors.text }]}>
                                לאחר מחיקת החשבון, כל הנתונים שלך, כולל תמונות, מידע אישי והתאמות, יימחקו לצמיתות ולא יהיה ניתן לשחזרם.
                            </Text>

                            <View style={styles.checkboxContainer}>
                                <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                                    אני מבין/ה כי מחיקת החשבון היא לצמיתות.
                                </Text>
                                <Checkbox
                                    style={styles.checkbox}
                                    value={isChecked}
                                    onValueChange={setChecked}
                                    color={isChecked ? theme.colors.primary : theme.colors.text}
                                />
                                
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonClose]}
                                    onPress={onClose}
                                >
                                    <Text style={[styles.textStyle, { color: theme.colors.text }]}>ביטול</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        isChecked ? styles.buttonDelete : styles.buttonDisabled,
                                    ]}
                                    onPress={handleDeleteAccount}
                                    disabled={!isChecked}
                                >
                                    <Text style={styles.textStyle}>מחק חשבון</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 10,
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 20,
    },
    checkbox: {
        marginRight: 8,
    },
    checkboxLabel: {
        padding:6,
        fontSize: 14,
        textAlign: 'right',
    },
    buttonContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 10,
        padding: 12,
        elevation: 2,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    buttonClose: {
        backgroundColor: '#FFF',
        borderWidth: 1,
    },
    buttonDelete: {
        backgroundColor: '#FF3B30',
    },
    buttonDisabled: {
        backgroundColor: '#FF3B30',
        opacity: 0.5,
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500',
    },
});
