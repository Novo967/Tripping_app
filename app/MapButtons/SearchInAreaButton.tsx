import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../ProfileServices/ThemeContext';

interface Props {
  isVisible: boolean;
  onPress: () => void;
}

export default function SearchInAreaButton({ isVisible, onPress }: Props) {
  const { theme } = useTheme();

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#3A8DFF' }]} // צבע כחול
        onPress={onPress}
      >
        <Ionicons name="search" size={18} color="#fff" />
        <Text style={[styles.text, { color: '#fff' }]}>חיפוש במיקום זה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '10%',
    left: '50%',
    transform: [{ translateX: -70 }],
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
});