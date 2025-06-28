// HomeScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import AddEventButton from '../../MapButtons/AddEventButton';
import DistanceFilterButton from '../../MapButtons/DistanceFilterButton';




const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [displayDistance, setDisplayDistance] = useState(10);
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
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  const fetchUsers = async () => {
    const response = await fetch('https://tripping-app.onrender.com/get-all-users');
    const data = await response.json();
    setUsers(data.users);
  };
  const submitPinToServer = async ({
      latitude,
      longitude,
      eventDate,
      username
    }: {
      latitude: number;
      longitude: number;
      eventDate: Date;
      username: string;
    }) => {
      try {
        const response = await fetch(`https://tripping-app.onrender.com/add-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude,
            longitude,
            event_date: eventDate.toISOString(),
            username,
          }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          console.warn('שגיאה מהשרת:', data?.error);
        } else {
          console.log('הוספת סיכה הצליחה:', data);
        }
      } catch (error) {
        console.error('שגיאה בבקשה:', error);
      }
    };
  
  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    setCurrentLocation({ latitude, longitude });
    setRegion({ latitude, longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
  };

  useEffect(() => {
    fetchLocation();
    fetchUsers();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchLocation();
      fetchUsers();
    }, [])
  );

  const getVisibleUsers = () => {
    if (!currentLocation) return users;
    return users.filter(user => {
      const dist = calculateDistance(currentLocation.latitude, currentLocation.longitude, user.latitude, user.longitude);
      return dist <= displayDistance;
    });
  };

  const getVisibleEvents = () => {
    if (!currentLocation) return events;
    return events.filter(event => {
      const dist = calculateDistance(currentLocation.latitude, currentLocation.longitude, event.latitude, event.longitude);
      return dist <= displayDistance;
    });
  };

  

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleLocationChange = (text: string) => {
    setEventLocation(text);
  };

  const selectLocation = (suggestion: any) => {
    setEventLocation(suggestion.description);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim() || !eventType || !eventLocation.trim() || !selectedLocation) return;
    await submitPinToServer({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      eventDate,
      username: user?.email || 'unknown',
    });
    const newEvent = {
      id: Date.now().toString(),
      title: eventTitle,
      type: eventType,
      date: eventDate,
      location: eventLocation,
      description: eventDescription,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    };
    setEvents(prev => [...prev, newEvent]);
    resetEventForm();
    setEventModalVisible(false);
    setSelectedLocation(null);
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventType('');
    setEventDate(new Date());
    setEventLocation('');
    setEventDescription('');
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={styles.loadingText}>📡 טוען מפה...</Text>
      </View>
    );
  }
  
  return (
  <View style={styles.container}>
    <MapView
      style={styles.map}
      region={region}
      onPress={(e) => {
        if (isChoosingLocation) {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setSelectedLocation({ latitude, longitude });
          setEventLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setEventModalVisible(true);
          setIsChoosingLocation(false);
        }
      }}
    >
      {getVisibleUsers().map((user) => (
        <Marker
          key={user.uid}
          coordinate={{ latitude: user.latitude, longitude: user.longitude }}
          onPress={() => setSelectedUser(user)}
        >
          <Image source={{ uri: user.profile_image }} style={styles.profileMarker} />
        </Marker>
      ))}

      {getVisibleEvents().map(event => (
        <Marker
          key={event.id}
          coordinate={{ latitude: event.latitude, longitude: event.longitude }}
          title={event.title}
          description={event.description}
        >
          <Ionicons name="location" size={30} color="#FF6F00" />
        </Marker>
      ))}
    </MapView>

    {/* ✅ Modal הוזז מחוץ ל־MapView */}
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

    <View style={styles.floatingButtons}>
      <TouchableOpacity style={styles.actionButton} onPress={() => setDistanceModalVisible(true)}>
        <Ionicons name="resize" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.actionButton,
          isChoosingLocation && styles.activeButton
        ]}
        onPress={() => setIsChoosingLocation(prev => !prev)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>

    <DistanceFilterButton
      displayDistance={displayDistance}
      setDisplayDistance={setDisplayDistance}
      visible={distanceModalVisible}
      setVisible={setDistanceModalVisible}
    />

    <AddEventButton
      visible={eventModalVisible}
      setVisible={setEventModalVisible}
      eventTitle={eventTitle}
      setEventTitle={setEventTitle}
      eventType={eventType}
      setEventType={setEventType}
      eventDate={eventDate}
      setEventDate={setEventDate}
      eventLocation={eventLocation}
      setEventLocation={setEventLocation}
      handleLocationChange={handleLocationChange}
      locationSuggestions={locationSuggestions}
      showLocationSuggestions={showLocationSuggestions}
      selectLocation={selectLocation}
      eventDescription={eventDescription}
      setEventDescription={setEventDescription}
      handleAddEvent={handleAddEvent}
      resetEventForm={resetEventForm}
      showCalendarPicker={showCalendarPicker}
      setShowCalendarPicker={setShowCalendarPicker}
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
  activeButton: {
    backgroundColor: '#FFB74D', // גוון בהיר יותר של כתום
    opacity: 0.8, // גם נראה טיפה "לחוץ"
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  profileMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#ccc',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#333',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
    borderRadius: 4,
    textAlign: 'center',
    maxWidth: 60,
    alignSelf: 'center',
  },
  eventMarker: {
    backgroundColor: '#FF6F00',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
  },
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
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#FF6F00',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  customCallout: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderColor: '#FF6F00',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5,
    alignItems: 'center',
  },
  calloutText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  calloutLink: {
    color: '#FF6F00',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
  calloutContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    width: 150,
    elevation: 5,
  },
  calloutUsername: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 16,
  },
  calloutButton: {
    backgroundColor: '#FF6F00',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  calloutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  customCalloutOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.3)',
  justifyContent: 'center',
  alignItems: 'center',
},

customCalloutBox: {
  backgroundColor: 'white',
  padding: 16,
  borderRadius: 12,
  width: 250,
  alignItems: 'center',
  elevation: 5,
},



});
