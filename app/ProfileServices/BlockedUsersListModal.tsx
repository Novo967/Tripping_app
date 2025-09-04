import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { app } from '../../firebaseConfig';
import { useTheme } from '../ProfileServices/ThemeContext';

interface BlockedUsersListModalProps {
  isVisible: boolean;
  onClose: () => void;
  blockedUserIds: string[];
  onUnblock: (userId: string) => void;
}

const db = getFirestore(app);

export default function BlockedUsersListModal({ isVisible, onClose, blockedUserIds, onUnblock }: BlockedUsersListModalProps) {
  const [blockedUsersData, setBlockedUsersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // Fetch the data of the blocked users from Firestore
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (blockedUserIds.length === 0) {
        setBlockedUsersData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('__name__', 'in', blockedUserIds));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBlockedUsersData(users);
      } catch (error) {
        console.error('Error fetching blocked users:', error);
        Alert.alert('שגיאה', 'אירעה שגיאה בטעינת המשתמשים החסומים.');
      } finally {
        setLoading(false);
      }
    };

    if (isVisible) {
      fetchBlockedUsers();
    }
  }, [isVisible, blockedUserIds]);

  const handleUnblockUser = (userId: string, username: string) => {
    Alert.alert(
      'בטל חסימה',
      `האם אתה בטוח שברצונך לבטל את החסימה של ${username}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'בטל חסימה',
          style: 'destructive',
          onPress: () => onUnblock(userId),
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
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>משתמשים חסומים</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : blockedUsersData.length > 0 ? (
            <ScrollView style={styles.usersContainer}>
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
            <Text style={[styles.noUsersText, { color: theme.colors.onSurface }]}>
              אין לך משתמשים חסומים.
            </Text>
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
    marginBottom: 15,
  },
  loader: {
    marginTop: 20,
  },
  usersContainer: {
    width: '100%',
  },
  userItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  icon: {
    marginRight: 10,
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