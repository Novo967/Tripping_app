import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { db } from '../../firebaseConfig';

interface Member {
  uid: string;
  username: string;
  profileImageUrl: string | null;
}

interface EventDetails {
  description: string;
  location: string;
  time: string;
  date: string;
  organizer: string;
}

const GroupDetailsModal = ({
  eventTitle,
  onClose,
}: {
  eventTitle: string;
  onClose: () => void;
}) => {
  const [groupName, setGroupName] = useState('');
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  useEffect(() => {
    if (!eventTitle) {
      setLoading(false);
      return;
    }

    const groupDocRef = doc(db, 'group_chats', eventTitle);
    const eventDocRef = doc(db, 'events', eventTitle);

    const unsubscribeGroup = onSnapshot(
      groupDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroupName(data.name || eventTitle);
          setGroupImageUrl(data.groupImage || null);
          const memberIds = data.members || [];
          const fetchedMembers: Member[] = [];

          for (const uid of memberIds) {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              fetchedMembers.push({
                uid,
                username: userData.username || 'משתמש',
                profileImageUrl: userData.profileImage || null,
              });
            } else {
              fetchedMembers.push({
                uid,
                username: 'משתמש לא ידוע',
                profileImageUrl: null,
              });
            }
          }
          setMembers(fetchedMembers);
        } else {
          setGroupName(eventTitle);
          setGroupImageUrl(null);
          setMembers([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching group details:', error);
        setLoading(false);
      }
    );

    const fetchEventDetails = async () => {
      const docSnap = await getDoc(eventDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventDetails({
          description: data.description || 'אין תיאור',
          location: data.location || 'לא צוין',
          time: data.time || 'לא צוין',
          date: data.date || 'לא צוין',
          organizer: data.organizer || 'לא צוין',
        });
      }
    };

    fetchEventDetails();

    return () => unsubscribeGroup();
  }, [eventTitle]);

  const leaveGroup = async () => {
    if (!currentUid || !eventTitle) return;
    const groupDocRef = doc(db, 'group_chats', eventTitle);
    const groupDocSnap = await getDoc(groupDocRef);

    if (groupDocSnap.exists()) {
      const groupData = groupDocSnap.data();
      const newMembers = groupData.members.filter(
        (memberId: string) => memberId !== currentUid
      );
      await updateDoc(groupDocRef, { members: newMembers });
      router.back();
    }
  };

  const renderMember = ({ item }: { item: Member }) => {
    return (
      <View
        style={[
          styles.memberItem,
          {
            backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF',
            borderColor: theme.isDark ? '#3E506B' : '#E8E8E8',
          },
        ]}
      >
        {item.profileImageUrl ? (
          <Image
            source={{ uri: item.profileImageUrl }}
            style={styles.memberAvatar}
          />
        ) : (
          <View
            style={[
              styles.memberAvatar,
              {
                backgroundColor: theme.isDark ? '#2C3E50' : '#E0E0E0',
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <Ionicons name="people" size={32} color="#A0A0A0" />
          </View>
        )}
        <View style={styles.memberInfo}>
          <Text
            style={[
              styles.memberName,
              { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
            ]}
          >
            {item.username} {item.uid === currentUid && '(אני)'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.isDark ? '#A0C4FF' : '#3A8DFF'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#121212' : '#F8F9FA' },
      ]}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.isDark ? '#1F2937' : '#3A8DFF'}
      />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF',
          },
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פרטי קבוצה</Text>
        <TouchableOpacity style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.flexContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupImageContainer}>
            {groupImageUrl ? (
              <Image source={{ uri: groupImageUrl }} style={styles.groupImage} />
            ) : (
              <View
                style={[
                  styles.groupImagePlaceholder,
                  { backgroundColor: theme.isDark ? '#2C3E50' : '#E0E0E0' },
                ]}
              >
                <Ionicons
                  name="people"
                  size={60}
                  color={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.groupName,
              { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
            ]}
          >
            {groupName}
          </Text>
          <Text
            style={[
              styles.memberCount,
              { color: theme.isDark ? '#BDC3C7' : '#95A5A6' },
            ]}
          >
            {members.length} חברים
          </Text>
        </View>
        
        {eventDetails && (
          <View
            style={[
              styles.detailsSection,
              { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA' },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' },
              ]}
            >
              פרטי האירוע
            </Text>
            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF',
                  borderColor: theme.isDark ? '#3E506B' : '#E8E8E8',
                },
              ]}
            >
              <View style={styles.detailRow}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                  style={styles.detailIcon}
                />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailTitle, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>מיקום</Text>
                  <Text style={[styles.detailValue, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>{eventDetails.location}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                  style={styles.detailIcon}
                />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailTitle, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>תאריך</Text>
                  <Text style={[styles.detailValue, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>{eventDetails.date}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                  style={styles.detailIcon}
                />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailTitle, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>שעה</Text>
                  <Text style={[styles.detailValue, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>{eventDetails.time}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.isDark ? '#BDC3C7' : '#95A5A6'}
                  style={styles.detailIcon}
                />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailTitle, { color: theme.isDark ? '#E0E0E0' : '#2C3E50' }]}>תיאור</Text>
                  <Text style={[styles.detailValue, { color: theme.isDark ? '#BDC3C7' : '#95A5A6' }]}>{eventDetails.description}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View
          style={[
            styles.membersSection,
            { backgroundColor: theme.isDark ? '#1C242E' : '#F8F9FA' },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.isDark ? '#A0C4FF' : '#3A8DFF' },
            ]}
          >
            חברי קבוצה
          </Text>
          <FlatList
            data={members}
            renderItem={renderMember}
            keyExtractor={(item) => item.uid}
            scrollEnabled={false}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.leaveGroupButton,
            {
              backgroundColor: theme.isDark ? '#E57373' : '#FF5252',
            },
          ]}
          onPress={leaveGroup}
        >
          <Ionicons name="log-out" size={20} color="#FFFFFF" />
          <Text style={styles.leaveGroupButtonText}>יציאה מהקבוצה</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GroupDetailsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    position: 'absolute',
    backgroundColor: '#3A8DFF',
    elevation: 4,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  groupHeader: {
    position: 'relative',
    paddingTop: 70,
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  groupImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  groupImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2C3E50',
  },
  memberCount: {
    fontSize: 16,
    color: '#95A5A6',
    marginTop: 4,
  },
  detailsSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  detailCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'right',
  },
  detailValue: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'right',
  },
  membersSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A8DFF',
    marginBottom: 10,
    textAlign: 'right',
  },
  memberItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberInfo: {
    flex: 1,
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'right',
  },
  leaveGroupButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5252',
    borderRadius: 10,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 20,
  },
  leaveGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});