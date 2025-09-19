// app/IndexServices/CreateEvent/constants.ts
import { Ionicons } from '@expo/vector-icons';
import { EventType } from './types';

export const typeLabels: Record<EventType, string> = {
    trip: 'טיול',
    party: 'מסיבה',
    attraction: 'אטרקציה',
    food: 'אוכל',
    nightlife: 'חיי לילה',
    beach: 'ים/בריכה',
    sport: 'ספורט',
    other: 'אחר',
};

export const getEventIcon = (type: EventType): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<EventType, keyof typeof Ionicons.glyphMap> = {
        trip: 'trail-sign',
        party: 'headset',
        attraction: 'star',
        food: 'restaurant',
        nightlife: 'wine',
        beach: 'sunny',
        sport: 'barbell',
        other: 'ellipsis-horizontal-circle',
    };
    return iconMap[type];
};

export const eventTypesArray: EventType[] = [
    'trip',
    'party',
    'attraction',
    'food',
    'nightlife',
    'beach',
    'sport',
    'other',
];

// Default date: current time + 5 hours
export const getDefaultEventDate = (): Date => {
    const now = new Date();
    now.setHours(now.getHours() + 5);
    return now;
};