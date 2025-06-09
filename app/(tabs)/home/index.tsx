import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  const fetchProfileImage = async () => {
    try {
      const response = await fetch('https://triping-6.onrender.com/get-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: '6zyJsPbuA2NAPifjvausFxtPwcw1' }),
      });

      const data = await response.json();
      console.log('📷 profileImage URL:', data.profile_image);
      setProfileImage(data.profile_image);
    } catch (error) {
      console.error('❌ Error fetching profile image:', error);
    }
  };

  fetchProfileImage();
}, []);


  if (error) {
    return (
      <View style={styles.centered}>
        <Text>❌ Error: {error}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="blue" />
        <Text>📡 Loading map...</Text>
      </View>
    );
  }
  console.log('📷 profileImage URL:', profileImage);
  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} region={region}>
        {profileImage ? (
          <Marker coordinate={region}>
            <View style={styles.markerContainer}>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileMarker}
              />
            </View>
          </Marker>
        ) : null}
      </MapView>

    </View>
  );
}

const styles = StyleSheet.create({
  profileMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});


