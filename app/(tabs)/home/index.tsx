// app/index.tsx
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View
} from 'react-native';
// ייבא את PROVIDER_GOOGLE כדי לציין את ספק המפה של גוגל
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import DistanceFilterButton from '../../MapButtons/DistanceFilterButton';
import EventMarker from '../../components/EventMarker';
import FilterButton from '../../components/FilterButton';
import LocationSelector from '../../components/LocationSelector';
import UserMarker from '../../components/UserMarker';

// ייבוא קומפוננטות המודל החדשות
import EventDetailsModal from '../../IndexServices/EventDetailsModal';
import MyLocationButton from '../../IndexServices/MyLocationButton';
import UserDetailsModal from '../../IndexServices/UserDetailsModal';
// ייבוא פונקציית העזר
import { calculateDistance } from '../../IndexServices/MapUtils';

// הגדרת ממשק (interface) עבור selectedEvent
interface SelectedEventType {
  id: string; // מזהה האירוע
  latitude: number;
  longitude: number;
  event_date: string;
  username: string; // שם המשתמש של מנהל האירוע
  event_title: string;
  event_type: string;
  description?: string;
  location?: string;
  event_owner_uid: string; // UID של מנהל האירוע
  approved_users?: string[]; // רשימת UID של משתמשים שאושרו
}

// הגדרת ממשק (interface) עבור selectedUser
interface SelectedUserType {
  uid: string;
  username: string;
  latitude: number;
  longitude: number;
}

const SERVER_URL = 'https://tripping-app.onrender.com';

export default function HomeScreen() {
  // מצב עבור אזור המפה הנוכחי
  const [region, setRegion] = useState<Region | null>(null);
  // מצב עבור רשימת המשתמשים המוצגים
  const [users, setUsers] = useState<SelectedUserType[]>([]);
  // מצב עבור רשימת האירועים המוצגים
  const [events, setEvents] = useState<SelectedEventType[]>([]);
  // מצב עבור מרחק התצוגה של המשתמשים והאירועים
  const [displayDistance, setDisplayDistance] = useState(150);
  // מצב עבור המיקום הנוכחי של המשתמש
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // מצב עבור המשתמש שנבחר מהמפה
  const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
  // מצב עבור האירוע שנבחר מהמפה
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(null);
  // מצב המציין אם המשתמש בוחר מיקום חדש לאירוע
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  // מצב המציין אם מודל סינון המרחק גלוי
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  // מצב המציין אם הנתונים הראשוניים נטענו
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  // מצב עבור שם המשתמש המחובר כרגע
  const [currentUserUsername, setCurrentUserUsername] = useState('');

  // קבלת אובייקט האותנטיקציה של Firebase
  const auth = getAuth();
  // קבלת המשתמש המחובר כרגע
  const user = auth.currentUser;

  /**
   * שולף את כל המשתמשים מהשרת.
   */
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

  /**
   * שולף את שם המשתמש המחובר כרגע מהשרת.
   */
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

  /**
   * מוחק אירוע (pin) מהשרת.
   * @param pinId מזהה האירוע למחיקה
   */
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

  /**
   * שולף את כל האירועים (pins) מהשרת ומטפל במחיקת אירועים שפג תוקפם.
   */
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

  /**
   * שולף את המיקום הנוכחי של המשתמש.
   */
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

  // אפקט לטעינת נתונים ראשונית בעת טעינת הקומפוננטה
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchLocation(), fetchUsers(), fetchPins(), fetchCurrentUserUsername()]);
      setInitialDataLoaded(true);
    };
    loadInitialData();
  }, [fetchLocation, fetchUsers, fetchPins, fetchCurrentUserUsername]);

  // אפקט לטעינת נתונים מחדש כאשר המסך מקבל פוקוס
  useFocusEffect(useCallback(() => {
    fetchUsers();
    fetchPins();
    fetchCurrentUserUsername();
  }, [fetchUsers, fetchPins, fetchCurrentUserUsername]));

  // חישוב אירועים גלויים באמצעות useMemo לאופטימיזציה
  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter(ev =>
      calculateDistance(currentLocation.latitude, currentLocation.longitude, ev.latitude, ev.longitude) <= displayDistance
    );
  }, [events, currentLocation, displayDistance, calculateDistance]);

  /**
   * מטפל בלחיצה על כפתור הוספת אירוע ומפעיל בחירת מיקום.
   */
  const handleAddEventPress = useCallback(() => {
      setTimeout(() => {
        setIsChoosingLocation(true);
      }, 500);
  }, []);

  /**
   * מטפל בביטול בחירת מיקום חדש לאירוע.
   */
  const handleCancelLocationSelection = useCallback(() => {
    setIsChoosingLocation(false);
  }, []);

  /**
   * מטפל בלחיצה על כפתור סינון מרחק ומציג את המודל.
   */
  const handleDistanceFilterPress = useCallback(() => {
    setDistanceModalVisible(true);
  }, []);

  /**
   * מטפל בעדכון המיקום מלחצן המיקום ומזיז את המפה למיקום החדש.
   */
  const handleLocationUpdate = useCallback((location: { latitude: number; longitude: number }) => {
    setCurrentLocation(location);
    setRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  }, []);

  /**
   * פותח צ'אט פרטי עם משתמש אחר.
   * @param targetUserUid ה-UID של המשתמש השני
   * @param targetUsername שם המשתמש של המשתמש השני
   */
  const handleOpenPrivateChat = useCallback((targetUserUid: string, targetUsername: string) => {
    if (user && targetUserUid && targetUsername) {
      setSelectedUser(null); // סגור את מודל המשתמש
      router.push({
        pathname: '/Chats/chatModal',
        params: { targetUserUid: targetUserUid, targetUsername: targetUsername }
      });
    } else {
      Alert.alert('שגיאה', 'לא ניתן לפתוח צ\'אט. נתונים חסרים.');
    }
  }, [user]);

  // הצגת מחוון טעינה אם הנתונים הראשוניים עדיין לא נטענו
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
        // הגדרת ספק המפה להיות Google Maps
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={region}
        onPress={(e) => {
          // אם המשתמש בוחר מיקום חדש לאירוע
          if (isChoosingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            router.push({
              pathname: '/components/CreateEventPage',
              params: { latitude: latitude.toString(), longitude: longitude.toString(), owner_uid: user?.uid || '' }
            });
            setIsChoosingLocation(false);
          }
          // סגירת מודלים צריכה להיות מטופלת בתוך המודלים עצמם
        }}
      >
        {/* רנדור מרקרי אירועים גלויים */}
        {visibleEvents.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onPress={(id) => {
              setSelectedUser(null); // סגור מודל משתמש אם פתוח
              // שלוף פרטי אירוע ספציפי
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
        {/* רנדור מרקרי משתמשים גלויים */}
        {users.filter(u =>
          currentLocation && calculateDistance(currentLocation.latitude, currentLocation.longitude, u.latitude, u.longitude) <= displayDistance
        ).map(userMarker => (
          <UserMarker key={userMarker.uid} user={userMarker} onPress={(u) => {
            setSelectedEvent(null); // סגור מודל אירוע אם פתוח
            setSelectedUser(u); // הצג מודל משתמש
          }} />
        ))}
      </MapView>

      {/* כפתורי סינון והוספת אירוע */}
      <FilterButton
        displayDistance={displayDistance}
        onDistanceFilterPress={handleDistanceFilterPress}
        onAddEventPress={handleAddEventPress}
        isChoosingLocation={isChoosingLocation}
      />

      {/* לחצן המיקום */}
      <MyLocationButton onLocationUpdate={handleLocationUpdate} />

      {/* סלקטור מיקום חדש לאירוע */}
      <LocationSelector
        visible={isChoosingLocation}
        onCancel={handleCancelLocationSelection}
      />

      {/* מודל פרטי אירוע נבחר */}
      <EventDetailsModal
        visible={!!selectedEvent}
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        user={user}
        currentUserUsername={currentUserUsername}
        SERVER_URL={SERVER_URL}
      />

      {/* מודל פרטי משתמש נבחר */}
      <UserDetailsModal
        visible={!!selectedUser}
        selectedUser={selectedUser}
        onClose={() => setSelectedUser(null)}
        currentUserUid={user?.uid}
        onOpenPrivateChat={handleOpenPrivateChat}
      />

      {/* מודל סינון מרחק */}
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