// app/create-event/index.tsx
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants'; // ייבוא Constants מ-expo-constants
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform, ScrollView,
  StatusBar // ייבוא StatusBar לטיפול בגובה הסטטוס בר
  ,


  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

// Define a type for the allowed event types כדי למנוע את שגיאת ה-TypeScript
type EventType = 'hiking' | 'trip' | 'camping' | 'beach' | 'party' | 'food' | 'sport' | 'culture' | 'nature' | 'nightlife';

export default function CreateEventPage() {
  const { latitude, longitude } = useLocalSearchParams();
  const [eventTitle, setEventTitle] = useState('');
  // Use the EventType in your state
  const [eventType, setEventType] = useState<EventType | ''>(''); // Allow empty string initially
  const [eventDate, setEventDate] = useState(new Date());
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [cityCountry, setCityCountry] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    reverseGeocode();
  }, []);

  const reverseGeocode = async () => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=YOUR_MAPBOX_TOKEN&language=he`
      );
      const data = await response.json();
      if (data.features?.length > 0) {
        const feature = data.features[0];
        setEventLocation(feature.place_name_he || feature.place_name);

        // Extract city and country
        const contexts = feature.context || [];
        const place = contexts.find((c: any) => c.id.includes('place'));
        const country = contexts.find((c: any) => c.id.includes('country'));
        if (place && country) {
          setCityCountry(`${place.text_he || place.text}, ${country.text_he || country.text}`);
        }
      }
    } catch {
      setEventLocation(`${parseFloat(latitude as string).toFixed(4)}, ${parseFloat(longitude as string).toFixed(4)}`);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventType) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('https://tripping-app.onrender.com/add-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_uid: user?.uid,
          username: user?.displayName || 'משתמש',
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
          event_title: eventTitle,
          event_type: eventType,
          event_date: eventDate.toISOString(),
          description: eventDescription,
          location: eventLocation,
        }),
      });
      if (response.ok) {
        Alert.alert('הצלחה', 'האירוע נוצר!', [
          { text: 'אוקיי', onPress: () => router.replace('/home') }
        ]);
      } else {
        const errorData = await response.json();
        console.error('Error from server:', errorData);
        Alert.alert('שגיאה', `אירעה שגיאה ביצירת האירוע: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Network or parsing error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה ביצירת האירוע');
    } finally {
      setIsLoading(false);
    }
  };

  // Explicitly define the type for typeLabels כדי למנוע את שגיאת ה-TypeScript
  const typeLabels: Record<EventType, string> = {
    trip: 'טיול',
    hiking: 'הליכה',
    camping: 'קמפינג',
    beach: 'חוף',
    party: 'מסיבה',
    food: 'אוכל', // סוג חדש
    sport: 'ספורט',
    culture: 'תרבות', // סוג חדש
    nature: 'טבע', // סוג חדש
    nightlife: 'חיי לילה', // סוג חדש
  };

  // יצירת מערך סוגי האירועים עם הטיפוס הנכון
  const eventTypesArray: EventType[] = [
    'hiking', 'trip', 'camping', 'beach', 'party', 'food', 'sport',
    'culture', 'nature', 'nightlife'
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        {/* כפתור חזרה - שינוי הפעולה ל-router.back() ומיקום */}
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
            latitudeDelta: 0.01, longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: parseFloat(latitude as string), longitude: parseFloat(longitude as string) }}>
            <View style={styles.customMarker}><Ionicons name="location" size={30} color="#FF6F00" /></View>
          </Marker>
        </MapView>

        <View style={styles.locationBox}><Text style={styles.locationText}>{eventLocation}</Text></View>
        {cityCountry && <View style={styles.cityBox}><Text style={styles.cityText}>{cityCountry}</Text></View>}

        <TextInput
          style={styles.input}
          placeholder="כותרת האירוע"
          value={eventTitle}
          onChangeText={setEventTitle}
          placeholderTextColor="#999"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
          {eventTypesArray.map((type: EventType) => ( // Explicitly type 'type' in the map function
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, eventType === type && styles.typeSelected]}
              onPress={() => setEventType(type)}
            >
              <Ionicons
                name={
                  // לוגיקה לבחירת אייקון מ-Ionicons
                  type === 'trip' ? 'car' :
                  type === 'hiking' ? 'walk' :
                  type === 'camping' ? 'bonfire' :
                  type === 'beach' ? 'water' :
                  type === 'party' ? 'happy' :
                  type === 'food' ? 'fast-food' : // אייקון לסוג 'food'
                  type === 'sport' ? 'fitness' :
                  type === 'culture' ? 'school' : // אייקון לסוג 'culture'
                  type === 'nature' ? 'leaf' : // אייקון לסוג 'nature'
                  type === 'nightlife' ? 'wine' : // אייקון לסוג 'nightlife'
                  'help-circle' // אייקון ברירת מחדל אם אין התאמה
                }
                size={20}
                color={eventType === type ? 'white' : '#FF6F00'}
              />
              <Text style={[styles.typeText, { color: eventType === type ? 'white' : '#333' }]}>{typeLabels[type]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color="#FF6F00" />
          <Text style={styles.dateText}>{eventDate.toLocaleDateString('he-IL')}</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { height: 100, marginBottom: 20 }]} // הוספת marginBottom
          placeholder="תיאור האירוע"
          value={eventDescription}
          onChangeText={setEventDescription}
          multiline
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={[styles.createButton, isLoading && { opacity: 0.6 }]} onPress={handleCreateEvent} disabled={isLoading}>
          <Text style={styles.createButtonText}>{isLoading ? 'יוצר...' : 'צור אירוע'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDatePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <View style={styles.datePickerModal}>
            <DateTimePicker value={eventDate} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) setEventDate(d); }} minimumDate={new Date()} />
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
    justifyContent: 'space-between', // פיזור הכפתור והכותרת
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight ?? 24) + 10) : Constants.statusBarHeight + 10, // התאמה לסטטוס בר
    paddingBottom: 10,
    backgroundColor: '#FF6F00',
    // הוספת צל עבור אנדרואיד ו-iOS
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    // אין צורך ב-marginLeft אם משתמשים ב-justifyContent: 'space-between'
    padding: 5, // כדי להגדיל את אזור הלחיצה
  },
  headerTitle: {
    flex: 1, // מאפשר לכותרת לתפוס את המקום הנותר
    textAlign: 'center',
    color: 'white',
    fontSize: 20, // הגדלת גודל הגופן לכותרת
    fontWeight: 'bold',
    marginRight: 40, // רווח מהכפתור חזרה
  },
  scrollView: { padding: 20 },
  map: { height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 15 }, // רווח מתחת למפה
  customMarker: { alignItems: 'center', justifyContent: 'center' },
  locationBox: { backgroundColor: 'white', padding: 10, marginVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  locationText: { color: '#333', textAlign: 'center', fontWeight: '500' },
  cityBox: { backgroundColor: '#f5f5f5', padding: 8, marginBottom: 15, borderRadius: 8 }, // רווח מתחת לעיר
  cityText: { color: '#666', textAlign: 'center', fontSize: 12 },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8, // רווח אנכי אחיד
    color: '#333',
    textAlign: 'right',
    fontSize: 16, // גודל גופן אחיד
    borderWidth: 1, // גבול קל
    borderColor: '#eee', // צבע גבול
  },
  typeSelector: { flexDirection: 'row', marginVertical: 15 }, // רווח אנכי
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20, // כפתורים מעוגלים יותר
    marginRight: 10, // רווח בין כפתורים
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeSelected: {
    backgroundColor: '#FF6F00',
    borderColor: '#FF6F00', // גבול בצבע הבחירה
  },
  typeText: { marginLeft: 8, fontSize: 15, fontWeight: '500' }, // רווח וגודל גופן
  dateButton: {
    flexDirection: 'row-reverse', // כפתור תאריך מימין לשמאל
    alignItems: 'center',
    justifyContent: 'space-between', // פיזור האייקון והטקסט
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 15, // רווח אנכי
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateText: { marginRight: 10, fontSize: 16, color: '#333', fontWeight: '500' },
  createButton: {
    backgroundColor: '#FF6F00',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20, // רווח מהשדה שלפניו
    marginBottom: 30, // רווח מהקצה התחתון של המסך
  },
  createButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  datePickerModal: { backgroundColor: 'white', borderRadius: 15, padding: 20, margin: 20 },
});