// app/ProfileServices/EventRequestsHandler.tsx
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { useTheme } from './ThemeContext'; // Import useTheme

const { width } = Dimensions.get('window');
const SERVER_URL = 'https://tripping-app.onrender.com';

interface EventRequest {
  id: string;
  sender_uid: string;
  sender_username: string;
  event_title: string;
}

interface UserProfile {
  uid: string;
  username: string;
  profileImage?: string;
  bio?: string;
  location?: string;
  joinDate?: string;
  // Add other profile fields as needed
}

interface EventRequestsHandlerProps {
  isVisible: boolean;
  onClose: () => void;
  pendingRequests: EventRequest[];
  setPendingRequests: React.Dispatch<React.SetStateAction<any[]>>;
}

/**
 * EventRequestsHandler component to display and manage pending event requests.
 * מאפשר הצגה וניהול של בקשות אירוע ממתינות.
 */
const EventRequestsHandler: React.FC<EventRequestsHandlerProps> = ({ isVisible, onClose, pendingRequests, setPendingRequests }) => {
  const { theme } = useTheme(); // Use theme context
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Function to fetch pending event requests for the current user
  // פונקציה לשליפת בקשות אירוע ממתינות עבור המשתמש הנוכחי
  const fetchPendingRequests = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setPendingRequests([]);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/get-pending-event-requests?receiver_uid=${user.uid}`);
      const data = await res.json();
      if (res.ok) {
        setPendingRequests(data.requests || []);
      } else {
        console.error('Error fetching pending requests:', data.error);
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setPendingRequests([]);
    }
  }, [setPendingRequests]);

  // Function to fetch user profile
  // פונקציה לשליפת פרופיל משתמש
  const fetchUserProfile = async (uid: string, username: string) => {
    setLoadingProfile(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSelectedProfile({
          uid,
          username,
          profileImage: userData.profileImage,
          bio: userData.bio,
          location: userData.location,
          joinDate: userData.createdAt?.toDate?.()?.toLocaleDateString('he-IL') || 'לא זמין',
        });
      } else {
        // If user document doesn't exist, create basic profile
        setSelectedProfile({
          uid,
          username,
          profileImage: undefined,
          bio: 'אין מידע זמין',
          location: 'לא זמין',
          joinDate: 'לא זמין',
        });
      }
      setProfileModalVisible(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את הפרופיל');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Function to handle username press
  // פונקציה לטיפול בלחיצה על שם משתמש
  const handleUsernamePress = (request: EventRequest) => {
    fetchUserProfile(request.sender_uid, request.sender_username);
  };

  useEffect(() => {
    if (isVisible) {
      fetchPendingRequests();
    }
  }, [isVisible, fetchPendingRequests]);

  // Function to handle accepting or declining an event request
  // פונקציה לטיפול באישור או דחייה של בקשת אירוע
  const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      const request = pendingRequests.find(req => req.id === requestId);

      if (!request) {
        Alert.alert('שגיאה', 'הבקשה לא נמצאה.');
        return;
      }

      const response = await fetch(`${SERVER_URL}/update-event-request-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: action }),
      });
      const result = await response.json();

      if (response.ok) {
        if (action === 'accepted') {
          const groupChatRef = doc(db, 'group_chats', request.event_title);
          const groupSnap = await getDoc(groupChatRef);

          if (groupSnap.exists()) {
            await updateDoc(groupChatRef, {
              members: arrayUnion(request.sender_uid)
            });
            console.log(`User ${request.sender_uid} added to group ${request.event_title}`);
          } else {
            await setDoc(groupChatRef, {
              name: request.event_title,
              members: [request.sender_uid],
              createdAt: serverTimestamp(),
              groupImage: null,
            });
            console.log(`Group ${request.event_title} created and user ${request.sender_uid} added.`);
          }
        }

        Alert.alert('הצלחה', `הבקשה ${action === 'accepted' ? 'אושרה' : 'נדחתה'} בהצלחה.`);
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        Alert.alert('שגיאה', result.error || `פעולת ה${action} נכשלה.`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      Alert.alert('שגיאה', `אירעה שגיאה בביצוע הפעולה.`);
    }
  };

  // Profile Modal Component
  const ProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={profileModalVisible}
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setProfileModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>פרופיל משתמש</Text>
          </View>
          
          {selectedProfile && (
            <ScrollView style={styles.profileContent}>
              <View style={styles.profileHeader}>
                <Image
                  source={{
                    uri: selectedProfile.profileImage || 
                         `https://placehold.co/100x100/3A8DFF/FFFFFF?text=${selectedProfile.username.charAt(0)}`
                  }}
                  style={styles.profileImage}
                />
                <Text style={[styles.profileUsername, { color: theme.colors.text }]}>
                  {selectedProfile.username}
                </Text>
              </View>
              
              <View style={styles.profileInfo}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>תיאור:</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {selectedProfile.bio || 'אין תיאור'}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>מיקום:</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {selectedProfile.location || 'לא זמין'}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>תאריך הצטרפות:</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {selectedProfile.joinDate}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <View style={[styles.requestsPanel, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.requestsTitle, { color: theme.colors.text }]}>בקשות לאירועים:</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.requestsScrollView}>
          {pendingRequests.length === 0 ? (
            <Text style={[styles.emptyRequestsText, { color: theme.colors.textSecondary }]}>אין בקשות ממתינות.</Text>
          ) : (
            pendingRequests.map((request) => (
              <View key={request.id} style={[styles.requestCard, { backgroundColor: theme.colors.background }]}>
                <Image
                  source={{ uri: `https://placehold.co/50x50/3A8DFF/FFFFFF?text=${request.sender_username.charAt(0)}` }}
                  style={styles.requestSenderImage}
                />
                <View style={styles.requestTextContent}>
                  <TouchableOpacity
                    onPress={() => handleUsernamePress(request)}
                    disabled={loadingProfile}
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
      
      <ProfileModal />
    </>
  );
};

const styles = StyleSheet.create({
  requestsPanel: {
    position: 'absolute',
    top: -20,
    left: 20,
    right: 20,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3A8DFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileContent: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#3A8DFF',
  },
  profileUsername: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    paddingHorizontal: 10,
  },
  infoRow: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 16,
    textAlign: 'right',
    lineHeight: 22,
  },
});

export default EventRequestsHandler;