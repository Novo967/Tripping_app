// app/create-event/index.tsx
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function CreateEventPage() {
  const { latitude, longitude } = useLocalSearchParams();
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // אנימציות
  const [slideAnimation] = useState(new Animated.Value(0));
  const [fadeAnimation] = useState(new Animated.Value(0));
  const [scaleAnimation] = useState(new Animated.Value(0.8));

  const auth = getAuth();
  const user = auth.currentUser;

  const eventTypes = [
    { id: 'trip', name: 'טיול', icon: 'car', color: '#FF6B6B' },
    { id: 'hiking', name: 'הליכה', icon: 'walk', color: '#4ECDC4' },
    { id: 'camping', name: 'קמפינג', icon: 'bonfire', color: '#FFB75E' },
    { id: 'beach', name: 'חוף', icon: 'water', color: '#667eea' },
    { id: 'party', name: 'מסיבה', icon: 'happy', color: '#f093fb' },
    { id: 'sport', name: 'ספורט', icon: 'fitness', color: '#43e97b' },
  ];

  useEffect(() => {
    // אנימציית כניסה
    Animated.parallel([
      Animated.spring(slideAnimation, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    reverseGeocode();
  }, []);

  const reverseGeocode = async () => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=YOUR_MAPBOX_TOKEN&language=he`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const placeName = place.place_name_he || place.place_name;
        setEventLocation(placeName);
      }
    } catch (error) {
      console.error('שגיאה בהמרת קואורדינטות:', error);
      setEventLocation(`${parseFloat(latitude as string).toFixed(4)}, ${parseFloat(longitude as string).toFixed(4)}`);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventType) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות הנדרשים');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://tripping-app.onrender.com/create-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user?.uid,
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
        Alert.alert('הצלחה!', 'האירוע נוצר בהצלחה', [
          { text: 'אוקיי', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'אירעה שגיאה ביצירת האירוע');
    } finally {
      setIsLoading(false);
    }
  };

  const animatedStyle = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
      { scale: scaleAnimation }
    ],
    opacity: fadeAnimation,
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[styles.header, animatedStyle]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>יצירת אירוע חדש</Text>
        <View style={styles.headerGlow} />
      </Animated.View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* מפה */}
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
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
                <View style={styles.markerPulse} />
                <Ionicons name="location" size={30} color="#FF6F00" />
              </View>
            </Marker>
          </MapView>
          <View style={styles.mapOverlay}>
            <Text style={styles.locationText}>{eventLocation}</Text>
          </View>
        </Animated.View>

        {/* כותרת */}
        <Animated.View style={[styles.inputSection, animatedStyle]}>
          <Text style={styles.sectionTitle}>🎯 כותרת האירוע</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="מה התוכנית?"
            placeholderTextColor="#999"
            value={eventTitle}
            onChangeText={setEventTitle}
            maxLength={50}
          />
          <Text style={styles.charCounter}>{eventTitle.length}/50</Text>
        </Animated.View>

        {/* בחירת סוג אירוע */}
        <Animated.View style={[styles.inputSection, animatedStyle]}>
          <Text style={styles.sectionTitle}>🎨 סוג האירוע</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
            {eventTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  eventType === type.id && styles.typeButtonSelected,
                ]}
                onPress={() => setEventType(type.id)}
              >
                <View style={[
                  styles.typeIcon,
                  eventType === type.id && { backgroundColor: type.color }
                ]}>
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={eventType === type.id ? 'white' : '#FF6F00'} 
                  />
                </View>
                <Text style={[
                  styles.typeText,
                  eventType === type.id && styles.typeTextSelected
                ]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* תאריך */}
        <Animated.View style={[styles.inputSection, animatedStyle]}>
          <Text style={styles.sectionTitle}>📅 מתי זה קורה?</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#FF6F00" />
            <Text style={styles.dateText}>
              {eventDate.toLocaleDateString('he-IL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#999" />
          </TouchableOpacity>
        </Animated.View>

        {/* תיאור */}
        <Animated.View style={[styles.inputSection, animatedStyle]}>
          <Text style={styles.sectionTitle}>📝 תיאור האירוע</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="ספר לנו עוד על האירוע..."
            placeholderTextColor="#999"
            value={eventDescription}
            onChangeText={setEventDescription}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.charCounter}>{eventDescription.length}/200</Text>
        </Animated.View>

        {/* כפתור יצירה */}
        <Animated.View style={[styles.createButtonContainer, animatedStyle]}>
          <TouchableOpacity
            style={[styles.createButton, isLoading && styles.createButtonDisabled]}
            onPress={handleCreateEvent}
            disabled={isLoading}
          >
            <View style={styles.createButtonContent}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner} />
                  <Text style={styles.createButtonText}>יוצר אירוע...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color="white" />
                  <Text style={styles.createButtonText}>בואו נתחיל!</Text>
                </>
              )}
            </View>
            <View style={styles.buttonGlow} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setEventDate(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FF6F00',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 40,
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 111, 0, 0.3)',
    transform: [{ scale: 1.5 }],
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  locationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputSection: {
    margin: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  charCounter: {
    textAlign: 'left',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
  },
  typeSelector: {
    flexDirection: 'row',
  },
  typeButton: {
    alignItems: 'center',
    marginLeft: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 80,
  },
  typeButtonSelected: {
    backgroundColor: '#FFE0B2',
    borderWidth: 2,
    borderColor: '#FF6F00',
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  typeTextSelected: {
    color: '#FF6F00',
    fontWeight: 'bold',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  createButtonContainer: {
    margin: 20,
    marginBottom: 40,
  },
  createButton: {
    backgroundColor: '#FF6F00',
    borderRadius: 30,
    padding: 18,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
  },
});