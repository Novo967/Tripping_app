import { Ionicons } from '@expo/vector-icons';
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { app, auth } from '../../firebaseConfig';
import { useTheme } from '../ProfileServices/ThemeContext';
import BlockedUsersListModal from './BlockedUsersListModal';
interface BlockUserModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const db = getFirestore(app);

export default function BlockUserModal({ isVisible, onClose }: BlockUserModalProps) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false); // New state for blocking process
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]); // To store current user's blocked list
  const { theme } = useTheme();
  const currentUser = auth.currentUser;
  const [isBlockedListVisible, setBlockedListVisible] = useState(false);

  const handleUnblockUser = async (userToUnblockId: string) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        blocked_users: arrayRemove(userToUnblockId),
      });
      setBlockedUsers(prev => prev.filter(uid => uid !== userToUnblockId));
      Alert.alert('הצלחה', 'החסימה בוטלה בהצלחה!');
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('שגיאה', 'ביטול החסימה נכשל. נסה שוב מאוחר יותר.');
    }
  };
  // Fetch the current user's blocked list when the modal opens
  useEffect(() => {
    if (isVisible && currentUser) {
        const fetchBlockedUsers = async () => {
            const userDocRef = doc(db, 'users', currentUser.uid);
            // Use a direct getDoc call for simplicity and efficiency
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                setBlockedUsers(userData.blocked_users || []);
            }
        };
        fetchBlockedUsers();
    }
}, [isVisible, currentUser]);

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Case-insensitive query is not natively supported in Firestore.
      // A common workaround is to store a lowercase version of the username.
      // Here, we'll do a simple prefix search and filter on the client side.
      const q = query(
        usersRef,
        where('username_lowercase', '>=', text.toLowerCase()),
        where('username_lowercase', '<=', text.toLowerCase() + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(user => user.id !== currentUser?.uid); // Filter out the current user
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בחיפוש משתמשים.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userToBlockId: string, userToBlockUsername: string) => {
    if (!currentUser) return;

    // Show a confirmation dialog
    Alert.alert(
      'אשר חסימה',
      `האם אתה בטוח שברצונך לחסום את ${userToBlockUsername}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'חסום',
          style: 'destructive',
          onPress: async () => {
            setIsBlocking(true);
            try {
              const userDocRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userDocRef, {
                blocked_users: arrayUnion(userToBlockId),
              });
              setBlockedUsers(prev => [...prev, userToBlockId]);
              Alert.alert('הצלחה', `${userToBlockUsername} נחסם בהצלחה.`);
              setSearchResults([]); // Clear search results after blocking
              setSearchText('');
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('שגיאה', 'חסימת המשתמש נכשלה. נסה שוב מאוחר יותר.');
            } finally {
              setIsBlocking(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>חסום משתמש</Text>

          <Text style={[styles.explanationText, { color: theme.colors.onSurface }]}>
            חסימת משתמש תמנע ממנו לראות אותך על המפה, לצפות בפרופיל שלך ולשלוח לך הודעות.
          </Text>

          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            placeholder="חפש משתמש..."
            placeholderTextColor={theme.colors.onSurface}
            value={searchText}
            onChangeText={handleSearch}
          />
          
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : (
            <ScrollView style={styles.resultsContainer}>
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleBlockUser(user.id, user.username)}
                  >
                    <Ionicons name="person-circle" size={30} color={theme.colors.text} style={styles.icon} />
                    <Text style={[styles.resultText, { color: theme.colors.text }]}>{user.username}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                searchText.length >= 3 && <Text style={[styles.noResultsText, { color: theme.colors.onSurface }]}>לא נמצאו משתמשים.</Text>
              )}
            </ScrollView>
          )}

          {/* Section for blocked users */}
          <View style={styles.blockedUsersSection}>
            {blockedUsers.length > 0 ? (
                <TouchableOpacity style={styles.blockedListButton} onPress={() => setBlockedListVisible(true)}>
                <Text style={styles.blockedListButtonText}>הצג משתמשים חסומים ({blockedUsers.length})</Text>
                </TouchableOpacity>
            ) : (
                <Text style={[styles.noBlockedUsersText, { color: theme.colors.onSurface }]}>
                אין משתמשים חסומים.
                </Text>
            )}
            </View>
            <BlockedUsersListModal
            isVisible={isBlockedListVisible}
            onClose={() => setBlockedListVisible(false)}
            blockedUserIds={blockedUsers}
            onUnblock={handleUnblockUser}
            />
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
    width: '90%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  explanationText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  searchInput: {
    width: '100%',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    textAlign: 'right',
  },
  resultsContainer: {
    width: '100%',
  },
  resultItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  resultText: {
    fontSize: 18,
    textAlign: 'right',
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  blockedUsersSection: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  blockedListButton: {
    backgroundColor: '#007AFF', // You can change the color
    padding: 10,
    borderRadius: 10,
  },
  blockedListButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noBlockedUsersText: {
    textAlign: 'center',
    fontSize: 16,
  },
});