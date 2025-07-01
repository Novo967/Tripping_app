// components/map/markerUtils.ts
export const getEventIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    trip: 'car',
    hiking: 'walk',
    camping: 'bonfire',
    beach: 'water',
    party: 'happy',
    sport: 'fitness',
  };
  return iconMap[type] || 'location';
};

export const getEventColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    trip: '#FF6B6B',
    hiking: '#4ECDC4',
    camping: '#FFB75E',
    beach: '#667eea',
    party: '#f093fb',
    sport: '#43e97b',
  };
  return colorMap[type] || '#FF6F00'; // כתום כברירת מחדל
};
