// app/IndexServices/CreateEvent/types.ts
export type EventType =
    | 'trip'
    | 'party'
    | 'attraction'
    | 'food'
    | 'nightlife'
    | 'beach'
    | 'sport'
    | 'other';

export interface EventData {
    owner_uid: string;
    username: string;
    latitude: number;
    longitude: number;
    event_title: string;
    event_type: EventType;
    event_date: string;
    description: string;
    location: string;
    city_country: string;
    created_at: string;
    approved_users: string[];
    eventImageUrl?: string;
}

export interface LocationData {
    eventLocation: string;
    cityCountry: string;
}