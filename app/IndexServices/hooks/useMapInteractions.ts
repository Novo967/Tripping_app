import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';
import type { Region } from 'react-native-maps';

export const useMapInteractions = () => {
  const [region, setRegion] = useState<Region | null>(null);
  const [mapCenter, setMapCenter] = useState<Region | null>(null);

  const handleMapPress = useCallback((
    event: any,
    isChoosingLocation: boolean,
    closeAllModals: () => void,
    handleCloseSearchbar: () => void,
    resetCustomSearch: () => void
  ) => {
    if (isChoosingLocation) {
      const { coordinate } = event.nativeEvent;
      router.push({
        pathname: '/IndexServices/CreateEventPage',
        params: { 
          latitude: coordinate.latitude,
          longitude: coordinate.longitude
        },
      });
    } else {
      handleCloseSearchbar();
      closeAllModals();
      resetCustomSearch();
      Keyboard.dismiss();
    }
  }, []);

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setMapCenter(newRegion);
  }, []);

  const animateToRegion = useCallback((
    mapRef: any,
    location: { latitude: number; longitude: number },
    resetCustomSearch?: () => void
  ) => {
    const newRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };

    setRegion(newRegion);
    if (resetCustomSearch) {
      resetCustomSearch();
    }

    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  }, []);

  const handleSearchInArea = useCallback((
    mapCenter: Region | null,
    setSearchCenter: (center: { latitude: number; longitude: number }) => void,
    setIsCustomSearch: (value: boolean) => void
  ) => {
    if (mapCenter) {
      setSearchCenter(mapCenter);
      setIsCustomSearch(true);
    }
  }, []);

  return {
    region,
    setRegion,
    mapCenter,
    setMapCenter,
    handleMapPress,
    handleRegionChangeComplete,
    animateToRegion,
    handleSearchInArea
  };
};