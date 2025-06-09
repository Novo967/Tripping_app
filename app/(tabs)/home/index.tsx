import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { auth } from '../../../firebaseConfig'; // או מהנתיב שלך לקובץ ההגדרות של Firebase

interface User {
  uid: string;
  latitude: number;
  longitude: number;
  profile_image: string;
}

interface Event {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
}

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [events, setEvents] = useState<Event[]>([]);

  // 🔁 כאן תכניס את ה־uid שלך או תביא אותו מ־Context בעתיד
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;


  useEffect(() => {
    const getLocationAndFetchUsers = async () => {
      try {
        // בקשת הרשאה
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        // קבלת מיקום נוכחי
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // עדכון אזור במפה
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        // שליחת מיקום לשרת
        await fetch('https://tripping-app.onrender.com/update-user-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, latitude, longitude }),
        });

        // שליפת משתמשים
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

  const handleAddEvent = () => {
    if (!region || !eventTitle.trim()) return;

    const newEvent: Event = {
      id: Date.now().toString(),
      title: eventTitle,
      latitude: region.latitude,
      longitude: region.longitude,
    };

    setEvents([...events, newEvent]);
    setEventTitle('');
    setModalVisible(false);
  };

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>❌ Error: {error}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="blue" />
        <Text>📡 Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} region={region}>
        {users.map((user) => (
          <Marker
            key={user.uid}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
          >
            <View style={styles.markerContainer}>
              <Image source={{ uri: user.profile_image }} style={styles.profileMarker} />
            </View>
          </Marker>
        ))}
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            title={event.title}
            pinColor="orange"
          />
        ))}
      </MapView>

      {/* כפתור הוספת אירוע */}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* מודאל להוספת אירוע */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🗓️ Add New Event</Text>
            <TextInput
              style={styles.input}
              placeholder="Event title"
              value={eventTitle}
              onChangeText={setEventTitle}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddEvent}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#ccc' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  profileMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'orange',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'orange',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
