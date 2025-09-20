import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../ThemeContext';
import { eventTypesArray, getDefaultEventDate, getEventIcon, typeLabels } from './CreateEvent/constants';
import { FirebaseService } from './CreateEvent/firebaseService';
import { ImageService } from './CreateEvent/imageService';
import { LocationService } from './CreateEvent/locationService';
import { createStyles } from './CreateEvent/styles';
import { EventType } from './CreateEvent/types';

export default function CreateEventPage() {
    const { theme } = useTheme();
    const styles = createStyles(theme);
    
    const { latitude, longitude } = useLocalSearchParams();
    const [eventTitle, setEventTitle] = useState('');
    const [eventType, setEventType] = useState<EventType | ''>('');
    const [eventDate, setEventDate] = useState(getDefaultEventDate()); // Default +5 hours
    const [eventDescription, setEventDescription] = useState('');
    const [eventLocation, setEventLocation] = useState('טוען מיקום...');
    const [cityCountry, setCityCountry] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [eventImageUri, setEventImageUri] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [tempDate, setTempDate] = useState(getDefaultEventDate());

    useEffect(() => {
        if (latitude && longitude) {
            loadLocation();
        }
    }, [latitude, longitude]);

    const loadLocation = async () => {
        const locationData = await LocationService.reverseGeocode(
            latitude as string, 
            longitude as string
        );
        setEventLocation(locationData.eventLocation);
        setCityCountry(locationData.cityCountry);
    };

    const handleImagePicker = async () => {
        const imageUri = await ImageService.pickImage();
        if (imageUri) {
            setEventImageUri(imageUri);
        }
    };

    const handleCreateEvent = async () => {
        if (!eventTitle.trim() || !eventType) {
            Alert.alert('שגיאה', 'אנא מלא את כל השדות הנדרשים');
            return;
        }

        setIsLoading(true);
        let imageUrl = null;

        if (eventImageUri) {
            setIsUploadingImage(true);
            imageUrl = await ImageService.uploadImage(eventImageUri, eventTitle);
            setIsUploadingImage(false);
            if (!imageUrl) {
                setIsLoading(false);
                return;
            }
        }

        const eventData = {
            latitude: parseFloat(latitude as string),
            longitude: parseFloat(longitude as string),
            event_title: eventTitle,
            event_type: eventType,
            event_date: eventDate.toISOString(),
            description: eventDescription,
            location: eventLocation,
            city_country: cityCountry,
            ...(imageUrl && { eventImageUrl: imageUrl }),
        };

        const success = await FirebaseService.createEvent(eventData);
        if (success) {
            router.replace('/home');
        }
        
        setIsLoading(false);
    };

    // Date and Time picker handlers
    const openDatePicker = () => {
        setTempDate(eventDate);
        setShowDatePicker(true);
    };

    const openTimePicker = () => {
        setTempDate(eventDate);
        setShowTimePicker(true);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
                setEventDate(selectedDate);
            }
        } else if (selectedDate) {
            setTempDate(selectedDate);
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
            if (event.type === 'set' && selectedTime) {
                setEventDate(selectedTime);
            }
        } else if (selectedTime) {
            setTempDate(selectedTime);
        }
    };

    const confirmIOSDate = () => {
        setEventDate(tempDate);
        setShowDatePicker(false);
    };
    
    const confirmIOSTime = () => {
        setEventDate(tempDate);
        setShowTimePicker(false);
    };

    const cancelIOSDate = () => {
        setTempDate(eventDate);
        setShowDatePicker(false);
    };
    
    const cancelIOSTime = () => {
        setTempDate(eventDate);
        setShowTimePicker(false);
    };
    
    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };
    
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-forward" size={24} color={theme.colors.background} />
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
                    mapType="standard"
                >
                    <Marker
                        coordinate={{
                            latitude: parseFloat(latitude as string),
                            longitude: parseFloat(longitude as string),
                        }}
                    >
                        <View style={styles.customMarker}>
                            <Ionicons name="location" size={30} color={theme.colors.primary} />
                        </View>
                    </Marker>
                </MapView>
    
                <View style={styles.locationContainer}>
                    <View style={styles.locationInfo}>
                        <Ionicons name="location-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationText}>{eventLocation}</Text>
                            {cityCountry ? (
                                <Text style={styles.cityText}>{cityCountry}</Text>
                            ) : null}
                        </View>
                    </View>
                   <TouchableOpacity
                      style={styles.editLocationButton}
                      onPress={() => router.push({
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
                                <Ionicons name="camera-outline" size={30} color={theme.colors.primary} />
                                <Text style={styles.imagePlaceholderText}>הוסף תמונה לאירוע</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {isUploadingImage && (
                        <View style={styles.imageLoadingOverlay}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        </View>
                    )}
                </View>

                <TextInput
                    style={[
                        styles.input,
                        eventTitle.length >= 23 && styles.inputError
                    ]}
                    placeholder="כותרת האירוע"
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    maxLength={23}
                    placeholderTextColor={theme.colors.textSecondary}
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
                            <Text
                                style={[
                                    styles.typeText,
                                    eventType === type && styles.typeTextSelected
                                ]}
                            >
                                {typeLabels[type]}
                            </Text>
                            <Ionicons
                                name={getEventIcon(type)}
                                size={20}
                                color={eventType === type ? (theme.isDark ? theme.colors.text : '#FFFFFF') : theme.colors.primary}
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.dateAndTimeContainer}>
                    <TouchableOpacity
                        style={styles.dateTimeButton}
                        onPress={openDatePicker}
                    >
                        <View style={styles.dateButtonContent}>
                            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                            <Text style={styles.dateText}>
                                {eventDate.toLocaleDateString('he-IL')}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dateTimeButton, styles.timeButton]}
                        onPress={openTimePicker}
                    >
                        <View style={styles.dateButtonContent}>
                            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.dateText}>
                                {formatTime(eventDate)}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder="תיאור האירוע"
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    multiline
                    placeholderTextColor={theme.colors.textSecondary}
                />

                <TouchableOpacity
                    style={[
                        styles.createButton, 
                        isLoading && styles.createButtonDisabled
                    ]}
                    onPress={handleCreateEvent}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={theme.isDark ? theme.colors.text : '#FFFFFF'} />
                    ) : (
                        <Text style={styles.createButtonText}>צור אירוע</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Modal for Date Picker */}
            {showDatePicker && (
                <Modal visible={true} transparent animationType="slide">
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity 
                                    onPress={cancelIOSDate}
                                    style={styles.modalButton}
                                >
                                    <Text style={styles.modalButtonTextCancel}>ביטול</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>בחר תאריך</Text>
                                <TouchableOpacity 
                                    onPress={Platform.OS === 'ios' ? confirmIOSDate : () => {}}
                                    style={[styles.modalButton, Platform.OS === 'android' && { opacity: 0 }]}
                                >
                                    <Text style={styles.modalButtonTextConfirm}>אישור</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.datePickerContainer}>
                                <DateTimePicker
                                    value={Platform.OS === 'ios' ? tempDate : eventDate}
                                    mode="date"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    style={styles.datePicker}
                                    {...(Platform.OS === 'ios' ? { textColor: theme.colors.primary } : {})} 
                                    themeVariant={theme.isDark ? "dark" : "light"}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Modal for Time Picker */}
            {showTimePicker && (
                <Modal visible={true} transparent animationType="slide">
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity 
                                    onPress={cancelIOSTime}
                                    style={styles.modalButton}
                                >
                                    <Text style={styles.modalButtonTextCancel}>ביטול</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>בחר שעה</Text>
                                <TouchableOpacity 
                                    onPress={Platform.OS === 'ios' ? confirmIOSTime : () => {}}
                                    style={[styles.modalButton, Platform.OS === 'android' && { opacity: 0 }]}
                                >
                                    <Text style={styles.modalButtonTextConfirm}>אישור</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.datePickerContainer}>
                                <DateTimePicker
                                    value={Platform.OS === 'ios' ? tempDate : eventDate}
                                    mode="time"
                                    onChange={handleTimeChange}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    style={styles.datePicker}
                                    {...(Platform.OS === 'ios' ? { textColor: theme.colors.primary } : {})} 
                                    themeVariant={theme.isDark ? "dark" : "light"}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </KeyboardAvoidingView>
    );
}