import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

interface EventMarkerProps {
  event: {
    id: string;
    latitude: number;
    longitude: number;
    type?: string;
  };
  onPress: (eventId: string) => void;
}

const EventMarker: React.FC<EventMarkerProps> = ({ event, onPress }) => {
  const getEventIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      'trip': 'car',
      'hiking': 'walk', 
      'camping': 'bonfire',
      'beach': 'water',
      'party': 'happy',
      'sport': 'fitness',
    };
    return iconMap[type] || 'location';
  };

  const getEventColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'trip': '#FF6B6B',
      'hiking': '#4ECDC4', 
      'camping': '#FFB75E',
      'beach': '#667eea',
      'party': '#f093fb',
      'sport': '#43e97b',
    };
    return colorMap[type] || '#FF6F00';
  };

  return (
    <Marker
      key={event.id}
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={() => onPress(event.id)}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.markerContainer}>
        {/* רקע עם צל */}
        <View style={[styles.markerShadow, { backgroundColor: getEventColor(event.type || '') + '40' }]} />
        
        {/* גוף הנעץ */}
        <View style={[styles.markerBody, { backgroundColor: getEventColor(event.type || '') }]}>
          <Ionicons 
            name={getEventIcon(event.type || '') as any} 
            size={16} 
            color="white" 
          />
        </View>
        
        {/* קצה הנעץ */}
        <View style={[styles.markerTip, { borderTopColor: getEventColor(event.type || '') }]} />
        
        {/* אפקט דופק */}
        <View style={[styles.pulse, { backgroundColor: getEventColor(event.type || '') + '30' }]} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 50,
  },
  markerShadow: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    top: 2,
    left: 2,
  },
  markerBody: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  pulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.6,
    top: -8,
  },
});

export default React.memo(EventMarker);