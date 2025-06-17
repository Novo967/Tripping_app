// HomeScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
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
  View
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

  // Event states
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

  const fetchUsers = async () => {
    const response = await fetch('https://tripping-app.onrender.com/get-all-users');
    const data = await response.json();
    setUsers(data.users);
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
    // searchLocations(text) — פונקציה שאחראית להביא הצעות ממקומות
  };

  const selectLocation = (suggestion: any) => {
    setEventLocation(suggestion.description);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleAddEvent = () => {
    if (!region || !eventTitle.trim() || !eventType || !eventLocation.trim()) return;
    const newEvent = {
      id: Date.now().toString(),
      title: eventTitle,
      type: eventType,
      date: eventDate,
      location: eventLocation,
      description: eventDescription,
      latitude: region.latitude,
      longitude: region.longitude,
    };
    setEvents([...events, newEvent]);
    resetEventForm();
    setEventModalVisible(false);
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
      <MapView style={styles.map} region={region}>
       {getVisibleUsers().map((user) => (
             <Marker
              key={user.uid}
              coordinate={{ latitude: user.latitude, longitude: user.longitude }}
              onPress={() => setSelectedUser(user)}
            >
                <Image source={{ uri: user.profile_image }} style={styles.profileMarker} />
                <Text style={styles.usernameLabel}>{user.username || 'משתמש'}</Text>
            </Marker>
          ))}          
      </MapView>
       {selectedUser && (
          <View style={styles.customCallout}>
            <Text style={styles.calloutText}>{selectedUser.username || 'משתמש'}</Text>
            <TouchableOpacity onPress={() => router.push(`/OtherUserProfile?uid=${selectedUser.uid}`)}>
              <Text style={styles.calloutLink}>🔎 לחץ לצפייה בפרופיל</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <Text style={{ color: 'gray', marginTop: 5 }}>❌ סגור</Text>
            </TouchableOpacity>
          </View>
        )}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setDistanceModalVisible(true)}
        >
          <Ionicons name="resize" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setEventModalVisible(true)}
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
                  locale="he-IL"
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
});
