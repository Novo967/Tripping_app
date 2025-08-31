import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useLocationVisibility } from './HideMyLocation';

interface FilterButtonProps {
  displayDistance: number;
  onDistanceFilterPress: () => void;
  onEventFilterPress: () => void;
  onAddEventPress: () => void;
  onLocationVisibilityChange?: (isVisible: boolean) => void;
  isChoosingLocation: boolean;
  isFilterMenuVisible: boolean;
  onToggleFilterMenu: () => void;
}

export default function FilterButton({
  displayDistance,
  onDistanceFilterPress,
  onEventFilterPress,
  onAddEventPress,
  onLocationVisibilityChange = () => {},
  isChoosingLocation,
  isFilterMenuVisible,
  onToggleFilterMenu
}: FilterButtonProps) {
  const [filterAnimation] = useState(new Animated.Value(isFilterMenuVisible ? 1 : 0));
  
  // שימוש בהוק החדש לניהול הסתרת המיקום
  const locationVisibility = useLocationVisibility(onLocationVisibilityChange, true);

  useEffect(() => {
    Animated.spring(filterAnimation, {
      toValue: isFilterMenuVisible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isFilterMenuVisible]);

  const handleAddEventPress = () => {
    onAddEventPress();
    // No need to call onToggleFilterMenu here, as the parent will handle it
    // through the closeAllModals logic
  };

  const handleDistanceFilterPress = () => {
    onDistanceFilterPress();
    // No need to call onToggleFilterMenu here, as the parent will handle it
    // through the closeAllModals logic
  };

  const handleEventFilterPress = () => {
    onEventFilterPress();
    // No need to call onToggleFilterMenu here, as the parent will handle it
    // through the closeAllModals logic
  };

  const handleLocationVisibilityPress = () => {
    locationVisibility.toggleLocationVisibility();
  };

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
        onPress={onToggleFilterMenu}
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
            <Ionicons name="resize" size={18} color="#3A8DFF" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>סנן מרחק({displayDistance} קמ)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItemContainer}
            onPress={handleEventFilterPress}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={18} color="#3A8DFF" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>סנן אירועים</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItemContainer}
            onPress={handleLocationVisibilityPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={locationVisibility.getIconName() as any} 
              size={18} 
              color="#3A8DFF" 
              style={styles.menuIcon} 
            />
            <Text style={styles.menuItemText}>{locationVisibility.getButtonText()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItemContainer, styles.lastMenuItem]}
            onPress={handleAddEventPress}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color="#3A8DFF" style={styles.menuIcon} />
            <Text style={styles.menuItemText}>הוספת אירוע</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    position: 'absolute',
    top: 110,
    right: 15,
    zIndex: 10,
  },
  filterButton: {
    backgroundColor: '#3A8DFF',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3A8DFF',
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
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