import React from 'react';
import { Dimensions, StatusBar, StyleSheet, View } from 'react-native';
import Video from 'react-native-video';

const { width, height } = Dimensions.get('window');

export default function SplashScreenComponent() {
  return (
    <View style={styles.container}>
      {/* התאמת הסטטוס בר */}
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* וידאו בלופים */}
      <Video
        source={require('../assets/videos/trekload.mp4')}
        style={styles.backgroundVideo}
        resizeMode="cover"
        repeat
        muted
        // הספלאש סקרין הראשי יטופל על ידי ה-App.tsx
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  backgroundVideo: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
});