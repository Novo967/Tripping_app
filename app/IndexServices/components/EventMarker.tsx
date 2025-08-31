// components/map/EventMarker.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { getEventColor, getEventIcon } from '../styles/markerUtils';

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
  const color = getEventColor(event.type || ''); // Still use the color from markerUtils if needed for other elements
  const icon = getEventIcon(event.type || '');
  const iconColor = '#3A8DFF'; // The desired color for the icon

  return (
    <Marker
      key={event.id}
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={() => onPress(event.id)}
    >
      <View style={styles.markerContainer}>
        <Ionicons name={icon as any} size={30} color={iconColor} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // We can remove fixed width/height if we want the icon to dictate size
    // For now, let's keep it flexible or adjust to icon size
    width: 30, // Adjust based on icon size for touchability
    height: 30, // Adjust based on icon size for touchability
  },
  // Removed markerBody and markerTip styles as they are no longer needed for the desired design
});

export default React.memo(EventMarker);