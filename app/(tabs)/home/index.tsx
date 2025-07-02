// app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Animated, Modal, StyleSheet, Text,
  TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import DistanceFilterButton from '../../MapButtons/DistanceFilterButton';
import EventMarker from '../../components/EventMarker';
import UserMarker from '../../components/UserMarker';

// הגדרת ממשק (interface) עבור selectedEvent
// זה מבטיח שממשק הנתונים תואם לשדות שאתה מצפה לקבל
interface SelectedEventType {
  id: string; // מזהה האירוע
  latitude: number;
  longitude: number;
  event_date: string; // חשוב שזה יהיה מחרוזת הניתנת ל-ISO
  username: string;
  event_title: string;
  event_type: string;
  description?: string; // אופציונלי, אם קיים בנתונים שחוזרים מהשרת
  location?: string; // אופציונלי
}


export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [displayDistance, setDisplayDistance] = useState(150);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(null); // השתמש בטיפוס החדש
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);

  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterAnimation] = useState(new Animated.Value(0));
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

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
      const res = await fetch('https://tripping-app.onrender.com/get-all-users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchPins = async () => {
    try {
      const res = await fetch('https://tripping-app.onrender.com/get-pins');
      const data = await res.json();
      // וודא שאתה ממפה את השדות הנכונים מה-API לפורמט של EventMarker ו-SelectedEventType
      setEvents((data.pins || []).map((pin: any) => ({
        id: pin.id,
        latitude: pin.latitude,
        longitude: pin.longitude,
        event_date: pin.event_date, // וודא שזה event_date ולא date
        username: pin.username,
        event_title: pin.event_title, // וודא שזה event_title ולא title
        event_type: pin.event_type, // וודא שזה event_type ולא type
        description: pin.description, // הוסף אם קיים
        location: pin.location // הוסף אם קיים
      })));
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
      await Promise.all([fetchLocation(), fetchUsers(), fetchPins()]);
      setInitialDataLoaded(true);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    // רענן משתמשים ופינים בכל פעם שהמסך מתמקד
    fetchUsers();
    fetchPins();
    // אם המיקום לא ידוע, נסה לאחזר אותו שוב
    if (!currentLocation) {
      fetchLocation(); 
    }
  }, [currentLocation])); // תלויות ב-currentLocation כדי לנסות לאחזר מיקום אם לא הצליח בפעם הראשונה

  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter(ev =>
      calculateDistance(currentLocation.latitude, currentLocation.longitude, ev.latitude, ev.longitude) <= displayDistance
    );
  }, [events, currentLocation, displayDistance]);

  const toggleFilterMenu = () => {
    const toValue = isFilterMenuVisible ? 0 : 1;
    setIsFilterMenuVisible(!isFilterMenuVisible);
    Animated.spring(filterAnimation, { toValue, useNativeDriver: true }).start();
  };

  const handleAddEventPress = () => {
    setIsFilterMenuVisible(false);
    setIsChoosingLocation(true);
    Animated.spring(filterAnimation, { toValue: 0, useNativeDriver: true }).start();
  };

  // --- הפונקציה החדשה לפתיחת הצ'אט הקבוצתי ---
  const handleOpenGroupChat = (eventTitle: string) => {
    if (eventTitle) {
      setSelectedEvent(null); // סגור את המודל לפני הניווט
      router.push({
        pathname: '/Chats/GroupChatModal', // וודא שזה הנתיב הנכון לקובץ הצ'אט שלך ב-expo-router
        params: { eventTitle: eventTitle }
      });
    }
  };
  // --- סוף הפונקציה החדשה ---

  if (!initialDataLoaded || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>📡 טוען מפה...</Text>
      </View>
    );
  }

  const filterMenuStyle = {
    transform: [{
      translateY: filterAnimation.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] })
    }],
    opacity: filterAnimation
  };

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
              params: { latitude: latitude.toString(), longitude: longitude.toString() }
            });
            setIsChoosingLocation(false);
          }
          if (isFilterMenuVisible) toggleFilterMenu();
          // סגור גם את מודלי פרטי המשתמש/אירוע בלחיצה על המפה
          setSelectedUser(null);
          setSelectedEvent(null);
        }}
      >
        {visibleEvents.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onPress={(id) => {
              // קודם נסה לסגור מודלים אחרים
              setSelectedUser(null); 
              fetch(`https://tripping-app.onrender.com/get-pin?id=${id}`)
                .then(res => res.json())
                .then(data => {
                  // וודא שהנתונים מגיעים בפורמט הנכון
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
                      location: data.pin.location
                    });
                  } else {
                    setSelectedEvent(null);
                  }
                })
                .catch(error => {
                  console.error("Error fetching single pin:", error);
                  setSelectedEvent(null); // סגור מודל במקרה של שגיאה
                });
            }}
          />
        ))}
        {users.filter(u =>
          currentLocation && calculateDistance(currentLocation.latitude, currentLocation.longitude, u.latitude, u.longitude) <= displayDistance
        ).map(user => (
          <UserMarker key={user.uid} user={user} onPress={(u) => {
            setSelectedEvent(null); // סגור מודל אירוע אם נבחר משתמש
            setSelectedUser(u);
          }} />
        ))}
      </MapView>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, isChoosingLocation && { backgroundColor: '#FFB74D' }]} onPress={toggleFilterMenu}>
          <Ionicons name={isFilterMenuVisible ? "close" : "options"} size={24} color="white" />
        </TouchableOpacity>
        {isFilterMenuVisible && (
          <Animated.View style={[styles.filterMenu, filterMenuStyle]}>
            <TouchableOpacity style={styles.menuItemContainer} onPress={() => { setDistanceModalVisible(true); toggleFilterMenu(); }}>
              <Ionicons name="resize" size={18} color="#FF6F00" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>מרחק תצוגה ({displayDistance} קמ)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItemContainer} onPress={handleAddEventPress}>
              <Ionicons name="add-circle-outline" size={18} color="#FF6F00" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>בחר במפה להוספת אירוע</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {isChoosingLocation && (
        <View style={styles.locationIndicator}>
          <Text style={styles.locationIndicatorText}>👆 לחץ על המפה לבחירת מיקום</Text>
        </View>
      )}

      {selectedEvent && (
        <Modal visible={true} animationType="fade" transparent onRequestClose={() => setSelectedEvent(null)}>
          <TouchableWithoutFeedback onPress={() => setSelectedEvent(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{selectedEvent.event_title}</Text>
                {/* וודא ש-event_date הוא תאריך תקין */}
                <Text style={styles.modalDate}>{new Date(selectedEvent.event_date).toLocaleDateString('he-IL')}</Text>
                <Text style={styles.modalAuthor}>מאת: {selectedEvent.username}</Text>

                {/* --- כפתור צ'אט קבוצתי חדש שהוספנו --- */}
                <TouchableOpacity
                  style={styles.chatButton} // סטייל חדש שנוסיף
                  onPress={() => handleOpenGroupChat(selectedEvent.event_title)}
                >
                  <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.chatButtonText}>פתח צאט קבוצתי</Text>
                </TouchableOpacity>
                {/* --- סוף כפתור צ'אט קבוצתי --- */}

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
  filterContainer: {
    position: 'absolute',
    top: 20,
    right: 15,
    zIndex: 10,
  },
  filterButton: {
    backgroundColor: '#FF6F00',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  filterMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    minWidth: 220,
  },
  menuItemContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  menuItemText: {
    fontSize: 17,
    color: '#222',
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  menuIcon: {
    marginLeft: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    padding: 6,
    overflow: 'hidden',
  },
  locationIndicator: {
    position: 'absolute',
    top: 120,
    left: 24,
    right: 24,
    backgroundColor: '#FF6F00',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  locationIndicatorText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
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
  // --- סטיילים חדשים לכפתור הצ'אט הקבוצתי ---
  chatButton: {
    backgroundColor: '#FF6F00', // צבע הכפתור
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row-reverse', // כדי שהאייקון יהיה מימין לטקסט
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // מרווח מהתוכן הקודם במודל
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5, // צל עבור אנדרואיד
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8, // רווח בין הטקסט לאייקון
  },
  // --- סוף סטיילים חדשים ---
});