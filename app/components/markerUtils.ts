// components/map/markerUtils.ts
export const getEventIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    trip: 'pin',
    hiking: 'pin',
    camping: 'pin',
    beach: 'pin',
    party: 'pin',
    sport: 'pin',
  };
  return iconMap[type] || 'location';
};

export const getEventColor = (type: string): string => {
  return '#FF6F00';
};
