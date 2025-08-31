// components/map/markerUtils.ts
export const getEventIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    trip: 'map', // A more general map icon
    hiking: 'walk', // Icon for hiking
    camping: 'tent', // Icon for camping
    beach: 'beach', // Icon for beach
    party: 'happy', // A cheerful icon for parties
    sport: 'football', // A generic sport icon
    // Add more types and corresponding icons as needed
  };
  return iconMap[type] || 'location'; // Default to a location pin if type is not found
};

export const getEventColor = (type: string): string => {
  // This function can now be used for other purposes if you need a dynamic color
  // For the icon itself, we are using a fixed color in EventMarker.tsx
  return '#3A8DFF'; // This color is currently used as the fixed icon color in EventMarker.tsx
};