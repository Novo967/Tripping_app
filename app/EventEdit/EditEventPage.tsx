import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import {
    DateTimePickerModal,
    TypeSelector,
} from './EventEditComponents';
import { useEventEdit } from './EventEditHooks';

const EditEventPage = () => {
    const { eventId } = useLocalSearchParams();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const {
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
    } = useEventEdit(eventId as string);

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' }]}>
                <ActivityIndicator size="large" color={theme.isDark ? '#A0C4FF' : '#3A8DFF'} />
                <Text style={[styles.loadingText, { color: theme.isDark ? '#E0E0E0' : '#333' }]}>
                    טוען פרטי אירוע...
                </Text>
            </View>
        );
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar
                barStyle={theme.isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.isDark ? '#2C3946' : '#3A8DFF'}
            />

            <SafeAreaView style={[styles.header, { backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF', paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>עריכת אירוע</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving}
                        style={[
                            styles.saveHeaderButton,
                            (!hasChanges || isSaving) && styles.saveHeaderButtonDisabled
                        ]}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={[
                                styles.saveHeaderButtonText,
                                (!hasChanges || isSaving) && styles.saveHeaderButtonTextDisabled
                            ]}>
                                שמור
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {eventImageUrl && (
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: eventImageUrl }}
                            style={styles.eventImage}
                            resizeMode="cover"
                        />
                    </View>
                )}

                <View style={[styles.inputGroup, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}>
                    <Text style={[styles.label, { color: theme.isDark ? '#BDC3C7' : '#2C3E50' }]}>כותרת האירוע</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: theme.isDark ? '#E0E0E0' : '#2C3E50',
                                borderColor: theme.isDark ? '#3E506B' : '#BDC3C7',
                                backgroundColor: theme.isDark ? '#1A283B' : '#FAFAFA'
                            },
                            title.length >= 23 && styles.inputError
                        ]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="כותרת האירוע"
                        placeholderTextColor={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                        maxLength={23}
                    />
                    <Text style={[styles.charCounter, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>
                        {title.length}/23
                    </Text>
                </View>

                <TypeSelector selectedType={eventType} onSelect={setEventType} />

                <View style={styles.dateTimeContainer}>
                    <TouchableOpacity
                        style={[styles.dateTimeButton, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}
                        onPress={openDatePicker}
                    >
                        <Ionicons name="calendar" size={20} color="#3A8DFF" />
                        <Text style={[styles.dateTimeText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>
                            {eventDate.toLocaleDateString('he-IL')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dateTimeButton, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}
                        onPress={openTimePicker}
                    >
                        <Ionicons name="time-outline" size={20} color="#3A8DFF" />
                        <Text style={[styles.dateTimeText, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>
                            {formatTime(eventDate)}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}>
                    <Text style={[styles.label, { color: theme.isDark ? '#BDC3C7' : '#2C3E50' }]}>מיקום</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: theme.isDark ? '#E0E0E0' : '#2C3E50',
                                borderColor: theme.isDark ? '#3E506B' : '#BDC3C7',
                                backgroundColor: theme.isDark ? '#1A283B' : '#FAFAFA'
                            }
                        ]}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="מיקום האירוע"
                        placeholderTextColor={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                    />
                </View>

                <View style={[styles.inputGroup, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}>
                    <Text style={[styles.label, { color: theme.isDark ? '#BDC3C7' : '#2C3E50' }]}>תיאור</Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.descriptionInput,
                            {
                                color: theme.isDark ? '#E0E0E0' : '#2C3E50',
                                borderColor: theme.isDark ? '#3E506B' : '#BDC3C7',
                                backgroundColor: theme.isDark ? '#1A283B' : '#FAFAFA'
                            }
                        ]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="תיאור האירוע"
                        placeholderTextColor={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        { backgroundColor: isSaving ? '#6B90D6' : '#3A8DFF' },
                        (!hasChanges || isSaving) && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {hasChanges ? 'שמור שינויים' : 'אין שינויים לשמירה'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {showDatePicker && (
                <DateTimePickerModal
                    mode="date"
                    onConfirm={confirmIOSDate}
                    onCancel={cancelIOSDate}
                    onDateChange={handleDateChange}
                    initialDate={eventDate}
                />
            )}

            {showTimePicker && (
                <DateTimePickerModal
                    mode="time"
                    onConfirm={confirmIOSTime}
                    onCancel={cancelIOSTime}
                    onDateChange={handleTimeChange}
                    initialDate={eventDate}
                />
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
    },
    header: {
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
    },
    saveHeaderButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    saveHeaderButtonDisabled: {
        opacity: 0.5,
    },
    saveHeaderButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    saveHeaderButtonTextDisabled: {
        opacity: 0.7,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    imageContainer: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    eventImage: {
        width: '100%',
        height: 200,
    },
    inputGroup: {
        marginBottom: 20,
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'right',
    },
    input: {
        fontSize: 16,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        textAlign: 'right',
    },
    inputError: {
        borderColor: '#FF6B6B',
    },
    charCounter: {
        fontSize: 12,
        textAlign: 'left',
        marginTop: 5,
    },
    descriptionInput: {
        minHeight: 80,
        maxHeight: 120,
    },
    dateTimeContainer: {
        flexDirection: 'row-reverse',
        gap: 10,
        marginBottom: 20,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    dateTimeText: {
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default EditEventPage;