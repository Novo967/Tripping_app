// app/components/LocationSelector.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface LocationSelectorProps {
  visible: boolean;
  onCancel: () => void;
}

export default function LocationSelector({ visible, onCancel }: LocationSelectorProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.locationIndicator}>
        <View style={styles.header}>
          <Text style={styles.locationIndicatorText}>לחץ על המפה לבחירת מיקום</Text>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#3A8DFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40, 
    left: 50,
    right: 50,
    zIndex: 15,
  },
  locationIndicator: {
    backgroundColor: '#3A8DFF',
    paddingVertical: 10, 
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#3A8DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '85%',
  },
  locationIndicatorText: {
    color: 'white',
    fontSize: 15, // קטן יותר
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  helpText: {
    color: '#FFEECC',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 4,
  },
});
