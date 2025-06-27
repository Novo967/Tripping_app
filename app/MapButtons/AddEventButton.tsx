import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  eventTitle: string;
  setEventTitle: (val: string) => void;
  eventType: string;
  setEventType: (val: string) => void;
  eventDate: Date;
  setEventDate: (val: Date) => void;
  eventLocation: string;
  setEventLocation: (val: string) => void;
  handleLocationChange: (text: string) => void;
  locationSuggestions: any[];
  showLocationSuggestions: boolean;
  selectLocation: (val: any) => void;
  eventDescription: string;
  setEventDescription: (val: string) => void;
  handleAddEvent: () => void;
  resetEventForm: () => void;
  showCalendarPicker: boolean;
  setShowCalendarPicker: (val: boolean) => void;
}

const eventTypes = [
  { id: 'id', label: 'טיול', icon: 'ellipsis-horizontal' },
  { id: 'party', label: 'מסיבה', icon: 'musical-notes' },
  { id: 'attraction', label: 'אטרקציה', icon: 'camera' },
  { id: 'other', label: 'אחר', icon: 'mountain' },
];

export default function AddEventButton(props: Props) {
  const {
    visible,
    setVisible,
    eventTitle,
    setEventTitle,
    eventType,
    setEventType,
    eventDate,
    eventLocation,
    handleLocationChange,
    locationSuggestions,
    showLocationSuggestions,
    selectLocation,
    eventDescription,
    setEventDescription,
    handleAddEvent,
    resetEventForm,
    setShowCalendarPicker,
  } = props;

  const router = useRouter();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>🗓️ יצירת אירוע חדש</Text>

              <Text style={styles.label}>שם האירוע </Text>
              <TextInput
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="שם אירוע"
                style={styles.input}
              />

              <Text style={styles.label}>סוג האירוע</Text>
              <View style={styles.typeContainer}>
                {eventTypes.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      eventType === type.id && styles.typeButtonSelected,
                    ]}
                    onPress={() => setEventType(type.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons
                        name={type.icon}
                        size={16}
                        color={eventType === type.id ? 'white' : '#FF6F00'}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[
                        styles.typeButtonText,
                        eventType === type.id && styles.typeButtonTextSelected,
                      ]}>
                        {type.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>תאריך האירוע </Text>
              <TouchableOpacity onPress={() => setShowCalendarPicker(true)}>
                <Text style={styles.dateText}>
                  {eventDate.toLocaleDateString('he-IL')}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>מיקום האירוע </Text>
              <View style={styles.locationRow}>
                <TextInput
                  value={eventLocation}
                  onChangeText={handleLocationChange}
                  placeholder="מיקום"
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity onPress={() => router.push('/home/index')} style={styles.mapButton}>
                  <Ionicons name="map" size={20} color="#FF6F00" />
                </TouchableOpacity>
              </View>

              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {locationSuggestions.map(suggestion => (
                    <TouchableOpacity
                      key={suggestion.place_id}
                      onPress={() => selectLocation(suggestion)}
                    >
                      <Text style={styles.suggestionText}>
                        {suggestion.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>תיאור</Text>
              <TextInput
                value={eventDescription}
                onChangeText={setEventDescription}
                placeholder="תיאור..."
                multiline
                style={styles.textArea}
              />

              <TouchableOpacity onPress={handleAddEvent} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>שמור אירוע</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  resetEventForm();
                  setVisible(false);
                }}
              >
                <Text style={styles.cancelText}>ביטול</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
    color: '#444',
    textAlign: 'right',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    textAlign: 'right',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapButton: {
    padding: 8,
    marginLeft: 5,
  },
  typeContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    gap: 9,
  },
  typeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF6F00',
    borderRadius: 20,
    margin: 4,
    maxWidth: '85%',
    flexShrink: 1,
  },
  typeButtonSelected: {
    alignSelf: 'center',
    backgroundColor: '#FF6F00',
  },
  typeButtonText: {
    color: '#FF6F00',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: 'white',
  },
  dateText: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  suggestions: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 6,
    marginBottom: 10,
  },
  suggestionText: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    textAlign: 'right',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    height: 80,
    padding: 10,
    textAlignVertical: 'top',
    borderRadius: 8,
    marginBottom: 5,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#FF6F00',
    padding: 14,
    borderRadius: 10,
    marginTop: 5,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelText: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 10,
    fontSize: 16,
  },
});
