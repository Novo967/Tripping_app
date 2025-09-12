import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Dimensions, StatusBar, StyleSheet, View } from 'react-native';
import Video from 'react-native-video';


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
        resizeMode="cover" // Changed back to cover for better display
        repeat
        muted
        paused={false}
        onError={(error) => {
          console.log('Video error:', error);
        }}
        onLoad={(data) => {
          console.log('Video loaded successfully', data);
        }}
        onLoadStart={() => {
          console.log('Video load started');
        }}
        onBuffer={(buffer) => {
          console.log('Video buffering:', buffer);
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

