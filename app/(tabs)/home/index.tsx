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

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [displayDistance, setDisplayDistance] = useState(40);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);

  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterAnimation] = useState(new Animated.Value(0));
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('https://tripping-app.onrender.com/get-all-users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  };

  const fetchPins = async () => {
    try {
      const res = await fetch('https://tripping-app.onrender.com/get-pins');
      const data = await res.json();
      setEvents((data.pins || []).map((pin:any) => ({
        id: pin.id, latitude: pin.latitude, longitude: pin.longitude,
        date: pin.event_date, username: pin.username,
        title: pin.event_title, type: pin.event_type
      })));
    } catch {}
  };

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchLocation(), fetchUsers(), fetchPins()]);
      setInitialDataLoaded(true);
    })();
  }, []);

  useFocusEffect(useCallback(() => { fetchUsers(); fetchPins(); }, []));

  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter(ev => calculateDistance(currentLocation.latitude, currentLocation.longitude, ev.latitude, ev.longitude) <= displayDistance);
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

  if (!initialDataLoaded || !region) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#FF6F00" /><Text>📡 טוען מפה...</Text></View>;
  }

  const filterMenuStyle = {
    transform: [{
      translateY: filterAnimation.interpolate({ inputRange: [0,1], outputRange: [-100,0] })
    }],
    opacity: filterAnimation
  };

  return (
    <View style={{flex:1}}>
      <MapView
        style={{flex:1}} region={region}
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
        }}
      >
        {visibleEvents.map(event => (
          <EventMarker key={event.id} event={event} onPress={(id) => {
            fetch(`https://tripping-app.onrender.com/get-pin?id=${id}`)
              .then(res => res.json())
              .then(data => setSelectedEvent(data.pin ? { ...data.pin, id: data.pin.id } : null))
              .catch(console.error);
          }} />
        ))}
        {users.filter(u =>
          currentLocation && calculateDistance(currentLocation.latitude, currentLocation.longitude, u.latitude, u.longitude) <= displayDistance
        ).map(user => (
          <UserMarker key={user.uid} user={user} onPress={setSelectedUser} />
        ))}
      </MapView>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, isChoosingLocation && {backgroundColor:'#FFB74D'}]} onPress={toggleFilterMenu}>
          <Ionicons name={isFilterMenuVisible ? "close" : "options"} size={24} color="white" />
        </TouchableOpacity>
        {isFilterMenuVisible && (
          <Animated.View style={[styles.filterMenu, filterMenuStyle]}>
            <TouchableOpacity style={styles.menuItemContainer} onPress={() => {setDistanceModalVisible(true);toggleFilterMenu();}}>
              <Ionicons name="resize" size={18} color="#FF6F00" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>מרחק תצוגה ({displayDistance} ק"מ)</Text>
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
        <Modal visible animationType="fade" transparent onRequestClose={() => setSelectedEvent(null)}>
          <TouchableWithoutFeedback onPress={() => setSelectedEvent(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{selectedEvent.event_title}</Text>
                <Text style={styles.modalDate}>{new Date(selectedEvent.event_date).toLocaleDateString('he-IL')}</Text>
                <Text style={styles.modalAuthor}>מאת: {selectedEvent.username}</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      <DistanceFilterButton displayDistance={displayDistance} setDisplayDistance={setDisplayDistance}
        visible={distanceModalVisible} setVisible={setDistanceModalVisible} />
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
    color: '#FF6F00',
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
});
