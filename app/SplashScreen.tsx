import { ResizeMode, Video } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Dimensions, StatusBar, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreenComponent() {
  console.log('SplashScreenComponent is rendering!');
  
  useEffect(() => {
    // Hide Expo's splash screen immediately when this component mounts
    const hideSplashScreen = async () => {
      try {
        await SplashScreen.hideAsync();
        console.log('Expo splash screen hidden');
      } catch (error) {
        console.warn('Error hiding splash screen:', error);
      }
    };
    
    hideSplashScreen();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Video
        source={require('../assets/videos/trekload_converted.mp4')}
        style={styles.backgroundVideo}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        onError={(error) => {
          console.log('Video error:', error);
        }}
        onLoad={() => {
          console.log('Video loaded successfully');
        }}
        onLoadStart={() => {
          console.log('Video load started');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  backgroundVideo: {
    flex: 1,
  }
});