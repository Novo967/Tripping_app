import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../app/ProfileServices/ThemeContext';

interface ChatHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ searchQuery, setSearchQuery }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.headerSafeArea,
        { backgroundColor: theme.isDark ? '#1F2937' : '#3A8DFF' },
      ]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.isDark ? '#1F2937' : '#3A8DFF',
            shadowColor: theme.isDark ? '#1F2937' : '#3A8DFF',
          },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: theme.isDark ? '#FFFFFF' : '#FFFFFF' },
          ]}
        >
          הצ'אטים שלך
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: theme.isDark ? '#A0C4FF' : '#FFFFFF' },
          ]}
        >
          התחבר עם חברים למסע
        </Text>
      </View>
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.isDark ? '#2C3E50' : '#FFFFFF',
              shadowColor: theme.isDark ? '#000' : '#000',
            },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={theme.isDark ? '#BDC3C7' : '#95A5A6'}
            style={{ marginLeft: 10 }}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.isDark ? '#E0E0E0' : '#333' },
            ]}
            placeholder="חיפוש צ'אטים"
            placeholderTextColor={theme.isDark ? '#BDC3C7' : '#95A5A6'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerSafeArea: {
    backgroundColor: '#3A8DFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#3A8DFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3A8DFF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: -20,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  searchContainer: {
    paddingTop: -5,
    paddingBottom:15,
    paddingHorizontal:16,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 30,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'right',
  },
});

export default ChatHeader;