import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { db } from '../../firebaseConfig';

export const useEventEdit = (eventId: string) => {
    // State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [eventType, setEventType] = useState('');
    const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());
    const [originalData, setOriginalData] = useState<any>(null);

    // טעינת נתוני האירוע
    useEffect(() => {
        if (!eventId) {
            Alert.alert('שגיאה', 'לא נמצא מזהה אירוע');
            router.back();
            return;
        }

        const fetchEventDetails = async () => {
            try {
                const docRef = doc(db, 'pins', eventId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setOriginalData(data);
                    setTitle(data.event_title || '');
                    setDescription(data.description || '');
                    setLocation(data.location || '');
                    setEventType(data.event_type || '');
                    setEventImageUrl(data.eventImageUrl || null);
                    const parsedDate = new Date(data.event_date);
                    if (!isNaN(parsedDate.getTime())) {
                        setEventDate(parsedDate);
                        setTempDate(parsedDate);
                    }
                } else {
                    Alert.alert('שגיאה', 'האירוע לא נמצא');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching event:', error);
                Alert.alert('שגיאה', 'אירעה שגיאה בטעינת פרטי האירוע');
                router.back();
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetails();
    }, [eventId]);

    // מעקב אחרי שינויים
    useEffect(() => {
        if (originalData) {
            const originalDate = new Date(originalData.event_date);
            const hasDataChanges =
                title !== originalData.event_title ||
                description !== (originalData.description || '') ||
                location !== (originalData.location || '') ||
                eventType !== originalData.event_type ||
                eventDate.getTime() !== originalDate.getTime();
            setHasChanges(hasDataChanges);
        }
    }, [title, description, location, eventType, eventDate, originalData]);

    const validateInputs = (): boolean => {
        if (!title.trim()) {
            Alert.alert('שגיאה', 'יש להזין כותרת לאירוע');
            return false;
        }
        if (title.length > 23) {
            Alert.alert('שגיאה', 'כותרת האירוע ארוכה מדי (מקסימום 23 תווים)');
            return false;
        }
        if (!eventType) {
            Alert.alert('שגיאה', 'יש לבחור סוג אירוע');
            return false;
        }
        if (eventDate < new Date()) {
            Alert.alert('שגיאה', 'לא ניתן לקבוע אירוע בתאריך עבר');
            return false;
        }
        return true;
    };

    const handleSave = useCallback(async () => {
        if (isSaving || !hasChanges) return;
        if (!validateInputs()) return;

        setIsSaving(true);
        try {
            const docRef = doc(db, 'pins', eventId);
            const updateData = {
                event_title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                event_date: eventDate.toISOString(),
                event_type: eventType,
                updated_at: new Date().toISOString(),
            };
            await updateDoc(docRef, updateData);
            Alert.alert('הצלחה!', 'האירוע עודכן בהצלחה', [{ text: 'אישור', onPress: () => router.back() }]);
        } catch (error) {
            console.error('Error updating event:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בעדכון האירוע');
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, hasChanges, title, description, location, eventDate, eventType, eventId]);

    const handleBackPress = useCallback(() => {
        if (hasChanges) {
            Alert.alert(
                'יציאה ללא שמירה',
                'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?',
                [{ text: 'ביטול', style: 'cancel' }, { text: 'צא בלי לשמור', onPress: () => router.back() }]
            );
        } else {
            router.back();
        }
    }, [hasChanges]);

    // Date picker handlers
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
    const cancelIOSDate = () => {
        setTempDate(eventDate);
        setShowDatePicker(false);
    };

    const confirmIOSTime = () => {
        setEventDate(tempDate);
        setShowTimePicker(false);
    };
    const cancelIOSTime = () => {
        setTempDate(eventDate);
        setShowTimePicker(false);
    };

    return {
        loading,
        isSaving,
        hasChanges,
        title,
        setTitle,
        description,
        setDescription,
        location,
        setLocation,
        eventDate,
        setEventDate,
        eventType,
        setEventType,
        eventImageUrl,
        showDatePicker,
        showTimePicker,
        openDatePicker,
        openTimePicker,
        handleDateChange,
        handleTimeChange,
        confirmIOSDate,
        cancelIOSDate,
        confirmIOSTime,
        cancelIOSTime,
        handleSave,
        handleBackPress,
        tempDate,
    };
};