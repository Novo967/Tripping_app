import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

interface EventMarkerProps {
  event: {
    id: string;
    latitude: number;
    longitude: number;
  };
  onPress: (eventId: string) => void;
}

const EventMarker: React.FC<EventMarkerProps> = ({ event, onPress }) => {
  return (
    <Marker
      key={event.id}
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={() => onPress(event.id)}
    >
      {/* ודא שה-View הזה תמיד עם מידות קבועות */}
      <View>
        <Ionicons name="location" size={30} color="#FF6F00" />
      </View>
    </Marker>
  );
};
export default React.memo(EventMarker);