import React from 'react';
import {
  Modal,
  ScrollView,
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
  { id: 'trip', label: 'טיול', icon: 'mountain' },
  { id: 'party', label: 'מסיבה', icon: 'musical-notes' },
  { id: 'attraction', label: 'אטרקציה', icon: 'camera' },
  { id: 'other', label: 'אחר', icon: 'ellipsis-horizontal' },
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
    setEventLocation,
    handleLocationChange,
    locationSuggestions,
    showLocationSuggestions,
    selectLocation,
    eventDescription,
    setEventDescription,
    handleAddEvent,
    resetEventForm,
    setShowCalendarPicker
  } = props;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback>
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 25, maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>🗓️ יצירת אירוע חדש</Text>

              {/* Input fields */}
              <Text>שם האירוע *</Text>
              <TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="שם אירוע" style={{ borderBottomWidth: 1, marginBottom: 10 }} />

              <Text>סוג האירוע *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {eventTypes.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={{ padding: 10, borderWidth: 1, margin: 5, backgroundColor: eventType === type.id ? '#FF6F00' : 'white' }}
                    onPress={() => setEventType(type.id)}
                  >
                    <Text style={{ color: eventType === type.id ? 'white' : '#FF6F00' }}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text>תאריך האירוע *</Text>
              <TouchableOpacity onPress={() => setShowCalendarPicker(true)}>
                <Text>{eventDate.toLocaleDateString('he-IL')}</Text>
              </TouchableOpacity>

              <Text>מיקום האירוע *</Text>
              <TextInput
                value={eventLocation}
                onChangeText={handleLocationChange}
                placeholder="מיקום"
                style={{ borderBottomWidth: 1, marginBottom: 10 }}
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <View>
                  {locationSuggestions.map(suggestion => (
                    <TouchableOpacity key={suggestion.place_id} onPress={() => selectLocation(suggestion)}>
                      <Text>{suggestion.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text>תיאור</Text>
              <TextInput
                value={eventDescription}
                onChangeText={setEventDescription}
                placeholder="תיאור..."
                multiline
                style={{ borderWidth: 1, height: 80, textAlignVertical: 'top', marginBottom: 20 }}
              />

              <TouchableOpacity onPress={handleAddEvent} style={{ backgroundColor: '#FF6F00', padding: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', textAlign: 'center' }}>שמור אירוע</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  resetEventForm();
                  setVisible(false);
                }}
                style={{ marginTop: 10 }}
              >
                <Text style={{ textAlign: 'center', color: 'gray' }}>ביטול</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
