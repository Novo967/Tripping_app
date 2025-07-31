import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator, // Import ActivityIndicator for loading circle
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  // Animated values for various elements
  // ערכים מונפשים עבור אלמנטים שונים
  const logoAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.3)).current;
  const lettersContainerAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startSplashAnimation();
  }, []);

  // Function to start the splash screen animation sequence
  // פונקציה להפעלת רצף האנימציה של מסך הפתיחה
  const startSplashAnimation = () => {
    // Stage 1: Main logo and letters appear with scale effect simultaneously
    // שלב 1: לוגו ראשי ואותיות מופיעות עם אפקט קנה מידה בו זמנית
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
      Animated.timing(lettersContainerAnim, { // Start letters animation at the same time
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 3: Loading indicator appears (adjusted timing)
    // שלב 3: מחוון טעינה מופיע (תזמון מותאם)
    setTimeout(() => {
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 2000); // Starts after main logo and letters animation (reduced delay)
  };

  // Define the words for the "TREK" acronym
  // הגדרת המילים עבור ראשי התיבות "TREK"
  const trekWords = [
    { letter: 'T', word: 'Travel' },
    { letter: 'R', word: 'Relate' },
    { letter: 'E', word: 'Explore' },
    { letter: 'K', word: 'Keep Moving' },
  ];

  return (
    <View style={styles.container}>
      {/* Set status bar style based on background */}
      {/* הגדרת סגנון שורת המצב בהתאם לרקע */}
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main content container, centered */}
      {/* מיכל תוכן ראשי, ממורכז */}
      <View style={styles.centerContainer}>
        {/* Main Logo - "TREK" */}
        {/* לוגו ראשי - "TREK" */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [{ scale: logoScaleAnim }],
            },
          ]}
        >
          <Text style={styles.mainLogo}>TREK</Text>
        </Animated.View>

        {/* Animated Letters with Meanings - arranged in a row */}
        {/* אותיות מונפשות עם משמעויות - מסודרות בשורה */}
        <Animated.View
          style={[
            styles.lettersRowContainer,
            {
              opacity: lettersContainerAnim,
              transform: [
                {
                  scale: lettersContainerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {trekWords.map((item, index) => (
            <React.Fragment key={index}>
              <View style={styles.letterWordPair}>
                {/* Emphasized first letter as part of the word, no separation */}
                {/* אות ראשונה מודגשת כחלק מהמילה, ללא הפרדה */}
                <Text numberOfLines={1} allowFontScaling={false}>
                  <Text style={styles.letterText}>{item.word.charAt(0)}</Text>
                  <Text style={styles.wordText}>{item.word.substring(1)}</Text>
                </Text>
              </View>
              {index < trekWords.length - 1 && (
                <Text style={styles.doubleSpace}>{'  '}</Text> // Add double space here
              )}
            </React.Fragment>
          ))}
        </Animated.View>
      </View>

      {/* Loading Animation */}
      {/* אנימציית טעינה */}
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: loadingAnim,
          },
        ]}
      >
        <ActivityIndicator size="large" color="#3A8DFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
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
    marginBottom: 20, // Adjusted margin for better centering after tagline removal
  },
  mainLogo: {
    fontSize: 80, // Larger font size for main logo
    fontWeight: '900', // Bolder font weight
    color: '#3A8DFF', // Blue color for the logo
    letterSpacing: 15, // Increased letter spacing
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)', // Subtle text shadow
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  lettersRowContainer: {
    flexDirection: 'row', // Arrange items in a row
    justifyContent: 'center', // Center items horizontally
    alignItems: 'center',
    flexWrap: 'nowrap', // Prevent wrapping - force single line
    paddingHorizontal: 10, // Reduced padding
    maxWidth: width * 0.95, // Slightly increased max width
  },
  letterWordPair: {
    flexDirection: 'row',
    alignItems: 'baseline', // Align text baseline
    // Removed marginHorizontal here as the word itself will handle spacing
    flex: 0, // Don't allow flex growth
    minWidth: 0, // Allow shrinking
  },
  letterText: {
    fontSize: 20, // Reduced size for smaller screens
    fontWeight: 'bold',
    color: '#3A8DFF', // Blue for initials
    // Removed marginRight as it's now part of the same Text component
  },
  wordText: {
    fontSize: 16, // Reduced size for smaller screens
    color: '#3A8DFF', // Blue color for readability
    fontWeight: '500',
  },
  doubleSpace: {
    fontSize: 16, // Match font size of words for consistent spacing
    color: '#3A8DFF', // Ensure space is also blue
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingText: {
    color: '#3A8DFF', // Blue loading text
    fontSize: 16, // Slightly larger loading text
    letterSpacing: 1.2,
    marginTop: 10, // Space between spinner and text
  },
});