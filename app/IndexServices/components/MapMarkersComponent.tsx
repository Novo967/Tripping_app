import { router } from 'expo-router';
import React from 'react';
import type { SelectedEventType, SelectedUserType } from '../hooks/useFirestoreService';
import EventMarker from './EventMarker';
import UserMarker from './UserMarker';

interface MapMarkersComponentProps {
  visibleEvents: SelectedEventType[];
  visibleUsers: SelectedUserType[];
  currentUserUid?: string;
  onEventMarkerPress: (id: string) => void;
}

export const MapMarkersComponent: React.FC<MapMarkersComponentProps> = ({
  visibleEvents,
  visibleUsers,
  currentUserUid,
  onEventMarkerPress
}) => {
  return (
    <>
      {visibleEvents.map((event) => (
        <EventMarker
          key={event.id}
          event={event}
          onPress={onEventMarkerPress}
        />
      ))}
      {visibleUsers.map((userMarker) => (
        <UserMarker
          key={userMarker.uid}
          user={userMarker}
          currentUserUid={currentUserUid}
          onPress={(u) => {
            router.push({ 
              pathname: '/ProfileServices/OtherUser/OtherUserProfile', 
              params: { uid: u.uid } 
            });
          }}
        />
      ))}
    </>
  );
};