import React, { useEffect, useState } from 'react';
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

// Updated event types list to match CreateEventPage - in the specified order
const EVENT_TYPES = [
  { id: 'trip', name: 'טיול', emoji: '🚗' },
  { id: 'party', name: 'מסיבה', emoji: '🎉' },
  { id: 'attraction', name: 'אטרקציה', emoji: '⭐' },
  { id: 'food', name: 'אוכל', emoji: '🍕' },
  { id: 'nightlife', name: 'חיי לילה', emoji: '🍷' },
  { id: 'beach', name: 'ים/בריכה', emoji: '🏖️' },
  { id: 'sport', name: 'ספורט', emoji: '⚽' },
  { id: 'other', name: 'אחר', emoji: '📍' },
];

export default function EventFilterButton({ 
  selectedEventTypes, 
  setSelectedEventTypes, 
  visible, 
  setVisible 
}: Props) {
  
  // State זמני לאחסון הבחירות לפני השמירה
  const [tempSelectedTypes, setTempSelectedTypes] = useState<string[]>(selectedEventTypes);
  
  // כשהמודל נפתח, נטען את הערכים הנוכחיים ל-state הזמני
  useEffect(() => {
    if (visible) {
      setTempSelectedTypes([...selectedEventTypes]);
    }
  }, [visible, selectedEventTypes]);
  
  // Create a filtered list to ensure only valid event types are considered
  const eventTypeIds = EVENT_TYPES.map(type => type.id);
  const validTempSelectedTypes = tempSelectedTypes.filter(typeId => eventTypeIds.includes(typeId));
  
  const toggleEventType = (eventTypeId: string) => {
    if (tempSelectedTypes.includes(eventTypeId)) {
      // אם הסוג כבר נבחר, נסיר אותו מהמצב הזמני
      setTempSelectedTypes(tempSelectedTypes.filter(type => type !== eventTypeId));
    } else {
      // אם הסוג לא נבחר, נוסיף אותו למצב הזמני
      setTempSelectedTypes([...tempSelectedTypes, eventTypeId]);
    }
  };

  const selectAll = () => {
    setTempSelectedTypes(EVENT_TYPES.map(type => type.id));
  };

  const clearAll = () => {
    setTempSelectedTypes([]);
  };

  // פונקציה לשמירה - מעדכנת את הערכים האמיתיים וסוגרת את המודל
  const handleSave = () => {
    setSelectedEventTypes([...tempSelectedTypes]);
    setVisible(false);
  };

  // פונקציה לביטול - מחזירה את הערכים הזמניים למצב המקורי וסוגרת את המודל
  const handleCancel = () => {
    setTempSelectedTypes([...selectedEventTypes]);
    setVisible(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* לחיצה על הרקע תבטל את הבחירות */}
        <TouchableWithoutFeedback onPress={handleCancel}>
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
          <Text style={{ 
            fontSize: 22, 
            fontWeight: 'bold', 
            marginBottom: 20,
            textAlign: 'center'
          }}>
            בחר סוגי אירועים
          </Text>
          
          {/* כפתורים לבחירת הכל/ניקוי הכל - RTL layout */}
          <View style={{ 
            flexDirection: 'row-reverse', 
            justifyContent: 'space-between', 
            width: '100%', 
            marginBottom: 20 
          }}>
            <TouchableOpacity
              onPress={selectAll}
              style={{ 
                backgroundColor: '#3A8DFF', 
                padding: 12, 
                borderRadius: 8, 
                flex: 1, 
                marginLeft: 6 // Changed from marginRight for RTL
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontWeight: '600', 
                textAlign: 'center',
                fontSize: 16
              }}>
                בחר הכל
              </Text>
            </TouchableOpacity>
            
            <View style={{ width: 12 }} /> {/* Spacer between buttons */}
            
            <TouchableOpacity
              onPress={clearAll}
              style={{ 
                backgroundColor: '#f0f0f0', 
                padding: 12, 
                borderRadius: 8, 
                flex: 1,
                marginRight: 6, // Changed from marginLeft for RTL
                borderWidth: 1,
                borderColor: '#d0d0d0'
              }}
            >
              <Text style={{ 
                color: '#333', 
                fontWeight: '600', 
                textAlign: 'center',
                fontSize: 16
              }}>
                נקה הכל
              </Text>
            </TouchableOpacity>
          </View>

          {/* רשימת סוגי האירועים */}
          <ScrollView 
            style={{ width: '100%', maxHeight: 300 }} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            {EVENT_TYPES.map((eventType) => {
              const isSelected = tempSelectedTypes.includes(eventType.id);
              return (
                <TouchableOpacity
                  key={eventType.id}
                  onPress={() => toggleEventType(eventType.id)}
                  style={{ 
                    flexDirection: 'row-reverse', // RTL
                    alignItems: 'center',
                    padding: 16,
                    marginVertical: 4,
                    backgroundColor: isSelected ? '#F0F8FF' : '#FAFAFA',
                    borderRadius: 12,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#3A8DFF' : '#E5E5E5',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  {/* תיבת סימון */}
                  <View style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
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
                  
                  {/* שם הסוג */}
                  <Text style={{ 
                    fontSize: 17, 
                    fontWeight: isSelected ? 'bold' : '500',
                    color: isSelected ? '#3A8DFF' : '#333',
                    flex: 1,
                    textAlign: 'right', // RTL
                    marginRight: 8, // RTL spacing
                  }}>
                    {eventType.name}
                  </Text>
                  
                  {/* אמוג'י */}
                  <Text style={{ 
                    fontSize: 22, 
                    marginLeft: 8 // RTL: marginLeft for emoji
                  }}>
                    {eventType.emoji}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* מספר האירועים שנבחרו */}
          <View style={{
            backgroundColor: '#F8F9FA',
            borderRadius: 8,
            padding: 12,
            marginTop: 15,
            marginBottom: 15,
            width: '100%'
          }}>
            <Text style={{ 
              fontSize: 16, 
              color: '#666', 
              textAlign: 'center',
              fontWeight: '500'
            }}>
              נבחרו {validTempSelectedTypes.length} מתוך {EVENT_TYPES.length} סוגי אירועים
            </Text>
          </View>

          {/* כפתורי ביטול ושמירה */}
          <View style={{ 
            flexDirection: 'row-reverse', 
            justifyContent: 'space-between', 
            width: '100%' 
          }}>
            {/* כפתור שמירה */}
            <TouchableOpacity
              onPress={handleSave}
              style={{ 
                backgroundColor: '#3A8DFF', 
                padding: 16, 
                borderRadius: 12, 
                flex: 1,
                marginLeft: 6, // RTL: marginLeft for save button
                shadowColor: '#3A8DFF',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: 18
              }}>
                שמור
              </Text>
            </TouchableOpacity>

            <View style={{ width: 12 }} /> {/* Spacer between buttons */}

            {/* כפתור ביטול */}
            <TouchableOpacity
              onPress={handleCancel}
              style={{ 
                backgroundColor: '#f0f0f0', 
                padding: 16, 
                borderRadius: 12, 
                flex: 1,
                marginRight: 6, // RTL: marginRight for cancel button
                borderWidth: 1,
                borderColor: '#d0d0d0'
              }}
            >
              <Text style={{ 
                color: '#333', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: 18
              }}>
                ביטול
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}