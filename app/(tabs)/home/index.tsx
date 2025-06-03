import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  console.log('UID:', uid);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      if (status !== 'granted') {
        Alert.alert('אין הרשאה למיקום');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      console.log('Current location:', loc);
      setLocation(loc);

      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      console.log('Setting region:', newRegion);
      setRegion(newRegion);
    })();
  }, []);

  useEffect(() => {
  console.log('UID in useEffect:', uid);
  if (!uid) return;

  const fetchProfileImage = async () => {
    try {
      console.log('Starting fetch request...');
      const res = await fetch('https://triping-6.onrender.com/get-user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      console.log('Fetch response status:', res.status);

      const data = await res.json();
      console.log('profile_image URL:', data.profile_image);
      
      let imageUrl = data.profile_image;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `data:image/jpeg;base64,${imageUrl}`;
      }
      setProfileImage(imageUrl || null);
    } catch (err) {
      console.error('Error fetching profile image:', err);
    }
  };

  fetchProfileImage();
}, [uid]);


  return (
    <View style={{ flex: 1 }}>
      {region && location ? (
        <MapView style={{ flex: 1 }} region={region} showsUserLocation={true}>
          {profileImage && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
            >
              <Image
                source={{ uri: profileImage }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: 'white',
                }}
              />
            </Marker>
          )}
        </MapView>
      ) : (
        <View />
      )}
    </View>
  );
}
