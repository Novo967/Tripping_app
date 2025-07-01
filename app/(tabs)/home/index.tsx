import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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
import UserMarker from '../../components/UserMarker';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [displayDistance, setDisplayDistance] = useState(40);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // מצבים חדשים למסנן משופר
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterAnimation] = useState(new Animated.Value(0));

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  // פונקציית חישוב מרחק
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // רדיוס כדור הארץ בקילומטרים
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // פונקציות API
  const fetchUsers = async () => {
    try {
      const response = await fetch('https://tripping-app.onrender.com/get-all-users');
      const data = await response.json();
      setUsers(data.users);
      return true;
    } catch (error) {
      console.error('שגיאה בטעינת משתמשים:', error);
      return false;
    }
  };

  const fetchPinsFromServer = async () => {
    try {
      const response = await fetch('https://tripping-app.onrender.com/get-pins');
      const data = await response.json();

      if (data.pins) {
        const normalizedPins = data.pins.map((pin: any) => ({
          id: pin.id,
          latitude: pin.latitude,
          longitude: pin.longitude,
          date: pin.event_date,
          username: pin.username,
          title: pin.event_title,
          type: pin.event_type,
        }));
        setEvents(normalizedPins);
        return true;
      } else {
        console.warn('לא הוחזרו סיכות מהשרת');
        return false;
      }
    } catch (error) {
      console.error('שגיאה בטעינת סיכות מהשרת:', error);
      return false;
    }
  };

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('הרשאת מיקום נדחתה');
      return false;
    }
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setRegion({ latitude, longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
      return true;
    } catch (error) {
      console.error('שגיאה בקבלת מיקום:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const locationLoaded = await fetchLocation();
      const usersLoaded = await fetchUsers();
      const pinsLoaded = await fetchPinsFromServer();

      if (locationLoaded && usersLoaded && pinsLoaded) {
        setInitialDataLoaded(true);
      }
    };
    loadInitialData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUsers();
      fetchPinsFromServer();
    }, [])
  );

  const getVisibleUsers = () => {
    if (!currentLocation) return users;
    return users.filter(user => {
      const dist = calculateDistance(currentLocation.latitude, currentLocation.longitude, user.latitude, user.longitude);
      return dist <= displayDistance;
    });
  };

  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter(event => {
      const dist = calculateDistance(currentLocation.latitude, currentLocation.longitude, event.latitude, event.longitude);
      return dist <= displayDistance;
    });
  }, [events, currentLocation, displayDistance]);

  const handleMarkerPress = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`https://tripping-app.onrender.com/get-pin?id=${eventId}`);
      const data = await response.json();
      if (data.pin) {
        setSelectedEvent({
          id: data.pin.id,
          latitude: data.pin.latitude,
          longitude: data.pin.longitude,
          title: data.pin.event_title,
          type: data.pin.event_type,
          username: data.pin.username,
          date: data.pin.event_date,
          description: data.pin.description,
          location: data.pin.location,
        });
      } else {
        console.warn('הסיכה לא נמצאה בשרת');
      }
    } catch (error) {
      console.error('שגיאה בטעינת פרטי הסיכה:', error);
    }
  }, []);

  // פונקציות המסנן המשופר
  const toggleFilterMenu = () => {
    const toValue = isFilterMenuVisible ? 0 : 1;
    setIsFilterMenuVisible(!isFilterMenuVisible);
    
    Animated.spring(filterAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleAddEventPress = () => {
    setIsFilterMenuVisible(false);
    setIsChoosingLocation(true);
    Animated.spring(filterAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleDistanceFilterPress = () => {
    setIsFilterMenuVisible(false);
    setDistanceModalVisible(true);
    Animated.spring(filterAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  if (!initialDataLoaded || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={styles.loadingText}>📡 טוען מפה...</Text>
      </View>
    );
  }

  const filterMenuStyle = {
    transform: [
      {
        translateY: filterAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-100, 0],
        }),
      },
      {
        scale: filterAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
    ],
    opacity: filterAnimation,
  };

  return (
    <View style={styles.container}>
      <MapView
        key={initialDataLoaded ? "map-loaded" : "map-loading"}
        style={styles.map}
        region={region}
        onPress={(e) => {
          if (isChoosingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setSelectedLocation({ latitude, longitude });
            setEventLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            
            // מעבר לעמוד הוספת אירוע
            router.push({
              pathname: '/components/EventMarker',
              params: {
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              }
            });
            setIsChoosingLocation(false);
          }
          
          // סגירת מסנן אם פתוח
          if (isFilterMenuVisible) {
            toggleFilterMenu();
          }
        }}
      >
        {getVisibleUsers().map((user) => (
          <UserMarker
            key={user.uid}
            user={user}
            onPress={setSelectedUser}
          />
        ))}

        {visibleEvents.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onPress={handleMarkerPress}
          />
        ))}
      </MapView>

      {/* כפתור המסנן המשופר */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[
            styles.filterButton,
            isChoosingLocation && styles.activeButton,
            isFilterMenuVisible && styles.filterButtonActive
          ]} 
          onPress={toggleFilterMenu}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isFilterMenuVisible ? "close" : "options"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>

        {/* תפריט המסנן */}
        {isFilterMenuVisible && (
          <Animated.View style={[styles.filterMenu, filterMenuStyle]}>
            <TouchableOpacity 
              style={styles.filterMenuItem} 
              onPress={handleDistanceFilterPress}
              activeOpacity={0.7}
            >
              <View style={styles.filterMenuItemContent}>
                <Text style={styles.filterMenuSubText}>{displayDistance} ק"מ</Text>
                <Text style={styles.filterMenuText}>מרחק תצוגה</Text>
                <Ionicons name="resize" size={20} color="#FF6F00" />
              </View>
            </TouchableOpacity>

            <View style={styles.filterMenuDivider} />

            <TouchableOpacity 
              style={styles.filterMenuItem} 
              onPress={handleAddEventPress}
              activeOpacity={0.7}
            >
              <View style={styles.filterMenuItemContent}>
                <Text style={styles.filterMenuSubText}>בחר מיקום במפה</Text>
                <Text style={styles.filterMenuText}>הוסף אירוע</Text>
                <Ionicons name="add-circle" size={20} color="#FF6F00" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* אינדיקטור לבחירת מיקום */}
      {isChoosingLocation && (
        <View style={styles.locationIndicator}>
          <Text style={styles.locationIndicatorText}>
            👆 לחץ על המפה לבחירת מיקום
          </Text>
        </View>
      )}

      {/* מודלי תצוגה */}
      {selectedEvent && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedEvent(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedEvent(null)}>
            <View style={styles.customCalloutOverlay}>
              <View style={styles.customCalloutBox}>
                <Text style={styles.calloutUsername}>{selectedEvent.title}</Text>
                <Text style={styles.calloutDate}>
                  {new Date(selectedEvent.date).toLocaleDateString('he-IL')}
                </Text>
                <Text style={styles.calloutType}>סוג: {selectedEvent.type}</Text>
                <Text style={styles.calloutAuthor}>מאת: {selectedEvent.username}</Text>

                <TouchableOpacity
                  style={styles.calloutButton}
                  onPress={() => {
                    router.push({
                      pathname: '/Chats/GroupChatModal',
                      params: {
                        eventTitle: selectedEvent.title
                      },
                    });
                    setSelectedEvent(null);
                  }}
                >
                  <Text style={styles.calloutButtonText}>היכנס לצאט האירוע</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {selectedUser && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedUser(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedUser(null)}>
            <View style={styles.customCalloutOverlay}>
              <View style={styles.customCalloutBox}>
                <Text style={styles.calloutUsername}>
                  {selectedUser.username || 'משתמש'}
                </Text>
                <TouchableOpacity
                  style={styles.calloutButton}
                  onPress={() => {
                    router.push({
                      pathname: '/ProfileServices/OtherUserProfile',
                      params: { uid: selectedUser.uid },
                    });
                    setSelectedUser(null);
                  }}
                >
                  <Text style={styles.calloutButtonText}>לצפייה בפרופיל</Text>
                </TouchableOpacity>
              </View>
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

      {showCalendarPicker && (
        <Modal visible animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={() => setShowCalendarPicker(false)}>
            <View style={styles.calendarModalOverlay}>
              <View style={styles.calendarModalContent}>
                <Text style={styles.calendarModalTitle}>בחר תאריך</Text>
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display="calendar"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setEventDate(selectedDate);
                    }
                    setShowCalendarPicker(false);
                  }}
                  minimumDate={new Date()}
                />
                <TouchableOpacity
                  style={styles.calendarCloseButton}
                  onPress={() => setShowCalendarPicker(false)}
                >
                  <Text style={styles.buttonText}>סגור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  
  // עיצוב המסנן המשופר
  filterContainer: {
    position: 'absolute',
    top: 20, // was 60, moved up
    right: 15,
    alignItems: 'flex-end',
  },
  filterButton: {
    backgroundColor: '#FF6F00',
    width: 40,
    height: 40,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: '#E65100',
    transform: [{ scale: 1.1 }],
  },
  activeButton: {
    backgroundColor: '#FFB74D',
  },
  filterMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  filterMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  filterMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  filterMenuSubText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  filterMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  
  // אינדיקטור בחירת מיקום
  locationIndicator: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 111, 0, 0.95)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  locationIndicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // עיצוב משופר למודלים
  customCalloutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCalloutBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: 280,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  calloutUsername: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
    textAlign: 'center',
  },
  calloutDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  calloutType: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  calloutAuthor: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  calloutButton: {
    backgroundColor: '#FF6F00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 2,
  },
  calloutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // עיצוב לוח שנה
  calendarModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    maxWidth: '90%',
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  calendarCloseButton: {
    backgroundColor: '#FF6F00',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});