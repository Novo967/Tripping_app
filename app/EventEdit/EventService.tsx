// app/IndexServices/EventsContext.tsx
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../firebaseConfig';

// Types
export interface Event {
    id: string;
    event_title: string;
    event_type: string;
    event_date: string;
    description?: string;
    location?: string;
    city_country?: string;
    latitude: number;
    longitude: number;
    owner_uid: string;
    username: string;
    eventImageUrl?: string;
    approved_users?: string[];
    created_at: string;
    updated_at?: string;
}

interface EventsContextType {
    events: Event[];
    userEvents: Event[];
    loading: boolean;
    user: User | null;
    refreshEvents: () => void;
    updateEvent: (eventId: string, updates: Partial<Event>) => Promise<boolean>;
    deleteEvent: (eventId: string) => Promise<boolean>;
    getEventById: (eventId: string) => Event | undefined;
    isEventOwner: (eventId: string) => boolean;
    isUserApprovedForEvent: (eventId: string) => boolean;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

interface EventsProviderProps {
    children: ReactNode;
}

export const EventsProvider: React.FC<EventsProviderProps> = ({ children }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [userEvents, setUserEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                subscribeToEvents();
            } else {
                setEvents([]);
                setUserEvents([]);
                setLoading(false);
            }
        });

        return unsubscribeAuth;
    }, []);

    // Subscribe to events in real-time
    const subscribeToEvents = useCallback(() => {
        if (!user) return;

        setLoading(true);
        
        // Listen to all events
        const eventsQuery = query(collection(db, 'pins'));
        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData: Event[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                eventsData.push({
                    id: doc.id,
                    event_title: data.event_title,
                    event_type: data.event_type,
                    event_date: data.event_date,
                    description: data.description || '',
                    location: data.location || '',
                    city_country: data.city_country || '',
                    latitude: data.latitude,
                    longitude: data.longitude,
                    owner_uid: data.owner_uid,
                    username: data.username,
                    eventImageUrl: data.eventImageUrl,
                    approved_users: data.approved_users || [],
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                });
            });
            
            setEvents(eventsData);
            
            // Filter user's own events
            const userOwnEvents = eventsData.filter(event => event.owner_uid === user.uid);
            setUserEvents(userOwnEvents);
            
            setLoading(false);
        }, (error) => {
            console.error('Error listening to events:', error);
            setLoading(false);
        });

        return unsubscribeEvents;
    }, [user]);

    const refreshEvents = useCallback(() => {
        if (user) {
            subscribeToEvents();
        }
    }, [user, subscribeToEvents]);

    const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>): Promise<boolean> => {
        try {
            const docRef = doc(db, 'pins', eventId);
            
            // Add updated timestamp
            const updateData = {
                ...updates,
                updated_at: new Date().toISOString(),
            };
            
            await updateDoc(docRef, updateData);
            
            // Update local state immediately for better UX
            setEvents(prevEvents => 
                prevEvents.map(event => 
                    event.id === eventId ? { ...event, ...updateData } : event
                )
            );
            
            setUserEvents(prevUserEvents => 
                prevUserEvents.map(event => 
                    event.id === eventId ? { ...event, ...updateData } : event
                )
            );
            
            return true;
        } catch (error) {
            console.error('Error updating event:', error);
            return false;
        }
    }, []);

    const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
        try {
            // Implementation would depend on your delete strategy
            // For now, just remove from local state
            setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
            setUserEvents(prevUserEvents => prevUserEvents.filter(event => event.id !== eventId));
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            return false;
        }
    }, []);

    const getEventById = useCallback((eventId: string): Event | undefined => {
        return events.find(event => event.id === eventId);
    }, [events]);

    const isEventOwner = useCallback((eventId: string): boolean => {
        if (!user) return false;
        const event = getEventById(eventId);
        return event?.owner_uid === user.uid;
    }, [user, getEventById]);

    const isUserApprovedForEvent = useCallback((eventId: string): boolean => {
        if (!user) return false;
        const event = getEventById(eventId);
        return event?.approved_users?.includes(user.uid) || false;
    }, [user, getEventById]);

    const contextValue: EventsContextType = {
        events,
        userEvents,
        loading,
        user,
        refreshEvents,
        updateEvent,
        deleteEvent,
        getEventById,
        isEventOwner,
        isUserApprovedForEvent,
    };

    return (
        <EventsContext.Provider value={contextValue}>
            {children}
        </EventsContext.Provider>
    );
};

export const useEvents = (): EventsContextType => {
    const context = useContext(EventsContext);
    if (context === undefined) {
        throw new Error('useEvents must be used within an EventsProvider');
    }
    return context;
};