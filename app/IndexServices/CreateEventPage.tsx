// app/IndexServices/CreateEventPage.tsx
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { app } from '../../firebaseConfig';

// Define event types according to your requirements
type EventType =
    | 'trip'
    | 'party'
    | 'attraction'
    | 'food'
    | 'nightlife'
    | 'beach'
    | 'sport'
    | 'other';

export default function CreateEventPage() {
    const { latitude, longitude } = useLocalSearchParams();
    const [eventTitle, setEventTitle] = useState('');
    const [eventType, setEventType] = useState<EventType | ''>('');
    const [eventDate, setEventDate] = useState(new Date());
    const [eventDescription, setEventDescription] = useState('');
    const [eventLocation, setEventLocation] = useState('טוען מיקום...');
    const [cityCountry, setCityCountry] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [eventImageUri, setEventImageUri] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);

    useEffect(() => {
        if (latitude && longitude) {
            reverseGeocode();
        }
    }, [latitude, longitude]);

    const reverseGeocode = async () => {
        try {
            // Mapbox access token
            const mapboxToken = 'pk.eyJ1Ijoibm9hbS1sZTE3IiwiYSI6ImNtZTczeG4wdzAwZjcya3Nod2U2d3M4OTUifQ.0ybxsmWtdKP95wmyMw491w';

            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&language=he`
            );
            const data = await response.json();
            if (data.features?.length > 0) {
                const feature = data.features[0];
                setEventLocation(feature.place_name_he || feature.place_name);

                const contexts = feature.context || [];
                const place = contexts.find((c: any) => c.id.includes('place'));
                const country = contexts.find((c: any) => c.id.includes('country'));
                if (place && country) {
                    setCityCountry(`${place.text_he || place.text}, ${country.text_he || country.text}`);
                } else {
                    setCityCountry('');
                }
            } else {
                setEventLocation('לא נמצאה כתובת');
                setCityCountry('');
            }
        } catch (error) {
            console.error('Error during reverse geocoding:', error);
            setEventLocation('שגיאה בטעינת המיקום');
            setCityCountry('');
        }
    };

    const handleImagePicker = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('הרשאה נדרשת', 'נדרשת הרשאת גלריה כדי לבחור תמונות.');
                return;
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7, // הורדת איכות לביצועים טובים יותר
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const selectedAsset = result.assets[0];
            if (!selectedAsset.uri) {
                Alert.alert('שגיאה', 'לא ניתן לגשת לתמונה שנבחרה');
                return;
            }

            setEventImageUri(selectedAsset.uri);
        } catch (error: any) {
            console.error('Error picking image:', error);
            Alert.alert('שגיאה', `בחירת התמונה נכשלה: ${error.message || 'שגיאה לא ידועה'}`);
        }
    };

    const uploadImage = async (uri: string, eventTitle: string) => {
        setIsUploadingImage(true);
        try {
            // בדיקת תקינות URI
            if (!uri || uri.trim() === '') {
                throw new Error('URI של התמונה לא חוקי');
            }

            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error('לא ניתן לטעון את התמונה');
            }
            
            const blob = await response.blob();
            
            // בדיקת גודל הקובץ (מקסימום 10MB)
            if (blob.size > 10 * 1024 * 1024) {
                throw new Error('התמונה גדולה מדי (מקסימום 10MB)');
            }

            const sanitizedEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_');
            const fileRef = ref(storage, `group_images/${sanitizedEventTitle}/groupImage_${Date.now()}.jpg`);
            
            await uploadBytes(fileRef, blob);
            const downloadURL = await getDownloadURL(fileRef);
            
            return downloadURL;
        } catch (error: any) {
            console.error('Error uploading image:', error);
            Alert.alert('שגיאה', `העלאת התמונה נכשלה: ${error.message || 'שגיאה לא ידועה'}`);
            return null;
        } finally {
            setIsUploadingImage(false);
        }
    };
    const handleCreateEvent = async () => {
        if (!eventTitle.trim() || !eventType) {
            Alert.alert('שגיאה', 'אנא מלא את כל השדות הנדרשים');
            return;
        }

        const userId = auth.currentUser?.uid;
        const username = auth.currentUser?.displayName || 'משתמש';

        if (!userId) {
            Alert.alert('שגיאה', 'אין משתמש מחובר. אנא התחבר ונסה שוב.');
            return;
        }

        setIsLoading(true);
        let imageUrl = null;
        if (eventImageUri) {
            imageUrl = await uploadImage(eventImageUri, eventTitle);
            if (!imageUrl) {
                setIsLoading(false);
                return;
            }
        }

        try {
            // ✅ שינוי מרכזי: הוספת השדה 'approved_users' עם ה-ID של היוצר
            const eventData = {
                owner_uid: userId,
                username: username,
                latitude: parseFloat(latitude as string),
                longitude: parseFloat(longitude as string),
                event_title: eventTitle,
                event_type: eventType,
                event_date: eventDate.toISOString(),
                description: eventDescription,
                location: eventLocation,
                city_country: cityCountry,
                created_at: new Date().toISOString(),
                // ✅ שינוי: הוספת השדה approved_users עם ה-uid של המשתמש היוצר.
                approved_users: [userId],
                ...(imageUrl && { eventImageUrl: imageUrl }),
            };

            await addDoc(collection(db, 'pins'), eventData);

            // ✅ שינוי: הוספת ה-uid של היוצר לרשימת חברי הצ'אט
            await setDoc(doc(db, 'group_chats', eventTitle), {
                name: eventTitle,
                members: [userId],
                groupImage: imageUrl || null,
                createdAt: serverTimestamp(),
            });

            router.replace('/home');
        } catch (error) {
            console.error('Firestore error:', error);
            Alert.alert(
                'שגיאה',
                'אירעה שגיאה ביצירת האירוע או בשמירה במסד הנתונים.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    // ... (rest of the component and styles)
    const typeLabels: Record<EventType, string> = {
        trip: 'טיול',
        party: 'מסיבה',
        attraction: 'אטרקציה',
        food: 'אוכל',
        nightlife: 'חיי לילה',
        beach: 'ים/בריכה',
        sport: 'ספורט',
        other: 'אחר',
    };
    
    const getEventIcon = (type: EventType): keyof typeof Ionicons.glyphMap => {
        const iconMap: Record<EventType, keyof typeof Ionicons.glyphMap> = {
            trip: 'car',
            party: 'musical-notes',
            attraction: 'star',
            food: 'restaurant',
            nightlife: 'wine',
            beach: 'water',
            sport: 'fitness',
            other: 'ellipsis-horizontal-circle',
        };
        return iconMap[type];
    };
    
    const eventTypesArray: EventType[] = [
        'trip',
        'party',
        'attraction',
        'food',
        'nightlife',
        'beach',
        'sport',
        'other',
    ];
    
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-forward" size={24} color="white" />
                </TouchableOpacity>
    
                <Text style={styles.headerTitle}>יצירת אירוע</Text>
    
                <View style={styles.backButton} />
            </View>
    
            <ScrollView style={styles.scrollView}>
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
                            <Ionicons name="location" size={30} color="#3A8DFF" />
                        </View>
                    </Marker>
                </MapView>
    
                <View style={styles.locationContainer}>
                    <View style={styles.locationInfo}>
                        <Ionicons name="location-outline" size={20} color="#333" style={{ marginRight: 8 }} />
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationText}>{eventLocation}</Text>
                            {cityCountry ? (
                                <Text style={styles.cityText}>{cityCountry}</Text>
                            ) : null}
                        </View>
                    </View>
                   <TouchableOpacity
                      style={styles.editLocationButton}
                      onPress={() => router.replace({
                          pathname: '/home',
                          params: { isChoosingLocation: 'true' }
                      })}
                  >
                      <Text style={styles.editLocationButtonText}>ערוך מיקום</Text>
                  </TouchableOpacity>
                </View>
    
                <View style={styles.imagePickerContainer}>
                    <TouchableOpacity style={styles.imagePickerButton} onPress={handleImagePicker}>
                        {eventImageUri ? (
                            <Image source={{ uri: eventImageUri }} style={styles.eventImagePreview} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="camera-outline" size={30} color="#3A8DFF" />
                                <Text style={styles.imagePlaceholderText}>הוסף תמונה לאירוע</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {isUploadingImage && (
                        <View style={styles.imageLoadingOverlay}>
                            <ActivityIndicator size="small" color="#fff" />
                        </View>
                    )}
                </View>
    
                <TextInput
                    style={styles.input}
                    placeholder="כותרת האירוע"
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    maxLength={23}
                    placeholderTextColor="#999"
                />
    
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.typeSelector}
                    contentContainerStyle={styles.typeSelectorContent}
                >
                    {eventTypesArray.map((type: EventType) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.typeButton, eventType === type && styles.typeSelected]}
                            onPress={() => setEventType(type)}
                        >
                            <Ionicons
                                name={getEventIcon(type)}
                                size={20}
                                color={eventType === type ? 'white' : '#3A8DFF'}
                            />
                            <Text
                                style={[
                                    styles.typeText,
                                    { color: eventType === type ? 'white' : '#333' },
                                ]}
                            >
                                {typeLabels[type]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
    
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', width: '100%' }}>
                    <TouchableOpacity
                        style={[styles.dateButton, { flex: 1, flexDirection: 'row-reverse', justifyContent: 'flex-end' }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar" size={20} color="#3A8DFF" style={{ marginLeft: 10 }} />
                        <Text style={[styles.dateText, { flex: 1, textAlign: 'right' }]}>
                            {eventDate.toLocaleDateString('he-IL')}
                        </Text>
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={[styles.input, { height: 100, marginBottom: 20 }]}
                    placeholder="תיאור האירוע"
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    multiline
                    placeholderTextColor="#999"
                />
    
                <TouchableOpacity
                    style={[styles.createButton, isLoading && { opacity: 0.6 }]}
                    onPress={handleCreateEvent}
                    disabled={isLoading}
                >
                    <Text style={styles.createButtonText}>
                        {isLoading ? 'יוצר...' : 'צור אירוע'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
    
            <Modal visible={showDatePicker} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setShowDatePicker(false)}
                >
                    <View style={styles.datePickerModal}>
                        <DateTimePicker
                            value={eventDate}
                            mode="date"
                            onChange={(e, d) => {
                                setShowDatePicker(false);
                                if (d) setEventDate(d);
                            }}
                            minimumDate={new Date()}
                        />
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
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingTop:
            Platform.OS === 'android'
                ? (StatusBar.currentHeight ?? 24) + 10
                : Constants.statusBarHeight + 10,
        paddingBottom: 10,
        backgroundColor: '#3A8DFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollView: { padding: 20 },
    map: { height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 15 },
    customMarker: { alignItems: 'center', justifyContent: 'center' },

    locationContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 12,
        marginVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    locationInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        flexShrink: 1,
    },
    locationTextContainer: {
        flexShrink: 1,
    },
    locationText: {
        color: '#333',
        textAlign: 'right',
        fontWeight: '600',
        fontSize: 16,
        flexShrink: 1,
    },
    cityText: {
        color: '#666',
        textAlign: 'right',
        fontSize: 12,
        marginTop: 2,
        flexShrink: 1,
    },
    editLocationButton: {
        backgroundColor: '#E8F0FE',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    editLocationButtonText: {
        color: '#3A8DFF',
        fontWeight: '600',
        fontSize: 14,
    },

    imagePickerContainer: {
        marginVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePickerButton: {
        width: '100%',
        height: 180,
        borderRadius: 20,
        backgroundColor: '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#3A8DFF',
        borderStyle: 'dashed',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
            color: '#3A8DFF',
        marginTop: 8,
        fontSize: 16,
        fontWeight: 'bold',
    },
    eventImagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    input: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 12,
        marginVertical: 8,
        color: '#333',
        textAlign: 'right',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    typeSelector: {
        flexDirection: 'row',
        marginVertical: 15,
    },
    typeSelectorContent: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 5,
    },
    typeButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        minWidth: 80,
    },
    typeSelected: {
        backgroundColor: '#3A8DFF',
        borderColor: '#3A8DFF',
    },
    typeText: {
        marginRight: 8,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
    },
    dateButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 10,
        marginVertical: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
    dateText: { marginRight: 10, fontSize: 16, color: '#333', fontWeight: '500' },
    createButton: {
        backgroundColor: '#3A8DFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    createButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerModal: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        margin: 20,
    },
});