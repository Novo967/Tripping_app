import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../ThemeContext';

const GroupChatErrorState: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#3D4D5C' : '#F8F9FA' },
      ]}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.isDark ? '#1F2937' : '#3A8DFF'}
      />
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: theme.isDark ? '#3D4D5C' : '#F8F9FA' },
        ]}
      >
        <View
          style={[
            styles.errorIcon,
            { backgroundColor: theme.isDark ? '#2C3E50' : '#F5F5F5' },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={60}
            color={theme.isDark ? '#4A90E2' : '#E0E0E0'}
          />
        </View>
        <Text
          style={[
            styles.errorTitle,
            { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
          ]}
        >
          אירוע לא זוהה
        </Text>
        <Text
          style={[
            styles.errorSubtitle,
            { color: theme.isDark ? '#BDC3C7' : '#95A5A6' },
          ]}
        >
          לא ניתן לטעון את הצאט הקבוצתי
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default GroupChatErrorState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 22,
  },
});