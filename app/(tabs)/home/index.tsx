import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

interface User {
  uid: string;
  latitude: number;
  longitude: number;
  profile_image: string;
}

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // קביעת אזור התחלתי של המפה
    setRegion({
      latitude: 32.0853,  // דוגמה לת"א
      longitude: 34.7818,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    });

    // שליפת כל המשתמשים עם מיקום ותמונה
    const fetchUsers = async () => {
      try {
        const response = await fetch('https://triping-6.onrender.com/get-all-users');
        const data = await response.json();
        setUsers(data.users); // מצפה למבנה { users: [...] }
      } catch (err) {
        console.error('❌ Error fetching users:', err);
        setError('Failed to load users');
      }
    };

    fetchUsers();
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

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} region={region}>
        {users.map((user) => (
          <Marker
            key={user.uid}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
          >
            <View style={styles.markerContainer}>
              <Image
                source={{ uri: user.profile_image }}
                style={styles.profileMarker}
              />
            </View>
          </Marker>
        ))}
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
