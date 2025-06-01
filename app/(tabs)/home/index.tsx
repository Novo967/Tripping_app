import React from 'react';
import { View } from 'react-native';
import MapView from 'react-native-maps';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} />
    </View>
  );
}