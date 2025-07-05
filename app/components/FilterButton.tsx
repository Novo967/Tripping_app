// app/components/FilterButton.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface FilterButtonProps {
  displayDistance: number;
  onDistanceFilterPress: () => void;
  onAddEventPress: () => void;
  isChoosingLocation: boolean;
}

export default function FilterButton({
  displayDistance,
  onDistanceFilterPress,
  onAddEventPress,
  isChoosingLocation
}: FilterButtonProps) {
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterAnimation] = useState(new Animated.Value(0));

  const toggleFilterMenu = () => {
    const toValue = isFilterMenuVisible ? 0 : 1;
    setIsFilterMenuVisible(!isFilterMenuVisible);
    Animated.spring(filterAnimation, { toValue, useNativeDriver: true }).start();
  };

  const handleAddEventPress = () => {
    setIsFilterMenuVisible(false);
    onAddEventPress();
    Animated.spring(filterAnimation, { toValue: 0, useNativeDriver: true }).start();
  };

  const handleDistanceFilterPress = () => {
    onDistanceFilterPress();
    toggleFilterMenu();
  };

  // הסתר את הכפתור כאשר נמצאים במצב בחירת מיקום
  if (isChoosingLocation) {
    return null;
  }

  const filterMenuStyle = {
    transform: [{
      translateY: filterAnimation.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] })
    }],
    opacity: filterAnimation
  };

  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={styles.filterButton} 
        onPress={toggleFilterMenu}
        activeOpacity={0.7}
      >
        <Ionicons name={isFilterMenuVisible ? "close" : "options"} size={24} color="white" />
      </TouchableOpacity>
      
      {isFilterMenuVisible && (
        <Animated.View style={[styles.filterMenu, filterMenuStyle]}>
          <TouchableOpacity 
            style={styles.menuItemContainer} 
            onPress={handleDistanceFilterPress}
            activeOpacity={0.7}
          >
            <Ionicons name="resize" size={18} color="#FF6F00" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>מרחק תצוגה ({displayDistance} קמ)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItemContainer} 
            onPress={handleAddEventPress}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FF6F00" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>בחר במפה להוספת אירוע</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    position: 'absolute',
    top: 50,
    right: 15,
    zIndex: 10,
  },
  filterButton: {
    backgroundColor: '#FF6F00',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  filterMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    minWidth: 220,
  },
  menuItemContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  menuItemText: {
    fontSize: 17,
    color: '#222',
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  menuIcon: {
    marginLeft: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    padding: 6,
    overflow: 'hidden',
  },
});