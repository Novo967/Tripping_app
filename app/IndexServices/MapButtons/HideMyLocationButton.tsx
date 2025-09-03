import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface HideLocationButtonProps {
  locationVisibility: {
    isLocationVisible: boolean;
    isLoading: boolean;
    toggleLocationVisibility: () => void;
  };
  theme: {
    colors: {
      primary: string;
      background: string;
      text: string;
      surface: string;
    };
    isDark: boolean;
  };
}

export default function HideLocationButton({ 
  locationVisibility, 
  theme 
}: HideLocationButtonProps) {
  const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 60,
        right: 10,
        zIndex: 1000,
    },
    button: {
        backgroundColor: '#3A8DFF',
        borderRadius: 25,
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        },
    loadingContainer: {
      opacity: 0.6,
    },
  });

  const getIconColor = () => {
    return 'white'; // צבע האייקון הוא לבן
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          locationVisibility.isLoading && styles.loadingContainer
        ]}
        onPress={locationVisibility.toggleLocationVisibility}
        disabled={locationVisibility.isLoading}
        activeOpacity={0.7}
      >
        <Ionicons
          name={locationVisibility.isLocationVisible ? 'eye' : 'eye-off'}
          size={24}
          color={getIconColor()}
        />
      </TouchableOpacity>
    </View>
  );
}