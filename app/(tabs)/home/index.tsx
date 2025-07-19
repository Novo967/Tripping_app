// app/(tabs)/home/index.tsx
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import DistanceFilterButton from '../../MapButtons/DistanceFilterButton';
import EventMarker from '../../components/EventMarker';
import FilterButton from '../../components/FilterButton';
import LocationSelector from '../../components/LocationSelector';
import UserMarker from '../../components/UserMarker';

import EventDetailsModal from '../../IndexServices/EventDetailsModal';
import { calculateDistance } from '../../IndexServices/MapUtils';
import MyLocationButton from '../../IndexServices/MyLocationButton';
import UserDetailsModal from '../../IndexServices/UserDetailsModal';

interface SelectedEventType {
  id: string;
  latitude: number;
  longitude: number;
  event_date: string;
  username: string;
  event_title: string;
  event_type: string;
  description?: string;
  location?: string;
  event_owner_uid: string;
  approved_users?: string[];
}

interface SelectedUserType {
  uid: string;
  username: string;
  latitude: number;
  longitude: number;
}

const SERVER_URL = 'https://tripping-app.onrender.com';

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<SelectedUserType[]>([]);
  const [events, setEvents] = useState<SelectedEventType[]>([]);
  const [displayDistance, setDisplayDistance] = useState(150);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(null);
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [currentUserUsername, setCurrentUserUsername] = useState('');

  const auth = getAuth();
  const user = auth.currentUser;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/get-all-users`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert('שגיאה', 'לא ניתן לטעון משתמשים.');
    }
  }, []);

  const fetchCurrentUserUsername = useCallback(async () => {
    if (!user) {
      setCurrentUserUsername('');
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/get-user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await res.json();
      if (res.ok && data.username) {
        setCurrentUserUsername(data.username);
      } else {
        console.error("Error fetching current user username:", data.error);
        setCurrentUserUsername('');
      }
    } catch (error) {
      console.error("Error fetching current user username:", error);
      setCurrentUserUsername('');
    }
  }, [user]);

  const deletePin = useCallback(async (pinId: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/delete-pin`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pinId }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`Pin ${pinId} deleted successfully:`, data.message);
        setEvents(prevEvents => prevEvents.filter(event => event.id !== pinId));
      } else {
        console.error(`Error deleting pin ${pinId}:`, data.message);
        Alert.alert('שגיאה', `לא ניתן למחוק את האירוע: ${data.message}`);
      }
    } catch (error) {
      console.error(`Error deleting pin ${pinId}:`, error);
      Alert.alert('שגיאה', 'אירעה שגיאה במחיקת האירוע.');
    }
  }, []);

  const fetchPins = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/get-pins`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const updatedPinsPromises = (data.pins || []).map(async (pin: any) => {
        const eventDate = new Date(pin.event_date);
        eventDate.setHours(0, 0, 0, 0);

        const deletionDate = new Date(eventDate);
        deletionDate.setDate(eventDate.getDate() + 1);

        if (todayStart.getTime() >= deletionDate.getTime()) {
          console.log(`Event ${pin.event_title} (${pin.id}) has passed its deletion threshold. Deleting pin.`);
          await deletePin(pin.id);
          return null;
        }
        return {
          id: pin.id,
          latitude: pin.latitude,
          longitude: pin.longitude,
          event_date: pin.event_date,
          username: pin.username,
          event_title: pin.event_title,
          event_type: pin.event_type,
          description: pin.description,
          location: pin.location,
          event_owner_uid: pin.owner_uid,
          approved_users: pin.approved_users || [],
        };
      });

      const results = await Promise.allSettled(updatedPinsPromises);
      const validPins = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<SelectedEventType>).value);

      setEvents(validPins);
    } catch (error) {
      console.error("Error fetching pins:", error);
      Alert.alert('שגיאה', 'לא ניתן לטעון אירועים.');
    }
  }, [deletePin]);

  const fetchLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission to access location was denied');
      Alert.alert('הרשאה נדחתה', 'לא ניתנה הרשאה לגישה למיקום. ייתכן שהמפה לא תפעל כראוי.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
    } catch (error) {
      console.error("Error fetching current location:", error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את המיקום הנוכחי.');
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchLocation(), fetchUsers(), fetchPins(), fetchCurrentUserUsername()]);
      setInitialDataLoaded(true);
    };
    loadInitialData();
  }, [fetchLocation, fetchUsers, fetchPins, fetchCurrentUserUsername]);

  useFocusEffect(useCallback(() => {
    fetchUsers();
    fetchPins();
    fetchCurrentUserUsername();
  }, [fetchUsers, fetchPins, fetchCurrentUserUsername]));

  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter(ev =>
      calculateDistance(currentLocation.latitude, currentLocation.longitude, ev.latitude, ev.longitude) <= displayDistance
    );
  }, [events, currentLocation, displayDistance, calculateDistance]);

  const handleAddEventPress = useCallback(() => {
      setTimeout(() => {
        setIsChoosingLocation(true);
      }, 500);
  }, []);

  const handleCancelLocationSelection = useCallback(() => {
    setIsChoosingLocation(false);
  }, []);

  const handleDistanceFilterPress = useCallback(() => {
    setDistanceModalVisible(true);
  }, []);

  const handleLocationUpdate = useCallback((location: { latitude: number; longitude: number }) => {
    console.log("Updating location:", location);
    setCurrentLocation(location);
    
    const newRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    
    setRegion(newRegion);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  }, []);

  const handleOpenPrivateChat = useCallback((targetUserUid: string, targetUsername: string) => {
    if (user && targetUserUid && targetUsername) {
      setSelectedUser(null);
      router.push({
        pathname: '/Chats/chatModal',
        params: { targetUserUid: targetUserUid, targetUsername: targetUsername }
      });
    } else {
      Alert.alert('שגיאה', 'לא ניתן לפתוח צ\'אט. נתונים חסרים.');
    }
  }, [user]);

  if (!initialDataLoaded || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>📡 טוען מפה...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={region}
        showsUserLocation={true} // מציג את הנקודה הכחולה המובנית של המפה
        showsMyLocationButton={false} // מבטל את הכפתור הפנימי כי יש לנו כפתור מותאם אישית
        followsUserLocation={false} // מונע מעקב אוטומטי כדי שהמפה לא תזוז כל הזמן
        userLocationPriority="high" // דיוק גבוה למיקום המשתמש
        userLocationUpdateInterval={5000} // עדכון כל 5 שניות
        onPress={(e) => {
          if (isChoosingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            router.push({
              pathname: '/components/CreateEventPage',
              params: { latitude: latitude.toString(), longitude: longitude.toString(), owner_uid: user?.uid || '' }
            });
            setIsChoosingLocation(false);
          }
        }}
        onUserLocationChange={(event) => {
          const coordinate = event.nativeEvent.coordinate;
          if (coordinate) {
            const { latitude, longitude } = coordinate;
            setCurrentLocation({ latitude, longitude });
          }
        }}
      >
        {visibleEvents.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onPress={(id) => {
              setSelectedUser(null);
              fetch(`${SERVER_URL}/get-pin?id=${id}`)
                .then(res => res.json())
                .then(data => {
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
                      location: data.pin.location,
                      event_owner_uid: data.pin.owner_uid,
                      approved_users: data.pin.approved_users || [],
                    });
                  } else {
                    setSelectedEvent(null);
                  }
                })
                .catch(error => {
                  console.error("Error fetching single pin:", error);
                  setSelectedEvent(null);
                });
            }}
          />
        ))}
        {/* רנדור מרקרי משתמשים אחרים בלבד */}
        {users.filter(u =>
          u.uid !== user?.uid && // מסנן החוצה את המשתמש הנוכחי
          currentLocation && calculateDistance(currentLocation.latitude, currentLocation.longitude, u.latitude, u.longitude) <= displayDistance
        ).map(userMarker => (
          <UserMarker 
            key={userMarker.uid} 
            user={userMarker} 
            currentUserUid={user?.uid}
            onPress={(u) => {
              setSelectedEvent(null);
              setSelectedUser(u);
            }} 
          />
        ))}
      </MapView>

      <FilterButton
        displayDistance={displayDistance}
        onDistanceFilterPress={handleDistanceFilterPress}
        onAddEventPress={handleAddEventPress}
        isChoosingLocation={isChoosingLocation}
      />

      <MyLocationButton onLocationUpdate={handleLocationUpdate} />

      <LocationSelector
        visible={isChoosingLocation}
        onCancel={handleCancelLocationSelection}
      />

      <EventDetailsModal
        visible={!!selectedEvent}
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        user={user}
        currentUserUsername={currentUserUsername}
        SERVER_URL={SERVER_URL}
      />

      <UserDetailsModal
        visible={!!selectedUser}
        selectedUser={selectedUser}
        onClose={() => setSelectedUser(null)}
        currentUserUid={user?.uid}
        onOpenPrivateChat={handleOpenPrivateChat}
      />

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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});