import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../ProfileServices/ThemeContext';

interface GroupChatHeaderProps {
  groupName: string;
  groupImageUrl: string | null;
  memberCount: number;
  isUploading: boolean;
  onGoBack: () => void;
  onOpenGroupDetails: () => void;
}

const GroupChatHeader: React.FC<GroupChatHeaderProps> = ({
  groupName,
  groupImageUrl,
  memberCount,
  isUploading,
  onGoBack,
  onOpenGroupDetails,
}) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={{
        backgroundColor: theme.isDark ? '#2C3946' : '#3A8DFF',
        shadowColor: theme.isDark ? '#2C3946' : '#3A8DFF',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={onGoBack}
          style={[
            styles.backButton,
            { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.groupInfo}>
          <TouchableOpacity
            onPress={onOpenGroupDetails}
            style={styles.groupIconContainer}
            disabled={isUploading}
          >
            {isUploading ? (
              <View
                style={[
                  styles.groupAvatarPlaceholder,
                  {
                    backgroundColor: theme.isDark ? '#2C3E50' : '#fff',
                    borderColor: theme.isDark ? '#4A90E2' : '#FFFFFF',
                    shadowColor: theme.isDark ? '#000' : '#000',
                  },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
                />
              </View>
            ) : groupImageUrl ? (
              <Image
                source={{ uri: groupImageUrl }}
                style={[
                  styles.groupAvatar,
                  { borderColor: theme.isDark ? '#4A90E2' : '#FFFFFF' },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.groupAvatarPlaceholder,
                  {
                    backgroundColor: theme.isDark ? '#2C3E50' : '#fff',
                    borderColor: theme.isDark ? '#4A90E2' : '#FFFFFF',
                    shadowColor: theme.isDark ? '#000' : '#000',
                  },
                ]}
              >
                <Ionicons
                  name="people"
                  size={24}
                  color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
                />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.groupTextInfo}>
            <TouchableOpacity onPress={onOpenGroupDetails}>
              <Text
                style={[
                  styles.groupName,
                  { color: theme.isDark ? '#FFFFFF' : '#FFFFFF' },
                ]}
                numberOfLines={1}
              >
                {groupName}
              </Text>
              <Text
                style={[
                  styles.groupStatus,
                  { color: theme.isDark ? '#A0C4FF' : '#FFE0B3' },
                ]}
              >
                {memberCount} משתתפים
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default GroupChatHeader;

const styles = StyleSheet.create({
  headerContent: {
    paddingHorizontal: 16,
    marginBottom: -30,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  groupInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  groupIconContainer: {
    position: 'relative',
    marginLeft: 12,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupTextInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  groupStatus: {
    fontSize: 13,
    color: '#FFE0B3',
    textAlign: 'right',
    marginTop: 2,
  },
}); 