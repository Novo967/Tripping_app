import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import { auth } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');

interface User {
  uid: string;
  latitude: number;
  longitude: number;
  profile_image: string;
}

interface Event {
  id: string;
  title: string;
  type: string;
  date: Date;
  location: string;
  description: string;
  latitude: number;
  longitude: number;
}

interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const eventTypes = [
  { id: 'trip', label: 'טיול', icon: 'mountain' },
  { id: 'party', label: 'מסיבה', icon: 'musical-notes' },
  { id: 'attraction', label: 'אטרקציה', icon: 'camera' },
  { id: 'other', label: 'אחר', icon: 'ellipsis-horizontal' },
];

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [displayDistance, setDisplayDistance] = useState(10); // km
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Event form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  
  // Location autocomplete states
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  const router = useRouter();
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;

  // Google Places API key - replace with your actual key
  const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';

  // Function to search for locations using Google Places API
  const searchLocations = async (input: string) => {
    if (input.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_PLACES_API_KEY}&language=he&components=country:il`
      );
      const data = await response.json();
      
      if (data.predictions) {
        setLocationSuggestions(data.predictions);
        setShowLocationSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    }
  };

  // Handle location input change
  const handleLocationChange = (text: string) => {
    setEventLocation(text);
    searchLocations(text);
  };

  // Handle location selection from suggestions
  const selectLocation = (suggestion: LocationSuggestion) => {
    setEventLocation(suggestion.description);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  // Dismiss keyboard when touching outside
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setShowLocationSuggestions(false);
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d;
  };

  // Filter users and events by distance
  const getVisibleUsers = () => {
    if (!currentLocation) return users;
    return users.filter(user => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        user.latitude,
        user.longitude
      );
      return distance <= displayDistance;
    });
  };

  const getVisibleEvents = () => {
    if (!currentLocation) return events;
    return events.filter(event => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        event.latitude,
        event.longitude
      );
      return distance <= displayDistance;
    });
  };

  useEffect(() => {
    const getLocationAndFetchUsers = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        setCurrentLocation({ latitude, longitude });
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        await fetch('https://tripping-app.onrender.com/update-user-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, latitude, longitude }),
        });

        const response = await fetch('https://tripping-app.onrender.com/get-all-users');
        const data = await response.json();
        setUsers(data.users);
      } catch (err) {
        console.error('❌ Error:', err);
        setError('Failed to load data');
      }
    };

    getLocationAndFetchUsers();
  }, []);

  const resetEventForm = () => {
    setEventTitle('');
    setEventType('');
    setEventDate(new Date());
    setEventLocation('');
    setEventDescription('');
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  const handleAddEvent = () => {
    if (!region || !eventTitle.trim() || !eventType || !eventLocation.trim()) {
      Alert.alert('שגיאה', 'יש למלא את כל השדות הנדרשים');
      return;
    }

    if (eventDate < new Date()) {
      Alert.alert('שגיאה', 'לא ניתן לבחור תאריך בעבר');
      return;
    }

    const newEvent: Event = {
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const getEventTypeIcon = (type: string) => {
    const eventType = eventTypes.find(t => t.id === type);
    return eventType?.icon || 'location';
  };

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>❌ שגיאה: {error}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={styles.loadingText}>📡 טוען מפה...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <MapView style={styles.map} region={region}>
          {getVisibleUsers().map((user) => (
            <Marker
              key={user.uid}
              coordinate={{ latitude: user.latitude, longitude: user.longitude }}
            >
              <View style={styles.markerContainer}>
                <Image source={{ uri: user.profile_image }} style={styles.profileMarker} />
              </View>
              <Callout onPress={() => router.push(`/OtherUserProfile?uid=${user.uid}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutText}>{user.uid}</Text>
                  <Text style={styles.calloutLink}>🔎 לחץ לצפייה בפרופיל</Text>
                </View>
              </Callout>
            </Marker>
          ))}
          
          {getVisibleEvents().map((event) => (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            >
              <View style={styles.eventMarker}>
                <Ionicons name={getEventTypeIcon(event.type) as any} size={20} color="white" />
              </View>
              <Callout>
                <View style={styles.eventCallout}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventType}>{eventTypes.find(t => t.id === event.type)?.label}</Text>
                  <Text style={styles.eventDate}>{event.date.toLocaleDateString('he-IL')}</Text>
                  <Text style={styles.eventLocation}>{event.location}</Text>
                  {event.description ? <Text style={styles.eventDescription}>{event.description}</Text> : null}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* Floating Buttons */}
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

        {/* Distance Modal */}
        <Modal visible={distanceModalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.modalOverlay}>
              <View style={styles.distanceModalContent}>
                <Text style={styles.modalTitle}>בחר מרחק להצגה</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.distanceText}>{displayDistance} ק"מ</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={150}
                    value={displayDistance}
                    onValueChange={setDisplayDistance}
                    step={1}
                    minimumTrackTintColor="#FF6F00"
                    maximumTrackTintColor="#d3d3d3"
                    thumbStyle={styles.sliderThumb}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>1 ק"מ</Text>
                    <Text style={styles.sliderLabel}>150 ק"מ</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setDistanceModalVisible(false)}
                >
                  <Text style={styles.buttonText}>שמור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Event Modal */}
        <Modal visible={eventModalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.modalOverlay}>
              <View style={styles.eventModalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>🗓️ יצירת אירוע חדש</Text>
                  
                  {/* Event Title */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>שם האירוע *</Text>
                    <TextInput
                      style={[styles.input, styles.rtlInput]}
                      placeholder="הזן שם לאירוע"
                      value={eventTitle}
                      onChangeText={setEventTitle}
                      textAlign="right"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Event Type */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>סוג האירוע *</Text>
                    <View style={styles.eventTypeContainer}>
                      {eventTypes.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.eventTypeButton,
                            eventType === type.id && styles.eventTypeButtonSelected
                          ]}
                          onPress={() => setEventType(type.id)}
                        >
                          <Text style={[
                            styles.eventTypeText,
                            eventType === type.id && styles.eventTypeTextSelected
                          ]}>
                            {type.label}
                          </Text>
                          <Ionicons 
                            name={type.icon as any} 
                            size={20} 
                            color={eventType === type.id ? 'white' : '#FF6F00'} 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Event Date */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>תאריך האירוע *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowCalendarPicker(true)}
                    >
                      <Ionicons name="calendar" size={20} color="#FF6F00" />
                      <Text style={styles.dateText}>{eventDate.toLocaleDateString('he-IL')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Event Location */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>מיקום האירוע *</Text>
                    <TextInput
                      style={[styles.input, styles.rtlInput]}
                      placeholder="הזן מיקום האירוע"
                      value={eventLocation}
                      onChangeText={handleLocationChange}
                      textAlign="right"
                      placeholderTextColor="#999"
                    />
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {locationSuggestions.map((suggestion) => (
                          <TouchableOpacity
                            key={suggestion.place_id}
                            style={styles.suggestionItem}
                            onPress={() => selectLocation(suggestion)}
                          >
                            <Text style={styles.suggestionText}>{suggestion.description}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Event Description */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>תיאור האירוע</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, styles.rtlInput]}
                      placeholder="הוסף תיאור לאירוע..."
                      value={eventDescription}
                      onChangeText={setEventDescription}
                      multiline
                      numberOfLines={4}
                      textAlign="right"
                      textAlignVertical="top"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Buttons */}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleAddEvent}>
                      <Text style={styles.buttonText}>שמור אירוע</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        resetEventForm();
                        setEventModalVisible(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>ביטול</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Calendar Date Picker Modal */}
        <Modal visible={showCalendarPicker} animationType="slide" transparent>
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

        {/* Regular Date Picker (hidden) */}
        {showDatePicker && (
          <DateTimePicker
            value={eventDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
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
    borderWidth: 3,
    borderColor: '#FF6F00',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  distanceModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  eventModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  distanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#FF6F00',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  rtlInput: {
    writingDirection: 'rtl',
  },
  textArea: {
    height: 100,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventTypeButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6F00',
    marginBottom: 10,
    width: '48%',
    justifyContent: 'center',
  },
  eventTypeButtonSelected: {
    backgroundColor: '#FF6F00',
  },
  eventTypeText: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6F00',
  },
  eventTypeTextSelected: {
    color: 'white',
  },
  dateInput: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  modalButtons: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#FF6F00',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  callout: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    maxWidth: 150,
    borderColor: '#FF6F00',
    borderWidth: 1,
  },
  calloutText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  calloutLink: {
    color: '#FF6F00',
    fontSize: 12,
    fontWeight: '600',
  },
  eventCallout: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    maxWidth: 200,
    borderColor: '#FF6F00',
    borderWidth: 1,
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  eventType: {
    color: '#FF6F00',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  // Calendar modal styles
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
  // Location suggestions styles
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
});