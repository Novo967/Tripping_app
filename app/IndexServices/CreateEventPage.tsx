// app/create-event/index.tsx
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, getFirestore } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { app } from '../../firebaseConfig';

// Define event types according to your requirements
type EventType =
  | 'trip'
  | 'party'
  | 'attraction'
  | 'food'
  | 'nightlife'
  | 'beach'
  | 'sport'
  | 'other';

export default function CreateEventPage() {
  const { latitude, longitude } = useLocalSearchParams();
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [cityCountry, setCityCountry] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    if (latitude && longitude) {
      reverseGeocode();
    }
  }, [latitude, longitude]);

  const reverseGeocode = async () => {
    try {
      const response = await fetch(
        // You MUST replace 'YOUR_MAPBOX_TOKEN' with your actual Mapbox access token
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=YOUR_MAPBOX_TOKEN&language=he`
      );
      const data = await response.json();
      if (data.features?.length > 0) {
        const feature = data.features[0];
        setEventLocation(feature.place_name_he || feature.place_name);

        const contexts = feature.context || [];
        const place = contexts.find((c: any) => c.id.includes('place'));
        const country = contexts.find((c: any) => c.id.includes('country'));
        if (place && country) {
          setCityCountry(`${place.text_he || place.text}, ${country.text_he || country.text}`);
        }
      }
    } catch (error) {
      console.error('Error during reverse geocoding:', error);
      setEventLocation(
        `${parseFloat(latitude as string).toFixed(4)}, ${parseFloat(longitude as string).toFixed(4)}`
      );
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventType) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    const userId = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || 'משתמש';

    if (!userId) {
      Alert.alert('שגיאה', 'אין משתמש מחובר. אנא התחבר ונסה שוב.');
      return;
    }

    setIsLoading(true);
    try {
      // יצירת אובייקט הנתונים לשמירה ב-Firestore
      const eventData = {
        owner_uid: userId,
        username: username,
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string),
        event_title: eventTitle,
        event_type: eventType,
        event_date: eventDate.toISOString(),
        description: eventDescription,
        location: eventLocation,
        city_country: cityCountry,
        created_at: new Date().toISOString(),
      };

      // שמירת האובייקט ישירות בקולקשן 'pins' ב-Firestore
      await addDoc(collection(db, 'pins'), eventData);

      Alert.alert('הצלחה', 'האירוע נוצר בהצלחה ונוסף ל-Firestore!', [
        { text: 'אוקיי', onPress: () => router.replace('/home') },
      ]);
    } catch (error) {
      console.error('Firestore error:', error);
      Alert.alert(
        'שגיאה',
        'אירעה שגיאה ביצירת האירוע או בשמירה במסד הנתונים.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Updated event types with Hebrew labels and appropriate icons
  const typeLabels: Record<EventType, string> = {
    trip: 'טיול',
    party: 'מסיבה',
    attraction: 'אטרקציה',
    food: 'אוכל',
    nightlife: 'חיי לילה',
    beach: 'ים/בריכה',
    sport: 'ספורט',
    other: 'אחר',
  };

  // Icon mapping for each event type
  const getEventIcon = (type: EventType): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<EventType, keyof typeof Ionicons.glyphMap> = {
      trip: 'car',
      party: 'musical-notes',
      attraction: 'star',
      food: 'restaurant',
      nightlife: 'wine',
      beach: 'water',
      sport: 'fitness',
      other: 'ellipsis-horizontal-circle',
    };
    return iconMap[type];
  };

  // Event types array in the specified order
  const eventTypesArray: EventType[] = [
    'trip',
    'party',
    'attraction',
    'food',
    'nightlife',
    'beach',
    'sport',
    'other',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>יצירת אירוע</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: parseFloat(latitude as string),
            longitude: parseFloat(longitude as string),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: parseFloat(latitude as string),
              longitude: parseFloat(longitude as string),
            }}
          >
            <View style={styles.customMarker}>
              <Ionicons name="location" size={30} color="#3A8DFF" />
            </View>
          </Marker>
        </MapView>

        <View style={styles.locationBox}>
          <Text style={styles.locationText}>{eventLocation}</Text>
        </View>
        {cityCountry && (
          <View style={styles.cityBox}>
            <Text style={styles.cityText}>{cityCountry}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="כותרת האירוע"
          value={eventTitle}
          onChangeText={setEventTitle}
          placeholderTextColor="#999"
        />

        {/* RTL horizontal scroll for event types */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeSelector}
          contentContainerStyle={styles.typeSelectorContent}
        >
          {eventTypesArray.map((type: EventType) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, eventType === type && styles.typeSelected]}
              onPress={() => setEventType(type)}
            >
              <Ionicons
                name={getEventIcon(type)}
                size={20}
                color={eventType === type ? 'white' : '#3A8DFF'}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: eventType === type ? 'white' : '#333' },
                ]}
              >
                {typeLabels[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color="#3A8DFF" />
          <Text style={styles.dateText}>{eventDate.toLocaleDateString('he-IL')}</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { height: 100, marginBottom: 20 }]}
          placeholder="תיאור האירוע"
          value={eventDescription}
          onChangeText={setEventDescription}
          multiline
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.createButton, isLoading && { opacity: 0.6 }]}
          onPress={handleCreateEvent}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? 'יוצר...' : 'צור אירוע'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDatePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <DateTimePicker
              value={eventDate}
              mode="date"
              onChange={(e, d) => {
                setShowDatePicker(false);
                if (d) setEventDate(d);
              }}
              minimumDate={new Date()}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 24) + 10
        : Constants.statusBarHeight + 10,
    paddingBottom: 10,
    backgroundColor: '#3A8DFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 40,
  },
  scrollView: { padding: 20 },
  map: { height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 15 },
  customMarker: { alignItems: 'center', justifyContent: 'center' },
  locationBox: {
    backgroundColor: 'white',
    padding: 10,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationText: { color: '#333', textAlign: 'center', fontWeight: '500' },
  cityBox: { backgroundColor: '#f5f5f5', padding: 8, marginBottom: 15, borderRadius: 8 },
  cityText: { color: '#666', textAlign: 'center', fontSize: 12 },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    color: '#333',
    textAlign: 'right',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  typeSelector: {
    flexDirection: 'row',
    marginVertical: 15,
  },
  typeSelectorContent: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 5,
  },
  typeButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
  },
  typeSelected: {
    backgroundColor: '#3A8DFF',
    borderColor: '#3A8DFF',
  },
  typeText: {
    marginRight: 8,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  dateButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateText: { marginRight: 10, fontSize: 16, color: '#333', fontWeight: '500' },
  createButton: {
    backgroundColor: '#3A8DFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  createButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    margin: 20,
  },
});