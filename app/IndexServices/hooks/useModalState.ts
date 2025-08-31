import { useCallback, useState } from 'react';
import type { SelectedEventType } from './useFirestoreService';

export const useModalState = () => {
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(null);
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [eventFilterModalVisible, setEventFilterModalVisible] = useState(false);
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);

  const closeAllModals = useCallback(() => {
    setDistanceModalVisible(false);
    setEventFilterModalVisible(false);
    setIsFilterMenuVisible(false);
    setSelectedEvent(null);
  }, []);

  const handleDistanceFilterPress = useCallback(() => {
    setDistanceModalVisible(true);
    setEventFilterModalVisible(false);
    setSelectedEvent(null);
  }, []);

  const handleEventFilterPress = useCallback(() => {
    setEventFilterModalVisible(true);
    setDistanceModalVisible(false);
    setSelectedEvent(null);
  }, []);

  const handleToggleFilterMenu = useCallback(() => {
    setIsFilterMenuVisible(prev => !prev);
  }, []);

  const handleAddEventPress = useCallback(() => {
    closeAllModals();
    setTimeout(() => {
      setIsChoosingLocation(true);
    }, 500);
  }, [closeAllModals]);

  const handleCancelLocationSelection = useCallback(() => {
    setIsChoosingLocation(false);
  }, []);

  return {
    selectedEvent,
    setSelectedEvent,
    isChoosingLocation,
    setIsChoosingLocation,
    distanceModalVisible,
    setDistanceModalVisible,
    eventFilterModalVisible,
    setEventFilterModalVisible,
    isFilterMenuVisible,
    setIsFilterMenuVisible,
    closeAllModals,
    handleDistanceFilterPress,
    handleEventFilterPress,
    handleToggleFilterMenu,
    handleAddEventPress,
    handleCancelLocationSelection
  };
};  