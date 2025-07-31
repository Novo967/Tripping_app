// app/IndexServices/UserDetailsModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router'; // ייבוא ה-router
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

// הגדרת ממשק (interface) עבור selectedUser
interface SelectedUserType {
  uid: string;
  username: string;
  latitude: number;
  longitude: number;
}

interface UserDetailsModalProps {
  visible: boolean;
  selectedUser: SelectedUserType | null;
  onClose: () => void;
  currentUserUid: string | null | undefined; // UID של המשתמש המחובר
  // onOpenPrivateChat: (targetUserUid: string, targetUsername: string) => void; // הפונקציה הזו כבר לא בשימוש ישיר במודל
}

/**
 * קומפוננטת מודל להצגת פרטי משתמש אחר.
 * מאפשרת צפייה בפרופיל ושליחת הודעה.
 */
const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  visible,
  selectedUser,
  onClose,
  currentUserUid,
  // onOpenPrivateChat, // הפונקציה הזו כבר לא בשימוש ישיר במודל
}) => {

  if (!selectedUser) return null; // לוודא שיש משתמש נבחר לפני הצגה

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{selectedUser.username}</Text>

            <View style={styles.buttonContainer}>
              {/* כפתור צפייה בפרופיל */}
              <TouchableOpacity
                onPress={() => {
                  onClose(); // סגור מודל
                  if (selectedUser.uid === currentUserUid) {
                    router.push({ pathname: '/profile' }); // ניתוב לפרופיל המשתמש העצמי
                  } else {
                    router.push({ pathname: '/ProfileServices/OtherUserProfile', params: { uid: selectedUser.uid } });
                  }
                }}
                style={styles.profileButton}
              >
                <Text style={styles.profileButtonText}>
                  צפה בפרופיל
                </Text>
              </TouchableOpacity>

              {/* כפתור שליחת הודעה */}
              {currentUserUid && selectedUser.uid !== currentUserUid && (
                <TouchableOpacity
                  onPress={() => {
                    onClose(); // סגור את המודל לפני פתיחת הצ'אט
                    router.push({
                      pathname: '/Chats/chatModal',
                      params: {
                        otherUserId: selectedUser.uid,
                        otherUsername: selectedUser.username,
                        // otherUserImage: '', // אם יש לך תמונת משתמש, הוסף אותה לכאן
                      },
                    });
                  }}
                  style={styles.sendMessageButton}
                >
                  <Text style={styles.sendMessageButtonText}>שלח הודעה</Text>
                  <Ionicons name="chatbox-outline" size={20} color="white" style={{ marginLeft: 8 }} />
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 14,
    width: 300,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  modalTitle: {
    fontSize: 22, // גודל כותרת גדול יותר
    fontWeight: 'bold',
    marginBottom: 20, // רווח גדול יותר מתחת לכותרת
    color: '#333', // צבע כהה יותר
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'column', // כפתורים בטור
    width: '100%', // תופס את כל רוחב המודל
    alignItems: 'center', // ממורכזים
  },
  profileButton: {
    backgroundColor: '#3A8DFF', // צבע כתום
    paddingVertical: 14, // ריפוד גדול יותר
    paddingHorizontal: 25,
    borderRadius: 10, // פינות מעוגלות יותר
    width: '80%', // רוחב קבוע
    marginBottom: 12, // רווח בין כפתורים
    flexDirection: 'row', // לאפשר אייקון אם יתווסף
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  profileButtonText: {
    color: 'white',
    fontWeight: '700', // טקסט מודגש יותר
    fontSize: 17, // גודל פונט גדול יותר
  },
  sendMessageButton: {
    backgroundColor: '#007AFF', // כחול עבור כפתור הודעה
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    width: '80%', // רוחב קבוע כמו כפתור הפרופיל
    flexDirection: 'row-reverse', // כדי שהאייקון יהיה מימין
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  sendMessageButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 17,
    marginRight: 8, // רווח בין הטקסט לאייקון
  },
});

export default UserDetailsModal;