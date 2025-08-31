import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../../app/ProfileServices/ThemeContext';
import { useNotificationListeners } from '../../hooks/useNotificationListeners';
import { LoadingComponent } from '../../IndexServices/components/LoadingComponent';
import { MapMarkersComponent } from '../../IndexServices/components/MapMarkersComponent';
import { SearchBarComponent } from '../../IndexServices/components/SearchBarComponent';
import EventDetailsModal from '../../IndexServices/EventDetailsModal';
import { useFirestoreService } from '../../IndexServices/hooks/useFirestoreService';
import { useLocationService } from '../../IndexServices/hooks/useLocationSevice';
import { useMapInteractions } from '../../IndexServices/hooks/useMapInteractions';
import { useModalState } from '../../IndexServices/hooks/useModalState';
import { useSearchState } from '../../IndexServices/hooks/useSearchState';
import FilterButton from '../../IndexServices/MapButtons/FilterButton';
import DistanceFilterButton from '../../IndexServices/MapButtons/FilterButtons/DistanceFilterButton';
import EventFilterButton from '../../IndexServices/MapButtons/FilterButtons/EventFilterButton';
import LocationSelector from '../../IndexServices/MapButtons/FilterButtons/LocationSelector';
import MyLocationButton from '../../IndexServices/MapButtons/MyLocationButton';
import SearchInAreaButton from '../../IndexServices/MapButtons/SearchInAreaButton';
import { homeScreenStyles } from '../../IndexServices/styles/homeScreenStyles';
import { darkMapStyle } from '../../IndexServices/styles/mapStyles';
import { useDistanceCalculation } from '../../IndexServices/utils/distanceUtils';

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const { isChoosingLocation: shouldChooseLocationParam } = useLocalSearchParams();
  const { theme } = useTheme();

  // Custom hooks
  const { 
    users, 
    events, 
    currentUserUsername, 
    fetchCurrentUserUsername, 
    fetchSingleEvent,
    user 
  } = useFirestoreService();
  
  const { 
    currentLocation, 
    fetchLocation, 
    updateLocation 
  } = useLocationService();
  
  const {
    region,
    setRegion,
    mapCenter,
    handleMapPress,
    handleRegionChangeComplete,
    animateToRegion,
    handleSearchInArea
  } = useMapInteractions();

  const {
    selectedEvent,
    setSelectedEvent,
    isChoosingLocation,
    setIsChoosingLocation,
    distanceModalVisible,
    setDistanceModalVisible,
    eventFilterModalVisible,
    setEventFilterModalVisible,
    isFilterMenuVisible,
    closeAllModals,
    handleDistanceFilterPress,
    handleEventFilterPress,
    handleToggleFilterMenu,
    handleAddEventPress,
    handleCancelLocationSelection
  } = useModalState();

  const {
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
  } = useSearchState();

  const { isOutOfRange } = useDistanceCalculation();

  useNotificationListeners(user);

  // Computed values
  const currentSearchCenter = useMemo(() => 
    getCurrentSearchCenter(currentLocation, mapCenter), 
    [getCurrentSearchCenter, currentLocation, mapCenter]
  );

  const currentSearchDistance = useMemo(() => 
    getCurrentSearchDistance(), 
    [getCurrentSearchDistance]
  );

  const visibleEvents = useMemo(() => 
    getVisibleEvents(events, currentSearchCenter, currentSearchDistance, selectedEventTypes),
    [getVisibleEvents, events, currentSearchCenter, currentSearchDistance, selectedEventTypes]
  );

  const visibleUsers = useMemo(() => 
    getVisibleUsers(users, currentSearchCenter, currentSearchDistance, user?.uid),
    [getVisibleUsers, users, currentSearchCenter, currentSearchDistance, user?.uid]
  );

  const isOutOfRangeResult = useMemo(() => 
    isOutOfRange(currentLocation, mapCenter, displayDistance),
    [isOutOfRange, currentLocation, mapCenter, displayDistance]
  );

  // Effect hooks
  useEffect(() => {
    if (shouldChooseLocationParam === 'true') {
      setIsChoosingLocation(true);
    }
  }, [shouldChooseLocationParam, setIsChoosingLocation]);

  useEffect(() => {
    const loadInitialData = async () => {
      const location = await fetchLocation();
      await fetchCurrentUserUsername();
      
      // Set initial region if location was fetched successfully
      if (location) {
        setRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
      
      setInitialDataLoaded(true);
    };

    loadInitialData();
  }, [fetchLocation, fetchCurrentUserUsername, setRegion]);

  // Event handlers
  const handleLocationUpdate = useCallback(
    (location: { latitude: number; longitude: number }) => {
      console.log('Updating location:', location);
      updateLocation(location);
      animateToRegion(mapRef, location, resetCustomSearch);
    },
    [updateLocation, animateToRegion, resetCustomSearch]
  );

  const handleMarkerPress = useCallback(
    async (pinId: string) => {
      const eventData = await fetchSingleEvent(pinId);
      if (eventData) {
        setSelectedEvent(eventData);
        console.log('Fetched single event data:', eventData);
        closeAllModals();
      }
    },
    [fetchSingleEvent, setSelectedEvent, closeAllModals]
  );

  const handleMapPressInternal = useCallback((event: any) => {
    handleMapPress(
      event,
      isChoosingLocation,
      closeAllModals,
      handleCloseSearchbar,
      resetCustomSearch
    );
    if (isChoosingLocation) {
      setIsChoosingLocation(false);
    }
  }, [handleMapPress, isChoosingLocation, closeAllModals, handleCloseSearchbar, resetCustomSearch, setIsChoosingLocation]);

  const handleSelectSearchResultInternal = useCallback(
    (latitude: number, longitude: number) => {
      handleSelectSearchResult(latitude, longitude, setRegion, mapRef);
    },
    [handleSelectSearchResult, setRegion]
  );

  const handleSearchInAreaInternal = useCallback(() => {
    handleSearchInArea(mapCenter, setSearchCenter, setIsCustomSearch);
  }, [handleSearchInArea, mapCenter, setSearchCenter, setIsCustomSearch]);

  // Loading state
  if (!initialDataLoaded || !region) {
    return <LoadingComponent />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={homeScreenStyles.searchContainer}>
        <SearchBarComponent
          isSearchbarVisible={isSearchbarVisible}
          searchbarResults={searchbarResults}
          setSearchbarResults={setSearchbarResults}
          onSelectResult={handleSelectSearchResultInternal}
          onClose={handleCloseSearchbar}
          onOpen={() => setIsSearchbarVisible(true)}
        />
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={false}
        userLocationPriority="high"
        userLocationUpdateInterval={5000}
        customMapStyle={theme.isDark ? darkMapStyle : []}
        onPress={handleMapPressInternal}
        onUserLocationChange={(event) => {
          const coordinate = event.nativeEvent.coordinate;
          if (coordinate) {
            const { latitude, longitude } = coordinate;
            updateLocation({ latitude, longitude });
          }
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        <MapMarkersComponent
          visibleEvents={visibleEvents}
          visibleUsers={visibleUsers}
          currentUserUid={user?.uid}
          onEventMarkerPress={handleMarkerPress}
        />
      </MapView>
      
      <SearchInAreaButton 
        isVisible={isOutOfRangeResult && !isCustomSearch} 
        onPress={handleSearchInAreaInternal} 
      />

      <FilterButton
        displayDistance={displayDistance}
        onDistanceFilterPress={handleDistanceFilterPress}
        onEventFilterPress={handleEventFilterPress}
        onAddEventPress={handleAddEventPress}
        isChoosingLocation={isChoosingLocation}
        isFilterMenuVisible={isFilterMenuVisible}
        onToggleFilterMenu={handleToggleFilterMenu}
      />

      <MyLocationButton onLocationUpdate={handleLocationUpdate} />

      <LocationSelector
        visible={isChoosingLocation}
        onCancel={handleCancelLocationSelection}
      />

      <EventDetailsModal
        visible={!!selectedEvent}
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        user={user}
        currentUserUsername={currentUserUsername}
        userLocation={currentLocation}
      />

      <DistanceFilterButton
        displayDistance={displayDistance}
        setDisplayDistance={setDisplayDistance}
        visible={distanceModalVisible}
        setVisible={setDistanceModalVisible}
      />

      <EventFilterButton
        selectedEventTypes={selectedEventTypes}
        setSelectedEventTypes={setSelectedEventTypes}
        visible={eventFilterModalVisible}
        setVisible={setEventFilterModalVisible}
      />
    </View>
  );
}