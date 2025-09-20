import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../ThemeContext';

export const LoadingComponent: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      style={[
      {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      },
      ]}
    >
      <LottieView
      source={require('../../../assets/videos/mapLoading.json')}
      autoPlay
      loop
      style={{ width: '100%', height: '100%' }}
      />
      <View
      style={{
        position: 'absolute',
        bottom: 60,
        width: '100%',
        alignItems: 'center',
      }}
      >
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  animation: {
    width: 150,
    height: 150,
  },
});
