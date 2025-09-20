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
import { useTheme } from '../ThemeContext';

interface BlockUserModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const db = getFirestore(app);

export default function BlockUserModal({ isVisible, onClose }: BlockUserModalProps) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingBlockedList, setLoadingBlockedList] = useState(true);
  const [blockedUsersData, setBlockedUsersData] = useState<any[]>([]);
  const { theme } = useTheme();
  const currentUser = auth.currentUser;

  // Fetch the data of the blocked users from Firestore
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!currentUser || !isVisible) {
        setBlockedUsersData([]);
        setLoadingBlockedList(false);
        return;
      }

      setLoadingBlockedList(true);
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const blockedUserIds = userData.blocked_users || [];
          
          if (blockedUserIds.length > 0) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('__name__', 'in', blockedUserIds));
            const querySnapshot = await getDocs(q);
            const users = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            setBlockedUsersData(users);
          } else {
            setBlockedUsersData([]);
          }
        }
      } catch (error) {
        console.error('Error fetching blocked users:', error);
        Alert.alert('שגיאה', 'אירעה שגיאה בטעינת המשתמשים החסומים.');
      } finally {
        setLoadingBlockedList(false);
      }
    };

    if (isVisible) {
      fetchBlockedUsers();
    }
  }, [isVisible, currentUser]);

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    try {
      const usersRef = collection(db, 'users');
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
        .filter(user => user.id !== currentUser?.uid);
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בחיפוש משתמשים.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleUnblockUser = async (userToUnblockId: string, username: string) => {
    if (!currentUser) return;
    Alert.alert(
      'בטל חסימה',
      `האם אתה בטוח שברצונך לבטל את החסימה של ${username}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'בטל חסימה',
          style: 'destructive',
          onPress: async () => {
            try {
              const userDocRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userDocRef, {
                blocked_users: arrayRemove(userToUnblockId),
              });
              setBlockedUsersData(prev => prev.filter(user => user.id !== userToUnblockId));
              Alert.alert('הצלחה', 'החסימה בוטלה בהצלחה!');
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('שגיאה', 'ביטול החסימה נכשל. נסה שוב מאוחר יותר.');
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async (userToBlockId: string, userToBlockUsername: string) => {
    if (!currentUser) return;

    Alert.alert(
      'אשר חסימה',
      `האם אתה בטוח שברצונך לחסום את ${userToBlockUsername}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'חסום',
          style: 'destructive',
          onPress: async () => {
            try {
              const userDocRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userDocRef, {
                blocked_users: arrayUnion(userToBlockId),
              });
              const newUserBlockedData = { id: userToBlockId, username: userToBlockUsername };
              setBlockedUsersData(prev => [...prev, newUserBlockedData]);
              Alert.alert('הצלחה', `${userToBlockUsername} נחסם בהצלחה.`);
              setSearchResults([]);
              setSearchText('');
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('שגיאה', 'חסימת המשתמש נכשלה. נסה שוב מאוחר יותר.');
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
          <Text style={[styles.explanationText, { color: theme.colors.shadow }]}>
            חסימת משתמש תמנע ממנו לראות אותך על המפה, לצפות בפרופיל שלך ולשלוח לך הודעות.
          </Text>

          {/* Search Section */}
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            placeholder="חפש משתמש..."
            placeholderTextColor={theme.colors.shadow}
            value={searchText}
            onChangeText={handleSearch}
          />
          
          {loadingSearch ? (
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
                searchText.length >= 3 && <Text style={[styles.noResultsText, { color: theme.colors.shadow }]}>לא נמצאו משתמשים.</Text>
              )}
            </ScrollView>
          )}

          {/* Blocked Users List Section */}
          <View style={styles.blockedUsersSection}>
            <Text style={[styles.blockedListTitle, { color: theme.colors.text }]}>
              משתמשים חסומים ({blockedUsersData.length})
            </Text>
            {loadingBlockedList ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
            ) : blockedUsersData.length > 0 ? (
              <ScrollView style={styles.blockedUsersContainer}>
                {blockedUsersData.map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userItem, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleUnblockUser(user.id, user.username)}
                  >
                    <Ionicons name="person-circle" size={30} color={theme.colors.text} style={styles.icon} />
                    <Text style={[styles.usernameText, { color: theme.colors.text }]}>{user.username}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.noUsersText, { color: theme.colors.surface }]}>
                אין לך משתמשים חסומים.
              </Text>
            )}
          </View>

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
    maxHeight: '80%',
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
    maxHeight: 150,
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
  // Blocked Users List Styles
  blockedUsersSection: {
    marginTop: 20,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
  blockedListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  blockedUsersContainer: {
    width: '100%',
  },
  userItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  usernameText: {
    fontSize: 18,
    textAlign: 'right',
  },
  noUsersText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});