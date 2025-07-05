// app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import DistanceFilterButton from '../../MapButtons/DistanceFilterButton';
import EventMarker from '../../components/EventMarker';
import FilterButton from '../../components/FilterButton';
import LocationSelector from '../../components/LocationSelector';
import UserMarker from '../../components/UserMarker';

// הגדרת ממשק (interface) עבור selectedEvent
interface SelectedEventType {
  id: string; // מזהה האירוע
  latitude: number;
  longitude: number;
  event_date: string;
  username: string; // שם המשתמש של מנהל האירוע
  event_title: string;
  event_type: string;
  description?: string;
  location?: string;
  event_owner_uid: string; // UID של מנהל האירוע
  approved_users?: string[]; // רשימת UID של משתמשים שאושרו
}

const SERVER_URL = 'https://tripping-app.onrender.com';

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [displayDistance, setDisplayDistance] = useState(150);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(null);
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [currentUserUsername, setCurrentUserUsername] = useState('');

  const auth = getAuth();
  const user = auth.currentUser; // המשתמש המחובר כרגע

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // רדיוס כדור הארץ בק"מ
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/get-all-users`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchCurrentUserUsername = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${SERVER_URL}/get-user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await res.json();
      if (res.ok && data.username) {
        setCurrentUserUsername(data.username);
      } else {
        console.error("Error fetching current user username:", data.error);
      }
    } catch (error) {
      console.error("Error fetching current user username:", error);
    }
  };

  const deletePin = async (pinId: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/delete-pin`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: pinId }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`Pin ${pinId} deleted successfully:`, data.message);
        setEvents(prevEvents => prevEvents.filter(event => event.id !== pinId));
      } else {
        console.error(`Error deleting pin ${pinId}:`, data.message);
      }
    } catch (error) {
      console.error(`Error deleting pin ${pinId}:`, error);
    }
  };

  const fetchPins = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/get-pins`);
      const data = await res.json();
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const updatedPins = await Promise.all((data.pins || []).map(async (pin: any) => {
        const eventDate = new Date(pin.event_date);
        eventDate.setHours(0, 0, 0, 0);

        const deletionDate = new Date(eventDate);
        deletionDate.setDate(eventDate.getDate() + 1); 

        if (todayStart.getTime() >= deletionDate.getTime()) {
          console.log(`Event ${pin.event_title} (${pin.id}) has passed its deletion threshold. Deleting pin.`);
          await deletePin(pin.id);
          return null;
        }
        return {
          id: pin.id,
          latitude: pin.latitude,
          longitude: pin.longitude,
          event_date: pin.event_date,
          username: pin.username,
          event_title: pin.event_title,
          event_type: pin.event_type,
          description: pin.description,
          location: pin.location,
          event_owner_uid: pin.owner_uid,
          approved_users: pin.approved_users || [],
        };
      }));

      setEvents(updatedPins.filter(pin => pin !== null));
    } catch (error) {
      console.error("Error fetching pins:", error);
    }
  };

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission to access location was denied');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
    } catch (error) {
      console.error("Error fetching current location:", error);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchLocation(), fetchUsers(), fetchPins(), fetchCurrentUserUsername()]);
      setInitialDataLoaded(true);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    fetchUsers();
    fetchPins();
    fetchCurrentUserUsername();
    if (!currentLocation) {
      fetchLocation(); 
    }
  }, [currentLocation]));

  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter(ev =>
      calculateDistance(currentLocation.latitude, currentLocation.longitude, ev.latitude, ev.longitude) <= displayDistance
    );
  }, [events, currentLocation, displayDistance]);

  const handleAddEventPress = () => {
    setIsChoosingLocation(true);
  };

  const handleCancelLocationSelection = () => {
    setIsChoosingLocation(false);
  };

  const handleDistanceFilterPress = () => {
    setDistanceModalVisible(true);
  };

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
      setSelectedEvent(null);
    }
  };

  const handleOpenGroupChat = (eventTitle: string) => {
    if (eventTitle) {
      setSelectedEvent(null);
      router.push({
        pathname: '/Chats/GroupChatModal',
        params: { eventTitle: eventTitle }
      });
    }
  };

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
          <Text style={styles.chatButtonText}>פתח צאט קבוצתי</Text>
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

  if (!initialDataLoaded || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>📡 טוען מפה...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={region}
        onPress={(e) => {
          if (isChoosingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            router.push({
              pathname: '/components/CreateEventPage',
              params: { latitude: latitude.toString(), longitude: longitude.toString(), owner_uid: user?.uid || '' }
            });
            setIsChoosingLocation(false);
          }
          // סגור מודלים פתוחים
          setSelectedUser(null);
          setSelectedEvent(null);
        }}
      >
        {visibleEvents.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onPress={(id) => {
              setSelectedUser(null); 
              fetch(`${SERVER_URL}/get-pin?id=${id}`)
                .then(res => res.json())
                .then(data => {
                  if (data.pin) {
                    setSelectedEvent({
                      id: data.pin.id,
                      latitude: data.pin.latitude,
                      longitude: data.pin.longitude,
                      event_date: data.pin.event_date,
                      username: data.pin.username,
                      event_title: data.pin.event_title,
                      event_type: data.pin.event_type,
                      description: data.pin.description,
                      location: data.pin.location,
                      event_owner_uid: data.pin.owner_uid,
                      approved_users: data.pin.approved_users || [],
                    });
                  } else {
                    setSelectedEvent(null);
                  }
                })
                .catch(error => {
                  console.error("Error fetching single pin:", error);
                  setSelectedEvent(null);
                });
            }}
          />
        ))}
        {users.filter(u =>
          currentLocation && calculateDistance(currentLocation.latitude, currentLocation.longitude, u.latitude, u.longitude) <= displayDistance
        ).map(user => (
          <UserMarker key={user.uid} user={user} onPress={(u) => {
            setSelectedEvent(null);
            setSelectedUser(u);
          }} />
        ))}
      </MapView>

      <FilterButton
        displayDistance={displayDistance}
        onDistanceFilterPress={handleDistanceFilterPress}
        onAddEventPress={handleAddEventPress}
        isChoosingLocation={isChoosingLocation}
      />

      <LocationSelector
        visible={isChoosingLocation}
        onCancel={handleCancelLocationSelection}
      />

      {selectedEvent && (
        <Modal visible={true} animationType="fade" transparent onRequestClose={() => setSelectedEvent(null)}>
          <TouchableWithoutFeedback onPress={() => setSelectedEvent(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{selectedEvent.event_title}</Text>
                <Text style={styles.modalDate}>{new Date(selectedEvent.event_date).toLocaleDateString('he-IL')}</Text>
                <Text style={styles.modalAuthor}>מאת: {selectedEvent.username}</Text>

                {renderEventActionButton()}

              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
      
      {selectedUser && (
        <Modal visible={true} animationType="fade" transparent onRequestClose={() => setSelectedUser(null)}>
          <TouchableWithoutFeedback onPress={() => setSelectedUser(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}> {selectedUser.username}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedUser(null);
                      router.push({ pathname: '/ProfileServices/OtherUserProfile', params: { uid: selectedUser.uid } });
                    }}
                    style={{
                      marginTop: 18,
                      backgroundColor: '#FF6F00',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                      צפה בפרופיל
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      <DistanceFilterButton
        displayDistance={displayDistance}
        setDisplayDistance={setDisplayDistance}
        visible={distanceModalVisible}
        setVisible={setDistanceModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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