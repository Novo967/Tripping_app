// app/create-event/index.tsx
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function CreateEventPage() {
  const { latitude, longitude } = useLocalSearchParams();
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('');
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
        // שינוי קריטי: שם השדה שונה ל-owner_uid
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
        { text: 'אוקיי', onPress: () => router.replace('/') }
      ]);
    } else {
      // הוסף לוגים כדי לראות את השגיאה המדויקת מהשרת
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

  const typeLabels = {trip:'טיול',hiking:'הליכה',camping:'קמפינג',beach:'חוף',party:'מסיבה',sport:'ספורט'};

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
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

        <TextInput style={styles.input} placeholder="כותרת האירוע" value={eventTitle} onChangeText={setEventTitle} placeholderTextColor="#999" />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
          {['trip','hiking','camping','beach','party','sport'].map((type) => (
            <TouchableOpacity key={type} style={[styles.typeButton, eventType === type && styles.typeSelected]} onPress={() => setEventType(type)}>
              <Ionicons name={type==='trip'?'car':type==='hiking'?'walk':type==='camping'?'bonfire':type==='beach'?'water':type==='party'?'happy':'fitness'} size={20} color={eventType===type?'white':'#FF6F00'} />
              <Text style={[styles.typeText, {color:eventType===type?'white':'#333'}]}>{typeLabels[type]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color="#FF6F00" />
          <Text style={styles.dateText}>{eventDate.toLocaleDateString('he-IL')}</Text>
        </TouchableOpacity>

        <TextInput style={[styles.input, {height:100}]} placeholder="תיאור האירוע" value={eventDescription} onChangeText={setEventDescription} multiline placeholderTextColor="#999" />

        <TouchableOpacity style={[styles.createButton, isLoading && {opacity:0.6}]} onPress={handleCreateEvent} disabled={isLoading}>
          <Text style={styles.createButtonText}>{isLoading?'יוצר...':'צור אירוע'}</Text>
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
  container:{flex:1,backgroundColor:'#f8f9fa'},
  header:{flexDirection:'row-reverse',alignItems:'center',padding:20,backgroundColor:'#FF6F00'},
  backButton:{marginLeft:10}, 
  headerTitle:{flex:1,textAlign:'center',color:'white',fontSize:18,fontWeight:'bold'},
  scrollView:{padding:20}, 
  map:{height:200,borderRadius:20,overflow:'hidden'},
  customMarker:{alignItems:'center',justifyContent:'center'},
  locationBox:{backgroundColor:'white',padding:10,marginVertical:10,borderRadius:10,borderWidth:1,borderColor:'#ddd'},
  locationText:{color:'#333',textAlign:'center',fontWeight:'500'},
  cityBox:{backgroundColor:'#f5f5f5',padding:8,marginBottom:10,borderRadius:8},
  cityText:{color:'#666',textAlign:'center',fontSize:12},
  input:{backgroundColor:'white',borderRadius:10,padding:12,marginVertical:10,color:'#333',textAlign:'right'},
  typeSelector:{flexDirection:'row',marginVertical:10},
  typeButton:{flexDirection:'row',alignItems:'center',backgroundColor:'white',padding:10,borderRadius:10,marginRight:10},
  typeSelected:{backgroundColor:'#FF6F00'},
  typeText:{marginLeft:5,fontSize:14},
  dateButton:{flexDirection:'row',alignContent: 'flex-end',padding:12,backgroundColor:'white',borderRadius:10,marginVertical:10},
  dateText:{marginLeft:10,fontSize:16,color:'#333'},
  createButton:{backgroundColor:'#FF6F00',padding:15,borderRadius:10,alignItems:'center',marginTop:20},
  createButtonText:{color:'white',fontWeight:'bold'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'},
  datePickerModal:{backgroundColor:'white',borderRadius:15,padding:20,margin:20},
});