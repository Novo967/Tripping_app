import React from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

interface Props {
  selectedEventTypes: string[];
  setSelectedEventTypes: (types: string[]) => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

// רשימת סוגי האירועים הזמינים - ניתן להתאים לפי הצרכים
const EVENT_TYPES = [
  { id: 'trip', name: 'טיול', emoji: '🥾' },
  { id: 'camping', name: 'קמפינג', emoji: '⛺' },
  { id: 'beach', name: 'ים וחוף', emoji: '🏖️' },
  { id: 'party', name: 'מסיבה', emoji: '🎉' },
  { id: 'food', name: 'אוכל ושתייה', emoji: '🍕' },
  { id: 'sport', name: 'ספורט', emoji: '⚽' },
  { id: 'culture', name: 'תרבות ומוזיקה', emoji: '🎭' },
  { id: 'nature', name: 'טבע', emoji: '🌲' },
  { id: 'nightlife', name: 'חיי לילה', emoji: '🌙' },
];

export default function EventFilterButton({ 
  selectedEventTypes, 
  setSelectedEventTypes, 
  visible, 
  setVisible 
}: Props) {
  
  const toggleEventType = (eventTypeId: string) => {
    if (selectedEventTypes.includes(eventTypeId)) {
      // אם הסוג כבר נבחר, נסיר אותו
      setSelectedEventTypes(selectedEventTypes.filter(type => type !== eventTypeId));
    } else {
      // אם הסוג לא נבחר, נוסיף אותו
      setSelectedEventTypes([...selectedEventTypes, eventTypeId]);
    }
  };

  const selectAll = () => {
    setSelectedEventTypes(EVENT_TYPES.map(type => type.id));
  };

  const clearAll = () => {
    setSelectedEventTypes([]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* לחיצה על הרקע תסגור את המודל */}
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        {/* התוכן של המודל – מוצג באמצע המסך למטה */}  
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 25,
          alignItems: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '80%'
        }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20 }}>בחר סוגי אירועים</Text>
          
          {/* כפתורים לבחירת הכל/ניקוי הכל */}
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={selectAll}
              style={{ 
                backgroundColor: '#3A8DFF', 
                padding: 8, 
                borderRadius: 6, 
                flex: 1, 
                marginRight: 5 
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>בחר הכל</Text>
            </TouchableOpacity>
            
            <View style={{ width: 12 }} /> {/* Spacer between buttons */}
            
            <TouchableOpacity
              onPress={clearAll}
              style={{ 
                backgroundColor: '#d3d3d3', 
                padding: 8, 
                borderRadius: 6, 
                flex: 1,
                marginLeft: 5 
              }}
            >
              <Text style={{ color: '#333', fontWeight: '600', textAlign: 'center' }}>נקה הכל</Text>
            </TouchableOpacity>
          </View>

          {/* רשימת סוגי האירועים */}
          <ScrollView style={{ width: '100%', maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {EVENT_TYPES.map((eventType) => {
              const isSelected = selectedEventTypes.includes(eventType.id);
              return (
                <TouchableOpacity
                  key={eventType.id}
                  onPress={() => toggleEventType(eventType.id)}
                  style={{ 
                    flexDirection: 'row-reverse', // RTL
                    alignItems: 'center',
                    padding: 15,
                    marginVertical: 3,
                    backgroundColor: isSelected ? '#FFF3E0' : '#F5F5F5',
                    borderRadius: 10,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#3A8DFF' : '#E0E0E0'
                  }}
                >
                  {/* תיבת סימון */}
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: isSelected ? '#3A8DFF' : '#D0D0D0',
                    backgroundColor: isSelected ? '#3A8DFF' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12 // RTL: marginRight instead of marginLeft
                  }}>
                    {isSelected && (
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                  
                  {/* אמוג'י ושם הסוג */}
                  <Text style={{ fontSize: 20, marginLeft: 10 }}>{eventType.emoji}</Text>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: isSelected ? 'bold' : 'normal',
                    color: isSelected ? '#3A8DFF' : '#333',
                    flex: 1,
                    textAlign: 'right', // RTL
                  }}>
                    {eventType.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* מספר האירועים שנבחרו */}
          <Text style={{ 
            fontSize: 16, 
            color: '#666', 
            marginTop: 15, 
            marginBottom: 15 
          }}>
            נבחרו {selectedEventTypes.length} סוגי אירועים
          </Text>

          {/* כפתור שמירה */}
          <TouchableOpacity
            onPress={() => setVisible(false)}
            style={{ 
              backgroundColor: '#3A8DFF', 
              padding: 12, 
              borderRadius: 8, 
              minWidth: 100,
              width: '100%'
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>שמור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}