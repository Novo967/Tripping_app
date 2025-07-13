// app/IndexServices/EventDetailsModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router'; // ייבוא ה-router
import React from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

// הגדרת ממשק (interface) עבור selectedEvent
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
  event_owner_uid: string;
  approved_users?: string[];
}

interface EventDetailsModalProps {
  visible: boolean;
  selectedEvent: SelectedEventType | null;
  onClose: () => void;
  user: any; // המשתמש המחובר כרגע
  currentUserUsername: string; // שם המשתמש המחובר
  SERVER_URL: string; // כתובת השרת
}

/**
 * קומפוננטת מודל להצגת פרטי אירוע.
 * מאפשרת שליחת בקשת הצטרפות לאירוע או פתיחת צ'אט קבוצתי.
 */
const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  visible,
  selectedEvent,
  onClose,
  user,
  currentUserUsername,
  SERVER_URL,
}) => {

  /**
   * שולח בקשה להצטרפות לאירוע.
   */
  const handleSendRequest = async () => {
    if (!user || !selectedEvent || !currentUserUsername) {
      Alert.alert('שגיאה', 'לא ניתן לשלוח בקשה כרגע. נתונים חסרים.');
      return;
    }

    if (user.uid === selectedEvent.event_owner_uid) {
      Alert.alert('שגיאה', 'אינך יכול לשלוח בקשה לאירוע שאתה מנהל.');
      return;
    }

    try {
      const response = await fetch(`${SERVER_URL}/send-event-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_uid: user.uid,
          sender_username: currentUserUsername,
          receiver_uid: selectedEvent.event_owner_uid,
          event_id: selectedEvent.id,
          event_title: selectedEvent.event_title,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        Alert.alert('הצלחה', 'הבקשה נשלחה למנהל האירוע!');
      } else {
        Alert.alert('שגיאה', result.error || 'שליחת הבקשה נכשלה.');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בשליחת הבקשה.');
    } finally {
      onClose(); // סגור את המודל לאחר שליחת הבקשה
    }
  };

  /**
   * פותח צ'אט קבוצתי עבור אירוע נבחר.
   * @param eventTitle כותרת האירוע
   */
  const handleOpenGroupChat = (eventTitle: string) => {
    if (eventTitle) {
      onClose(); // סגור את המודל
      router.push({
        pathname: '/Chats/GroupChatModal',
        params: { eventTitle: eventTitle }
      });
    }
  };

  /**
   * מציג את כפתור הפעולה המתאים לאירוע (שליחת בקשה או פתיחת צ'אט).
   * @returns רכיב TouchableOpacity או null
   */
  const renderEventActionButton = () => {
    if (!user || !selectedEvent) return null;

    const isOwner = user.uid === selectedEvent.event_owner_uid;
    const isApproved = selectedEvent.approved_users?.includes(user.uid);

    if (isOwner || isApproved) {
      return (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleOpenGroupChat(selectedEvent.event_title)}
        >
          <Text style={styles.chatButtonText}>פתח צ'אט קבוצתי</Text>
          <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleSendRequest}
        >
          <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
          <Text style={styles.requestButtonText}>שלח בקשה למנהל האירוע</Text>
        </TouchableOpacity>
      );
    }
  };

  if (!selectedEvent) return null; // לוודא שיש אירוע נבחר לפני הצגה

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{selectedEvent.event_title}</Text>
            <Text style={styles.modalDate}>{new Date(selectedEvent.event_date).toLocaleDateString('he-IL')}</Text>
            <Text style={styles.modalAuthor}>מאת: {selectedEvent.username}</Text>

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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
    textAlign: 'center',
  },
  modalDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalAuthor: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
  requestButton: {
    backgroundColor: '#FF6F00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  chatButton: {
    backgroundColor: '#FF6F00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default EventDetailsModal;
