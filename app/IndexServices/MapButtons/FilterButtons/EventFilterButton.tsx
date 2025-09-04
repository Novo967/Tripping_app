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
const [tempSelectedTypes, setTempSelectedTypes] = useState<string[]>(
    selectedEventTypes.length > 0 ? selectedEventTypes : EVENT_TYPES.map(type => type.id)
  );  const [isPressable, setIsPressable] = useState(false); // **מצב חדש**

  // כשהמודל נפתח, נטען את הערכים הנוכחיים ל-state הזמני ונתזמן את הפעלת ה-onPress
  useEffect(() => {
    if (visible) {if (selectedEventTypes.length === 0) {
        setTempSelectedTypes(EVENT_TYPES.map(type => type.id));
      } else {
        setTempSelectedTypes([...selectedEventTypes]);
      }
      // **הוספנו setTimeout כדי למנוע את הסגירה המיידית**
      const timer = setTimeout(() => {
        setIsPressable(true);
      }, 200); // 200 מילישניות הן מספיקות למנוע את הבעיה

      return () => clearTimeout(timer); // ניקוי הטיימר כדי למנוע דליפות זיכרון
    } else {
      setIsPressable(false); // כשהמודל נסגר, נאפס את המצב
    }
  }, [visible, selectedEventTypes]);

  const eventTypeIds = EVENT_TYPES.map(type => type.id);
  const validTempSelectedTypes = tempSelectedTypes.filter(typeId => eventTypeIds.includes(typeId));
  
  const toggleEventType = (eventTypeId: string) => {
    if (tempSelectedTypes.includes(eventTypeId)) {
      setTempSelectedTypes(tempSelectedTypes.filter(type => type !== eventTypeId));
    } else {
      setTempSelectedTypes([...tempSelectedTypes, eventTypeId]);
    }
  };

  const selectAll = () => {
    setTempSelectedTypes(EVENT_TYPES.map(type => type.id));
  };

  const clearAll = () => {
    setTempSelectedTypes([]);
  };

  const handleSave = () => {
    setSelectedEventTypes([...tempSelectedTypes]);
    setVisible(false);
  };

  const handleCancel = () => {
    if (isPressable) { // **וודא שה-onPress מופעל רק לאחר שה-Modal יציב**
      setTempSelectedTypes([...selectedEventTypes]);
      setVisible(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* **עדכנו את ה-onPress של TouchableWithoutFeedback** */}
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

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
                marginLeft: 6
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
            
            <View style={{ width: 12 }} />
            
            <TouchableOpacity
              onPress={clearAll}
              style={{ 
                backgroundColor: '#f0f0f0', 
                padding: 12, 
                borderRadius: 8, 
                flex: 1,
                marginRight: 6,
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
                    flexDirection: 'row-reverse',
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
                  <View style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isSelected ? '#3A8DFF' : '#D0D0D0',
                    backgroundColor: isSelected ? '#3A8DFF' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    {isSelected && (
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                  
                  <Text style={{ 
                    fontSize: 17, 
                    fontWeight: isSelected ? 'bold' : '500',
                    color: isSelected ? '#3A8DFF' : '#333',
                    flex: 1,
                    textAlign: 'right',
                    marginRight: 8,
                  }}>
                    {eventType.name}
                  </Text>
                  
                  <Text style={{ 
                    fontSize: 22, 
                    marginLeft: 8
                  }}>
                    {eventType.emoji}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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

          <View style={{ 
            flexDirection: 'row-reverse', 
            justifyContent: 'space-between', 
            width: '100%' 
          }}>
            <TouchableOpacity
              onPress={handleSave}
              style={{ 
                backgroundColor: '#3A8DFF', 
                padding: 16, 
                borderRadius: 12, 
                flex: 1,
                marginLeft: 6,
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

            <View style={{ width: 12 }} />

            <TouchableOpacity
              onPress={handleCancel}
              style={{ 
                backgroundColor: '#f0f0f0', 
                padding: 16, 
                borderRadius: 12, 
                flex: 1,
                marginRight: 6,
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