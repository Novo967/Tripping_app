import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useNotificationListeners } from '../../hooks/useNotificationListeners';
import { LoadingComponent } from '../../IndexServices/components/LoadingComponent';
import { MapMarkersComponent } from '../../IndexServices/components/MapMarkersComponent';
import { SearchBarComponent } from '../../IndexServices/components/SearchBarComponent';
import EventDetailsModal from '../../IndexServices/EventDetailsModal';
import { useAutoRefresh } from '../../IndexServices/hooks/useAutoRefresh';
import { useBlockedUsers } from '../../IndexServices/hooks/useBlockedUsers';
import { useFirestoreService } from '../../IndexServices/hooks/useFirestoreService';
import { useLocationService } from '../../IndexServices/hooks/useLocationSevice';
import { useMapInteractions } from '../../IndexServices/hooks/useMapInteractions';
import { useModalState } from '../../IndexServices/hooks/useModalState';
import { useSearchState } from '../../IndexServices/hooks/useSearchState';
import FilterButton from '../../IndexServices/MapButtons/FilterButton';
import DistanceFilterButton from '../../IndexServices/MapButtons/FilterButtons/DistanceFilterButton';
import EventFilterButton from '../../IndexServices/MapButtons/FilterButtons/EventFilterButton';
import { useLocationVisibility } from '../../IndexServices/MapButtons/FilterButtons/HideMyLocation'; // ייבוא ה-hook החדש
import LocationSelector from '../../IndexServices/MapButtons/FilterButtons/LocationSelector';
import MyLocationButton from '../../IndexServices/MapButtons/MyLocationButton';
import SearchInAreaButton from '../../IndexServices/MapButtons/SearchInAreaButton';
import { homeScreenStyles } from '../../IndexServices/styles/homeScreenStyles';
import { darkMapStyle } from '../../IndexServices/styles/mapStyles';
import { useDistanceCalculation } from '../../IndexServices/utils/distanceUtils';
import { useTheme } from '../../ThemeContext';

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
    user,
    toggleUserLocationVisibility // ייבוא הפונקציה החדשה
  } = useFirestoreService();
  const blockedUsers = useBlockedUsers();
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
  
  const [isLocationVisible, setIsLocationVisible] = useState(true); // מצב חדש לנראות המיקום

  const { isOutOfRange } = useDistanceCalculation();

  useNotificationListeners(user);

  useLocationVisibility(user?.uid, setIsLocationVisible); // שימוש ב-hook החדש

  // Auto refresh functionality
  const refreshMapData = useCallback(async () => {
    try {
      // רענן רק את הנתונים החיוניים מבלי לשנות את מצב המפה
      await Promise.all([
        fetchCurrentUserUsername(), // רענן נתוני המשתמש הנוכחי
        // אם יש לך פונקציות refresh נוספות ב-useFirestoreService, הוסף אותן כאן
      ]);
      console.log('✅ Map data refreshed successfully');
    } catch (error) {
      console.warn('⚠️ Failed to refresh map data:', error);
    }
  }, [fetchCurrentUserUsername]);

  // קביעת מתי לא לעשות refresh (כשיש מודלים פתוחים)
  const hasOpenModals = !!(
    selectedEvent || 
    distanceModalVisible || 
    eventFilterModalVisible || 
    isChoosingLocation || 
    isSearchbarVisible
  );

  const { forceRefresh, resetTimer, refreshCount } = useAutoRefresh({
    onRefresh: refreshMapData,
    intervalMinutes: 2.5,
    enabled: true,
    pauseOnModal: true,
    isModalOpen: hasOpenModals
  });

  // איפוס הטיימר כשהמשתמש מבצע פעולה אינטראקטיבית
  const resetRefreshTimer = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

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

  const visibleUsers = useMemo(() => {
    // Start with the basic filtering (location visibility and distance)
    const filteredByLocation = getVisibleUsers(users, currentSearchCenter, currentSearchDistance, user?.uid)
        .filter(u => u.isLocationVisible);

    // Now, filter out users based on blocking rules
    const finalVisibleUsers = filteredByLocation.filter(otherUser => {
        // Rule 1: Don't show users that the current user has blocked.
        const isBlockedByCurrentUser = blockedUsers.includes(otherUser.uid);
        
        // Rule 2: Don't show the current user to someone who has blocked them.
        const isBlockingCurrentUser = user?.uid ? (otherUser.blocked_users || []).includes(user.uid) : false;
        
        // Return true only if neither blocking rule is met.
        return !isBlockedByCurrentUser && !isBlockingCurrentUser;
    });
    
    return finalVisibleUsers;
  }, [getVisibleUsers, users, currentSearchCenter, currentSearchDistance, user, blockedUsers]);
  
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
      resetRefreshTimer(); // איפוס טיימר כשמעדכנים מיקום
    },
    [updateLocation, animateToRegion, resetCustomSearch, resetRefreshTimer]
  );

  const handleMarkerPress = useCallback(
    async (pinId: string) => {
      const eventData = await fetchSingleEvent(pinId);
      if (eventData) {
        setSelectedEvent(eventData);
        console.log('Fetched single event data:', eventData);
        resetRefreshTimer(); // איפוס טיימר כשפותחים אירוע
      }
    },
    [fetchSingleEvent, setSelectedEvent, resetRefreshTimer]
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
    resetRefreshTimer(); // איפוס טיימר בכל לחיצה על המפה
  }, [handleMapPress, isChoosingLocation, closeAllModals, handleCloseSearchbar, resetCustomSearch, setIsChoosingLocation, resetRefreshTimer]);

  const handleSelectSearchResultInternal = useCallback(
    (latitude: number, longitude: number, zoomLevel: number) => {
      handleSelectSearchResult(latitude, longitude, zoomLevel, setRegion, mapRef);
      resetRefreshTimer(); // איפוס טיימר כשבוחרים תוצאת חיפוש
    },
    [handleSelectSearchResult, setRegion, resetRefreshTimer]
  );

  const handleSearchInAreaInternal = useCallback(() => {
    handleSearchInArea(mapCenter, setSearchCenter, setIsCustomSearch);
    forceRefresh(); // רענון מיידי כשמחפשים באזור חדש
  }, [handleSearchInArea, mapCenter, setSearchCenter, setIsCustomSearch, forceRefresh]);
  
  const handleToggleLocationVisibility = useCallback(async () => {
    if (!user?.uid) {
      console.warn("User not authenticated, cannot toggle location visibility.");
      return;
    }
    const newVisibility = !isLocationVisible;
    console.log(`Toggling location visibility to ${newVisibility} in Firestore.`);
    await toggleUserLocationVisibility(user.uid, newVisibility);
    resetRefreshTimer(); // איפוס טיימר כשמשנים נראות מיקום
  }, [user?.uid, isLocationVisible, toggleUserLocationVisibility, resetRefreshTimer]);

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
        showsUserLocation={isLocationVisible} // שימוש במצב החדש
        showsMyLocationButton={false}
        followsUserLocation={false}
        userLocationPriority="high"
        userLocationUpdateInterval={5000}
        customMapStyle={theme.isDark ? darkMapStyle : []}
        onPress={handleMapPressInternal}
        onUserLocationChange={(event) => {
          const coordinate = event.nativeEvent.coordinate;
          if (coordinate && isLocationVisible) { // רק אם המיקום גלוי
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
        onLocationVisibilityPress={handleToggleLocationVisibility} // חיבור הפונקציה
        isLocationVisible={isLocationVisible} // העברת המצב ל-FilterButton
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