// app/IndexServices/EventDetailsModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  userLocation: { latitude: number; longitude: number } | null;
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
  userLocation,
}) => {

  /**
   * פונקציה לחישוב מרחק בין שתי נקודות על פני כדור הארץ (Haversine formula).
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Distance in kilometers
  };

  const eventDistance = React.useMemo(() => {
    if (userLocation && selectedEvent) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        selectedEvent.latitude,
        selectedEvent.longitude
      );
      return dist.toFixed(1); // Keep 1 decimal place for cleaner look
    }
    return null;
  }, [userLocation, selectedEvent]);

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
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => handleOpenGroupChat(selectedEvent.event_title)}
        >
          <Text style={styles.actionButtonText}>פתח צ'אט קבוצתי</Text>
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

  if (!selectedEvent) return null; // לוודא שיש אירוע נבחר לפני הצגה

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* כותרת וסגירה - סדר האלמנטים שונה עבור RTL */}
            <View style={styles.headerContainer}>
              {/* אלמנט ריק כדי לדחוף את הכותרת לאמצע ולשמור על רווח שווה */}
              <View style={styles.closeButtonPlaceholder} />
              {/* כותרת באמצע */}
              <Text style={styles.modalTitle}>{selectedEvent.event_title}</Text>
              {/* כפתור סגירה בצד ימין */}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close-circle-outline" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            {/* פרטי האירוע */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={18} color="#555" style={styles.detailIcon} />
                <Text style={styles.modalAuthor}>{selectedEvent.username} :מאת</Text>
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
                  <Ionicons name="navigate-outline" size={18} color="#FF6F00" style={styles.detailIcon} />
                  <Text style={styles.modalDistance}>מרחק ממיקומך:</Text>
                  <Text style={styles.modalDistance}><Text style={styles.distanceValue}>{eventDistance} ק"מ</Text></Text>
                </View>
              )}
              {selectedEvent.description && (
                <View style={styles.descriptionContainer}>
                  {/* אייקון ותיאור כותרת */}
                  <View style={styles.descriptionHeader}>
                    <Text style={styles.modalDescriptionTitle}>תיאור האירוע</Text>
                    <Ionicons name="information-circle-outline" size={18} color="#555" style={styles.detailIconDescription} />
                  </View>
                  {/* תיאור האירוע עצמו */}
                  <Text style={styles.modalDescription}>{selectedEvent.description}</Text>
                </View>
              )}
            </View>

            {/* כפתורי פעולה */}
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
    backgroundColor: 'rgba(0,0,0,0.6)', // רקע כהה יותר
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // פינות מעוגלות יותר
    width: '85%', // רוחב קצת יותר גדול
    maxWidth: 380, // הגבלת רוחב למסכים גדולים
    padding: 25, // ריפוד פנימי
    elevation: 10, // צל מודגש יותר לאנדרואיד
    shadowColor: '#000', // צל לאייפון
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  headerContainer: {
    flexDirection: 'row', // Keep row for close button and title positioning
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative', // For absolute positioning of title
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center', // Center the title within its flex container
    position: 'absolute', // Position absolutely to center regardless of sibling widths
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center', // For Android vertical centering
  },
  closeButton: {
    padding: 5,
    zIndex: 1, // Ensure close button is tappable above the title
  },
  closeButtonPlaceholder: { // Placeholder to balance the space taken by closeButton
    width: 28 + 10, // Ionicons size + padding to match closeButton
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row-reverse', // RTL: Icon on the right, text on the left
    alignItems: 'center',
    marginBottom: 8,
    gap: 8, // Add space between icon and text
    },
  detailIcon: {
    marginLeft: 0, // No margin on the left for RTL
    marginRight: 10, // Margin on the right to separate from text
    width: 20, // Fixed width for icon alignment
    textAlign: 'center',
  },
  modalAuthor: {
    fontSize: 16,
    color: '#555',
    textAlign: 'right', // Align text right
    flex: 1, // Allow text to take space
  },
  modalDate: {
    fontSize: 16,
    color: '#555',
    textAlign: 'right', // Align text right
    flex: 1,
  },
  modalLocation: {
    fontSize: 16,
    color: '#555',
    textAlign: 'right', // Align text right
    flex: 1,
  },
  modalDistance: {
    fontSize: 16,
    color: '#555',
    textAlign: 'right', // Align text right
    flex: 1,
  },
  distanceValue: {
    color: '#FF6F00',
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  descriptionHeader: {
    flexDirection: 'row-reverse', // RTL for icon and title
    alignItems: 'center',
    marginBottom: 5,
  },
  modalDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginRight: 5, // Margin to the right for RTL text
    textAlign: 'right',
  },
  detailIconDescription: {
    marginLeft: 0,
    marginRight: 10, // Margin to the right for RTL icon
    width: 20,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    textAlign: 'right', // Align description text right
    marginTop: 5, // Space between title/icon and description
  },
  actionButton: {
    flexDirection: 'row-reverse', // RTL for button content (icon and text)
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30, // פינות מעוגלות מאוד לכפתור
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  requestButton: {
    backgroundColor: '#FF6F00', // כתום ראשי
  },
  chatButton: {
    backgroundColor: '#FFA726', // כתום בהיר יותר לצ'אט
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17, // גודל טקסט גדול יותר
    fontWeight: 'bold',
    marginRight: 10, // Margin to the right for RTL
    marginLeft: 0, // No margin on the left for RTL
  },
});

export default EventDetailsModal;