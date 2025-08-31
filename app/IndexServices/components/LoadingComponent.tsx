import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../../../app/ProfileServices/ThemeContext';
import { homeScreenStyles } from '../styles/homeScreenStyles';

export const LoadingComponent: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[homeScreenStyles.centered, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[homeScreenStyles.loadingText, { color: theme.colors.text }]}>
        🗺️ טוען מפה...
      </Text>
    </View>
  );
};