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
            <Ionicons name="close" size={18} color="#FF6F00" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    zIndex: 15,
  },
  locationIndicator: {
    backgroundColor: '#FF6F00',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  locationIndicatorText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: 32,
    height: 32,
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
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.9,
  },
});