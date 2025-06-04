import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';


export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

  // שדות לאירוע
  const [eventType, setEventType] = useState<'מסיבה' | 'טיול' | 'אטרקציה' | 'אחר'>('מסיבה');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventDescription, setEventDescription] = useState('');

  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  console.log('UID:', uid);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      if (status !== 'granted') {
        Alert.alert('אין הרשאה למיקום');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      console.log('Current location:', loc);
      setLocation(loc);

      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      console.log('Setting region:', newRegion);
      setRegion(newRegion);
    })();
  }, []);

  useEffect(() => {
    console.log('UID in useEffect:', uid);
    if (!uid) return;

    const fetchProfileImage = async () => {
      try {
        console.log('Starting fetch request...');
        const res = await fetch('https://triping-6.onrender.com/get-user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid }),
        });
        console.log('Fetch response status:', res.status);

        const data = await res.json();
        console.log('profile_image URL:', data.profile_image);

        let imageUrl = data.profile_image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `data:image/jpeg;base64,${imageUrl}`;
        }
        setProfileImage(imageUrl || null);
      } catch (err) {
        console.error('Error fetching profile image:', err);
      }
    };

    fetchProfileImage();
  }, [uid]);

  // טיפול בבחירת תאריך בלוח שנה
  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  // שמירת האירוע (כעת רק לוג לקונסול, אפשר להוסיף API/DB אחר בהמשך)
  const saveEvent = () => {
    console.log('Saving event:', {
      eventType,
      eventDate,
      eventDescription,
    });

    // לדוגמה - פה אפשר לשלוח לשרת או לשמור בDB
    Alert.alert('האירוע נשמר בהצלחה!');
    // לאפס את השדות ולסגור את המודאל
    setEventType('מסיבה');
    setEventDate(new Date());
    setEventDescription('');
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      {region && location ? (
        <MapView style={{ flex: 1 }} region={region} showsUserLocation={true}>
          {profileImage && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
            >
              <Image
                source={{ uri: profileImage }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: 'white',
                }}
              />
            </Marker>
          )}
        </MapView>
      ) : (
        <View />
      )}

      {/* כפתור צף לפתיחת הוספת אירוע */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* מודאל הוספת אירוע */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>הוסף אירוע</Text>

            {/* בחירת סוג אירוע */}
            <View style={styles.pickerContainer}>
              {(['מסיבה', 'טיול', 'אטרקציה', 'אחר'] as const).map(type => (
                <Pressable
                  key={type}
                  style={[
                    styles.eventTypeOption,
                    eventType === type && styles.eventTypeOptionSelected,
                  ]}
                  onPress={() => setEventType(type)}
                >
                  <Text
                    style={[
                      styles.eventTypeText,
                      eventType === type && styles.eventTypeTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* בחירת תאריך */}
            <View style={styles.dateInputWrapper}>
              <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateInputContent}>
              <Text style={styles.datePickerText}>
                {eventDate.toLocaleDateString('he-IL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
              })}
              </Text>
              <Text style={styles.calendarEmoji}>📅</Text>
              </Pressable>
            </View>

            {showDatePicker && (
              <View style={{ marginBottom: 25 }}>
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                />
              </View>
          )}


            {/* תיאור אירוע */}
            <TextInput
              style={styles.textInput}
              placeholder="תיאור האירוע"
              placeholderTextColor="black" 
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
              numberOfLines={3}
            />

            {/* כפתור שמירה */}
            <Pressable style={styles.saveButton} onPress={saveEvent}>
              <Text style={styles.saveButtonText}>שמור</Text>
            </Pressable>

            {/* כפתור סגירה */}
            <Pressable
              style={[styles.saveButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.saveButtonText, styles.cancelButtonText]}>
                ביטול
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,           // הורדתי את הכפתור יותר למטה
    right: 20,
    backgroundColor: '#FF6F00',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: 'black',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 25,   // קצת יותר מרווח לכותרת
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row-reverse',  // כיוון מימין לשמאל
    justifyContent: 'space-between',
    marginBottom: 25,   // הגדלתי את המרווח בין האופציות לשאר השדות
  },
  eventTypeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'black',
  },
  eventTypeOptionSelected: {
    backgroundColor: '#FF6F00',
    borderColor: 'black',
  },
  eventTypeText: {
    fontSize: 14,
    color: '#555',
  },
  eventTypeTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  dateInputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 25,
    justifyContent: 'space-between',
  },
  dateInputContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  calendarEmoji: {
  fontSize: 20,
  marginLeft: 10,
},
  datePickerText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'right',
    flex: 1,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 10,  
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 25,    // הגדלתי את המרווח בין שדות
    textAlignVertical: 'top',  // טקסט שחור
    textAlign: 'right',  // יישור מימין לשמאל
  },
  saveButton: {
    backgroundColor: '#FF6F00',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#CCC',
  },
  cancelButtonText: {
    color: '#333',
  },
});
