// app/(tabs)/home/index.tsx
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useTheme } from '../../../app/ProfileServices/ThemeContext'; // ✅ ייבוא useTheme
import { app } from '../../../firebaseConfig';
import EventDetailsModal from '../../IndexServices/EventDetailsModal';
import { calculateDistance } from '../../IndexServices/MapUtils';
import UserDetailsModal from '../../IndexServices/UserDetailsModal';
import DistanceFilterButton from '../../MapButtons/DistanceFilterButton';
import EventFilterButton from '../../MapButtons/EventFilterButton';
import MyLocationButton from '../../MapButtons/MyLocationButton';
import EventMarker from '../../components/EventMarker';
import FilterButton from '../../components/FilterButton';
import LocationSelector from '../../components/LocationSelector';
import UserMarker from '../../components/UserMarker';

const db = getFirestore(app);

// כאן נגדיר את סגנון המפה הכהה.
// זהו סגנון לדוגמה, תוכל ליצור סגנון מותאם אישית משלך
// באמצעות כלי כמו Google Maps Styling Wizard.
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];


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
  owner_uid: string;
  approved_users?: string[];
}

interface SelectedUserType {
  uid: string;
  username: string;
  latitude: number;
  longitude: number;
  profile_image?: string;
}

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<SelectedUserType[]>([]);
  const [events, setEvents] = useState<SelectedEventType[]>([]);
  const [displayDistance, setDisplayDistance] = useState(150);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([
    'hiking', 'trip', 'camping', 'beach', 'party', 'food', 'sport',
    'culture', 'nature', 'nightlife',
  ]);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(null);
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [eventFilterModalVisible, setEventFilterModalVisible] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [currentUserUsername, setCurrentUserUsername] = useState('');

  const { theme } = useTheme(); // ✅ שימוש ב-useTheme hook

  const auth = getAuth();
  const user = auth.currentUser;

  const deletePin = useCallback(async (pinId: string) => {
    try {
      const pinDocRef = doc(db, 'pins', pinId);
      await deleteDoc(pinDocRef);
      console.log(`Pin ${pinId} deleted successfully from Firestore.`);
    } catch (error) {
      console.error(`Error deleting pin ${pinId} from Firestore:`, error);
      Alert.alert('שגיאה', 'אירעה שגיאה במחיקת האירוע.');
    }
  }, []);

  const fetchCurrentUserUsername = useCallback(async () => {
    if (!user) {
      setCurrentUserUsername('');
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData && userData.username) {
          setCurrentUserUsername(userData.username);
        } else {
          console.warn('Current user username not found in Firestore.');
          setCurrentUserUsername('');
        }
      } else {
        console.warn('Current user document not found in Firestore.');
        setCurrentUserUsername('');
      }
    } catch (error) {
      console.error('Error fetching current user username from Firestore:', error);
      setCurrentUserUsername('');
    }
  }, [user]);

  const fetchLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission to access location was denied');
      Alert.alert(
        'הרשאה נדחתה',
        'לא ניתנה הרשאה לגישה למיקום. ייתכן שהמפה לא תפעל כראוי.'
      );
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } catch (error) {
      console.error('Error fetching current location:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את המיקום הנוכחי.');
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchLocation();
      await fetchCurrentUserUsername();
      setInitialDataLoaded(true);
    };

    loadInitialData();
  }, [fetchLocation, fetchCurrentUserUsername]);

  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
      const usersData: SelectedUserType[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.latitude != null && data.longitude != null) {
          usersData.push({
            uid: doc.id,
            username: data.username,
            latitude: data.latitude,
            longitude: data.longitude,
            profile_image: data.profile_image || null,
          });
        }
      });
      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users from Firestore:", error);
      Alert.alert('שגיאה', 'לא ניתן לטעון משתמשים.');
    });

    const pinsCollection = collection(db, 'pins');
    const unsubscribePins = onSnapshot(pinsCollection, (snapshot) => {
      const pins: SelectedEventType[] = [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      snapshot.forEach((doc) => {
        const pinData = doc.data() as Omit<SelectedEventType, 'id'>;
        const pinId = doc.id;
        const eventDate = new Date(pinData.event_date);

        if (todayStart.getTime() > eventDate.getTime()) {
          deleteDoc(doc.ref)
            .then(() => console.log(`Event ${pinId} has expired and was deleted.`))
            .catch(error => console.error(`Error deleting expired pin ${pinId}:`, error));
        } else {
          pins.push({
            id: pinId,
            latitude: pinData.latitude,
            longitude: pinData.longitude,
            event_date: pinData.event_date,
            username: pinData.username,
            event_title: pinData.event_title,
            event_type: pinData.event_type,
            description: pinData.description,
            location: pinData.location,
            owner_uid: pinData.owner_uid,
            approved_users: pinData.approved_users || [],
          });
        }
      });
      setEvents(pins);
    }, (error) => {
      console.error('Error fetching pins from Firestore:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון אירועים.');
    });

    return () => {
      unsubscribeUsers();
      unsubscribePins();
    };
  }, []);

  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter((ev) => {
      const withinDistance =
        calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          ev.latitude,
          ev.longitude
        ) <= displayDistance;
      const eventTypeMatches = selectedEventTypes.includes(ev.event_type);
      return withinDistance && eventTypeMatches;
    });
  }, [events, currentLocation, displayDistance, selectedEventTypes]);

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

  const handleEventFilterPress = useCallback(() => {
    setEventFilterModalVisible(true);
  }, []);

  const handleLocationUpdate = useCallback(
    (location: { latitude: number; longitude: number }) => {
      console.log('Updating location:', location);
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
    },
    []
  );

  const handleOpenPrivateChat = useCallback(
    (targetUserUid: string, targetUsername: string) => {
      if (user && targetUserUid && targetUsername) {
        setSelectedUser(null);
        router.push({
          pathname: '/Chats/chatModal',
          params: { targetUserUid: targetUserUid, targetUsername: targetUsername },
        });
      } else {
        Alert.alert('שגיאה', "לא ניתן לפתוח צ'אט. נתונים חסרים.");
      }
    },
    [user]
  );

  const handleMarkerPress = useCallback(
    async (pinId: string) => {
      setSelectedUser(null);
      try {
        const pinDocRef = doc(db, 'pins', pinId);
        const pinDocSnap = await getDoc(pinDocRef);

        if (pinDocSnap.exists()) {
          const pinData = pinDocSnap.data() as Omit<SelectedEventType, 'id'>;
          setSelectedEvent({
            id: pinId,
            latitude: pinData.latitude,
            longitude: pinData.longitude,
            event_date: pinData.event_date,
            username: pinData.username,
            event_title: pinData.event_title,
            event_type: pinData.event_type,
            description: pinData.description,
            location: pinData.location,
            owner_uid: pinData.owner_uid,
            approved_users: pinData.approved_users || [],
          });
          console.log('Fetched single event data:', {
            id: pinId,
            ...pinData,
          });
        } else {
          console.warn('Pin document not found in Firestore.');
          setSelectedEvent(null);
        }
      } catch (error) {
        console.error('Error fetching single pin from Firestore:', error);
        setSelectedEvent(null);
      }
    },
    []
  );

  if (!initialDataLoaded || !region) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>📡 טוען מפה...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={false}
        userLocationPriority="high"
        userLocationUpdateInterval={5000}
        customMapStyle={theme.isDark ? darkMapStyle : []} // ✅ יישום סגנון המפה הכהה
        onPress={(e) => {
          if (isChoosingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            router.push({
              pathname: '/IndexServices/CreateEventPage',
              params: {
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                owner_uid: user?.uid || '',
              },
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
        {visibleEvents.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            onPress={(id) => handleMarkerPress(id)}
          />
        ))}
        {users
          .filter(
            (u) =>
              u.uid !== user?.uid &&
              currentLocation &&
              calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                u.latitude,
                u.longitude
              ) <= displayDistance
          )
          .map((userMarker) => (
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
        onEventFilterPress={handleEventFilterPress}
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
        userLocation={currentLocation}
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

      <EventFilterButton
        selectedEventTypes={selectedEventTypes}
        setSelectedEventTypes={setSelectedEventTypes}
        visible={eventFilterModalVisible}
        setVisible={setEventFilterModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});