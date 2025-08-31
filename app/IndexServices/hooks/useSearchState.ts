import { useCallback, useMemo, useState } from 'react';
import type { SearchResult } from '../MapButtons/Searchbar';
import { calculateDistance } from '../MapUtils';
import type { SelectedEventType, SelectedUserType } from './useFirestoreService';

export const useSearchState = () => {
  const [searchCenter, setSearchCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
  const [isSearchbarVisible, setIsSearchbarVisible] = useState(false);
  const [searchbarResults, setSearchbarResults] = useState<SearchResult[]>([]);
  const [isCustomSearch, setIsCustomSearch] = useState(false);
  const [displayDistance, setDisplayDistance] = useState(250);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([
    'hiking', 'trip', 'camping', 'beach', 'party', 'food', 'sport',
    'culture', 'nature', 'nightlife',
  ]);

  const getCurrentSearchCenter = useCallback((currentLocation: { latitude: number; longitude: number } | null, mapCenter: any) => {
    if (isCustomSearch) {
      return mapCenter;
    }
    return currentLocation;
  }, [isCustomSearch]);

  const getCurrentSearchDistance = useCallback(() => {
    if (isCustomSearch) {
      return 100;
    }
    return displayDistance;
  }, [isCustomSearch, displayDistance]);

  const getVisibleEvents = useMemo(() => {
    return (
      events: SelectedEventType[], 
      currentSearchCenter: { latitude: number; longitude: number } | null,
      currentSearchDistance: number,
      selectedEventTypes: string[]
    ) => {
      if (!currentSearchCenter) return events;
      return events.filter((ev) => {
        const withinDistance =
          calculateDistance(
            currentSearchCenter.latitude,
            currentSearchCenter.longitude,
            ev.latitude,
            ev.longitude
          ) <= currentSearchDistance;
        const eventTypeMatches = selectedEventTypes.includes(ev.event_type);
        return withinDistance && eventTypeMatches;
      });
    };
  }, []);

  const getVisibleUsers = useMemo(() => {
    return (
      users: SelectedUserType[], 
      currentSearchCenter: { latitude: number; longitude: number } | null,
      currentSearchDistance: number,
      currentUserUid?: string
    ) => {
      if (!currentSearchCenter) return users;
      return users.filter(
        (u) =>
          u.uid !== currentUserUid &&
          calculateDistance(
            currentSearchCenter.latitude,
            currentSearchCenter.longitude,
            u.latitude,
            u.longitude
          ) <= currentSearchDistance
      );
    };
  }, []);

  const handleSelectSearchResult = useCallback(
    (latitude: number, longitude: number, onLocationChange: (region: any) => void, mapRef: any) => {
      setSearchCenter({ latitude, longitude });
      setIsCustomSearch(true);
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
      onLocationChange(newRegion);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
      setIsSearchbarVisible(false);
      setSearchbarResults([]);
    },
    []
  );

  const handleCloseSearchbar = useCallback(() => {
    setIsSearchbarVisible(false);
    setSearchbarResults([]);
  }, []);

  const resetCustomSearch = useCallback(() => {
    setIsCustomSearch(false);
    setSearchCenter(null);
  }, []);

  return {
    searchCenter,
    setSearchCenter,
    isSearchbarVisible,
    setIsSearchbarVisible,
    searchbarResults,
    setSearchbarResults,
    isCustomSearch,
    setIsCustomSearch,
    displayDistance,
    setDisplayDistance,
    selectedEventTypes,
    setSelectedEventTypes,
    getCurrentSearchCenter,
    getCurrentSearchDistance,
    getVisibleEvents,
    getVisibleUsers,
    handleSelectSearchResult,
    handleCloseSearchbar,
    resetCustomSearch
  };
};