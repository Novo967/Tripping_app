import { calculateDistance } from '../MapUtils';

export const useDistanceCalculation = () => {
  const isOutOfRange = (
    currentLocation: { latitude: number; longitude: number } | null,
    mapCenter: { latitude: number; longitude: number } | null,
    displayDistance: number
  ): boolean => {
    if (!currentLocation || !mapCenter) return false;
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      mapCenter.latitude,
      mapCenter.longitude
    );
    return distance > displayDistance;
  };

  return {
    isOutOfRange
  };
};