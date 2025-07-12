import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.3)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const lettersAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startSplashAnimation();
  }, []);

  const startSplashAnimation = () => {
    // Stage 1: Logo appears with scale effect (0-1.5s)
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 2: Subtitle appears (1.5-2.5s)
    setTimeout(() => {
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 1500);

    // Stage 3: Letters expand (2.5-4.5s)
    setTimeout(() => {
      Animated.timing(lettersAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start();
    }, 2500);

    // Stage 4: Loading appears (4.5-5s)
    setTimeout(() => {
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 4500);
  };

  const trekWords = [
    { letter: 'T', word: 'Travel' },
    { letter: 'R', word: 'Relate' },
    { letter: 'E', word: 'Explore' },
    { letter: 'K', word: 'Keep Moving' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      {/* Main Logo Section - Centered */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [
                { scale: logoScaleAnim },
              ],
            },
          ]}
        >
          <Text style={styles.mainLogo}>TREK</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleAnim,
            },
          ]}
        >
          <Text style={styles.tagline}>Your Journey Begins Here</Text>
        </Animated.View>

        {/* Animated Letters with Meanings */}
        <Animated.View
          style={[
            styles.lettersContainer,
            {
              opacity: lettersAnim,
              transform: [
                {
                  scale: lettersAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {trekWords.map((item, index) => (
            <View key={index} style={styles.letterItem}>
              <Text style={styles.letterText}>{item.letter}</Text>
              <Text style={styles.wordText}>{item.word}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Loading Animation */}
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: loadingAnim,
          },
        ]}
      >
        <View style={styles.loadingDots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width * 0.9,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainLogo: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ff6600',
    letterSpacing: 12,
    textAlign: 'center',
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  tagline: {
    fontSize: 18,
    color: '#cccccc',
    letterSpacing: 2,
    fontWeight: '300',
    textAlign: 'center',
  },
  lettersContainer: {
    width: '100%',
    alignItems: 'center',
  },
  letterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 40,
    width: '100%',
    maxWidth: 280,
  },
  letterText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6600',
    width: 40,
  },
  wordText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '400',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'left',
    marginLeft: 20,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff6600',
    marginHorizontal: 4,
  },
  loadingText: {
    color: '#888888',
    fontSize: 14,
    letterSpacing: 1,
  },
});