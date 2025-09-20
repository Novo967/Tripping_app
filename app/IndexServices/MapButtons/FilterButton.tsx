import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { useTheme } from '../../ThemeContext';

interface FilterButtonProps {
  displayDistance: number;
  onDistanceFilterPress: () => void;
  onEventFilterPress: () => void;
  onAddEventPress: () => void;
  onLocationVisibilityPress: () => void;
  isLocationVisible: boolean;
  isChoosingLocation: boolean;
  isFilterMenuVisible: boolean;
  onToggleFilterMenu: () => void;
}

export default function FilterButton({
  displayDistance,
  onDistanceFilterPress,
  onEventFilterPress,
  onAddEventPress,
  onLocationVisibilityPress,
  isLocationVisible,
  isChoosingLocation,
  isFilterMenuVisible,
  onToggleFilterMenu,
}: FilterButtonProps) {
  const [filterAnimation] = useState(new Animated.Value(isFilterMenuVisible ? 1 : 0));
  const scheme = useColorScheme(); // light | dark
  const { theme } = useTheme();


  useEffect(() => {
    Animated.spring(filterAnimation, {
      toValue: isFilterMenuVisible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isFilterMenuVisible]);

  if (isChoosingLocation) {
    return null;
  }

  const filterMenuStyle = {
    transform: [{
      translateY: filterAnimation.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] })
    }],
    opacity: filterAnimation,
  };


  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: '#3A8DFF', shadowColor: theme.colors.shadow }]}
        onPress={onToggleFilterMenu}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFilterMenuVisible ? "close" : "options"}
          size={24}
          color="white"
        />
      </TouchableOpacity>

      {isFilterMenuVisible && (
        <Animated.View style={[styles.filterMenu, filterMenuStyle, { backgroundColor: theme.colors.background, shadowColor: theme.colors.shadow }]}>
          <TouchableOpacity style={[styles.menuItemContainer, { borderBottomColor: theme.colors.border }]} onPress={onDistanceFilterPress}>
            <Ionicons name="resize" size={18} color="#fff" style={[styles.menuIcon, { backgroundColor: '#3A8DFF' }]} />
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>סנן מרחק ({displayDistance} קמ)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItemContainer, { borderBottomColor: theme.colors.border }]} onPress={onEventFilterPress}>
            <Ionicons name="filter" size={18} color="#fff" style={[styles.menuIcon, { backgroundColor: '#3A8DFF'  }]} />
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>סנן אירועים</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItemContainer, { borderBottomColor: theme.colors.border }]} onPress={onLocationVisibilityPress}>
            <Ionicons
              name={isLocationVisible ? "eye-outline" : "eye-off-outline"}
              size={18}
              color="#FFF"
              style={[styles.menuIcon, { backgroundColor: '#3A8DFF'  }]}
            />
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
              {isLocationVisible ? "הסתר מיקום" : "הצג מיקום"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItemContainer, styles.lastMenuItem]} onPress={onAddEventPress}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" style={[styles.menuIcon, { backgroundColor: '#3A8DFF'  }]} />
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>הוספת אירוע</Text>
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
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  filterMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 0,
    elevation: 10,
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
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 17,
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  menuIcon: {
    marginLeft: 12,
    borderRadius: 20,
    padding: 6,
    overflow: 'hidden',
  },
});
