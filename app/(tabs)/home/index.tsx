import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
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

  // מסנן מפה
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterAnimation] = useState(new Animated.Value(0));
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  // פונקציית חישוב מרחק
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

  // פונקציות API
  const fetchUsers = async () => {
    try {
      const response = await fetch('https://tripping-app.onrender.com/get-all-users');
      const data = await response.json();
      setUsers(data.users);
      return true;
    } catch (error) {
      console.error('שגיאה בטעינת משתמשים:', error);
      return false;
    }
  };

  const fetchPinsFromServer = async () => {
    try {
      const response = await fetch('https://tripping-app.onrender.com/get-pins');
      const data = await response.json();
      if (data.pins) {
        const normalizedPins = data.pins.map((pin: any) => ({
          id: pin.id,
          latitude: pin.latitude,
          longitude: pin.longitude,
          date: pin.event_date,
          username: pin.username,
          title: pin.event_title,
          type: pin.event_type,
        }));
        setEvents(normalizedPins);
        return true;
      }
      return false;
    } catch (error) {
      console.error('שגיאה בטעינת סיכות:', error);
      return false;
    }
  };

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setRegion({ latitude, longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
      return true;
    } catch (error) {
      console.error('שגיאה בקבלת מיקום:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const [locationLoaded, usersLoaded, pinsLoaded] = await Promise.all([
        fetchLocation(),
        fetchUsers(),
        fetchPinsFromServer()
      ]);
      
      if (locationLoaded && usersLoaded && pinsLoaded) {
        setInitialDataLoaded(true);
      }
    };
    loadInitialData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
      fetchPinsFromServer();
    }, [])
  );

  const getVisibleUsers = () => {
    if (!currentLocation) return users;
    return users.filter(user => {
      const dist = calculateDistance(currentLocation.latitude, currentLocation.longitude, user.latitude, user.longitude);
      return dist <= displayDistance;
    });
  };

  const visibleEvents = useMemo(() => {
    if (!currentLocation) return events;
    return events.filter(event => {
      const dist = calculateDistance(currentLocation.latitude, currentLocation.longitude, event.latitude, event.longitude);
      return dist <= displayDistance;
    });
  }, [events, currentLocation, displayDistance]);

  const handleMarkerPress = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`https://tripping-app.onrender.com/get-pin?id=${eventId}`);
      const data = await response.json();
      if (data.pin) {
        setSelectedEvent({
          id: data.pin.id,
          latitude: data.pin.latitude,
          longitude: data.pin.longitude,
          title: data.pin.event_title,
          type: data.pin.event_type,
          username: data.pin.username,
          date: data.pin.event_date,
          description: data.pin.description,
          location: data.pin.location,
        });
      }
    } catch (error) {
      console.error('שגיאה בטעינת פרטי הסיכה:', error);
    }
  }, []);

  const toggleFilterMenu = () => {
    const toValue = isFilterMenuVisible ? 0 : 1;
    setIsFilterMenuVisible(!isFilterMenuVisible);
    
    Animated.spring(filterAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleAddEventPress = () => {
    setIsFilterMenuVisible(false);
    setIsChoosingLocation(true);
    Animated.spring(filterAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleDistanceFilterPress = () => {
    setIsFilterMenuVisible(false);
    setDistanceModalVisible(true);
    Animated.spring(filterAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  if (!initialDataLoaded || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={styles.loadingText}>📡 טוען מפה...</Text>
      </View>
    );
  }

  const filterMenuStyle = {
    transform: [
      {
        translateY: filterAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-100, 0],
        }),
      },
      {
        scale: filterAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
    ],
    opacity: filterAnimation,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onPress={(e) => {
          if (isChoosingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            router.push({
              pathname: '/components/CreateEventPage',
              params: {
                latitude: latitude.toString(),
                longitude: longitude.toString(),
              }
            });
            setIsChoosingLocation(false);
          }
          
          if (isFilterMenuVisible) {
            toggleFilterMenu();
          }
        }}
      >
        {getVisibleUsers().map((user) => (
          <UserMarker
            key={user.uid}
            user={user}
            onPress={setSelectedUser}
          />
        ))}

        {visibleEvents.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onPress={handleMarkerPress}
          />
        ))}
      </MapView>

      {/* כפתור מסנן */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[
            styles.filterButton,
            isChoosingLocation && styles.activeButton,
            isFilterMenuVisible && styles.filterButtonActive
          ]} 
          onPress={toggleFilterMenu}
        >
          <Ionicons 
            name={isFilterMenuVisible ? "close" : "options"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>

        {isFilterMenuVisible && (
          <Animated.View style={[styles.filterMenu, filterMenuStyle]}>
            <TouchableOpacity 
              style={styles.filterMenuItem} 
              onPress={handleDistanceFilterPress}
            >
              <View style={styles.filterMenuItemContent}>
                <Text style={styles.filterMenuSubText}>{displayDistance} ק"מ</Text>
                <Text style={styles.filterMenuText}>מרחק תצוגה</Text>
                <Ionicons name="resize" size={20} color="#FF6F00" />
              </View>
            </TouchableOpacity>

            <View style={styles.filterMenuDivider} />

            <TouchableOpacity 
              style={styles.filterMenuItem} 
              onPress={handleAddEventPress}
            >
              <View style={styles.filterMenuItemContent}>
                <Text style={styles.filterMenuSubText}>בחר מיקום במפה</Text>
                <Text style={styles.filterMenuText}>הוסף אירוע</Text>
                <Ionicons name="add-circle" size={20} color="#FF6F00" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* אינדיקטור בחירת מיקום */}
      {isChoosingLocation && (
        <View style={styles.locationIndicator}>
          <Text style={styles.locationIndicatorText}>👆 לחץ על המפה לבחירת מיקום</Text>
        </View>
      )}

      {/* מודל אירוע נבחר */}
      {selectedEvent && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedEvent(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedEvent(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                <Text style={styles.modalDate}>
                  {new Date(selectedEvent.date).toLocaleDateString('he-IL')}
                </Text>
                <Text style={styles.modalType}>סוג: {selectedEvent.type}</Text>
                <Text style={styles.modalAuthor}>מאת: {selectedEvent.username}</Text>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    router.push({
                      pathname: '/Chats/GroupChatModal',
                      params: { eventTitle: selectedEvent.title },
                    });
                    setSelectedEvent(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>היכנס לצאט האירוע</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* מודל משתמש נבחר */}
      {selectedUser && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedUser(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedUser(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>
                  {selectedUser.username || 'משתמש'}
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    router.push({
                      pathname: '/ProfileServices/OtherUserProfile',
                      params: { uid: selectedUser.uid },
                    });
                    setSelectedUser(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>לצפייה בפרופיל</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

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
  
  // מסנן
  filterContainer: {
    position: 'absolute',
    top: 60,
    right: 15,
    alignItems: 'flex-end',
  },
  filterButton: {
    backgroundColor: '#FF6F00',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  filterButtonActive: {
    backgroundColor: '#E65100',
  },
  activeButton: {
    backgroundColor: '#FFB74D',
  },
  filterMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  filterMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  filterMenuSubText: {
    fontSize: 12,
    color: '#666',
  },
  filterMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  
  // אינדיקטור מיקום
  locationIndicator: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 111, 0, 0.9)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationIndicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // מודלים
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: 280,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  modalDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  modalType: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  modalAuthor: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#FF6F00',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});