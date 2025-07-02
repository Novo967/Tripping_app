// components/map/EventMarker.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { getEventColor, getEventIcon } from './markerUtils';

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
  const color = getEventColor(event.type || '');
  const icon = getEventIcon(event.type || '');

  return (
    <Marker
      key={event.id}
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={() => onPress(event.id)}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.markerContainer}>
      <View style={[styles.markerBody, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={16} color="white" />
      </View>
      <View style={[styles.markerTip, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 40, height: 50 },
  markerBody: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  markerTip: {
    width: 0, height: 0,
    borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },
});

export default React.memo(EventMarker);
