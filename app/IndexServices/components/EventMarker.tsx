// components/map/EventMarker.tsx
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
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

// ייבוא התמונה ישירות מהנתיב המקומי
const TREKimage = require('../../../assets/images/TREKimage.png');

const EventMarker: React.FC<EventMarkerProps> = ({ event, onPress }) => {
  return (
    <Marker
      key={event.id}
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={() => {
        console.log('Event Marker Tapped:', event.id);
        onPress(event.id);
      }}
    >
      <View style={styles.markerContainer}>
        <Image source={TREKimage} style={styles.markerImage} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // גודל בסיסי לקונטיינר של האייקון
    width: 40,
    height: 40,
  },
  markerImage: {
    // גודל התמונה בתוך הקונטיינר
    width: '60%',
    height: '60%',
    // הופך את התמונה לעיגול
    borderRadius: 15, 
    // מוסיף גבול מסביב לתמונה
    borderWidth: 2,
    borderColor: '#3A8DFF',
  },
});

export default React.memo(EventMarker);