// app/IndexServices/EventsContext.tsx
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
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

    // Get current user
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return unsubscribeAuth;
    }, []);

    // Fetch and subscribe to events from Firestore
    useEffect(() => {
        const q = query(collection(db, 'pins'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedEvents: Event[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<Event, 'id'>;
                fetchedEvents.push({ ...data, id: doc.id });
            });
            setEvents(fetchedEvents);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            setUserEvents(events.filter(event => event.owner_uid === user.uid));
        } else {
            setUserEvents([]);
        }
    }, [user, events]);

    const refreshEvents = useCallback(() => {
        setLoading(true);
        // The onSnapshot listener above handles the actual refresh
    }, []);

    const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>): Promise<boolean> => {
        try {
            const eventRef = doc(db, 'pins', eventId);
            await updateDoc(eventRef, updates);
            return true;
        } catch (error) {
            console.error('Error updating event:', error);
            return false;
        }
    }, []);

    const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
        try {
            await deleteDoc(doc(db, 'pins', eventId));
            setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
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