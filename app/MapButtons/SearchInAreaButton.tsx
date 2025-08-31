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
        style={[styles.button, { backgroundColor: theme.isDark ? '#4A4A4A' : '#fff' }]}
        onPress={onPress}
      >
        <Ionicons name="search" size={16} color={theme.colors.primary} />
        <Text style={[styles.text, { color: theme.colors.primary }]}>חיפוש במיקום זה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100, // מיקום מעל המפה, מתחת לחיפוש הראשי
    left: '60%',
    transform: [{ translateX: -125 }], // ממקם במרכז
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '300',
    marginLeft: 10,
  },
});