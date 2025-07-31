import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator // Import ActivityIndicator for loading circle
  ,


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
    // Stage 1: Main logo appears with a scale effect
    // שלב 1: לוגו ראשי מופיע עם אפקט קנה מידה
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

    // Stage 2: Letters and words appear in a row (adjusted timing after tagline removal)
    // שלב 2: אותיות ומילים מופיעות בשורה (תזמון מותאם לאחר הסרת הסלוגן)
    setTimeout(() => {
      Animated.timing(lettersContainerAnim, {
        toValue: 1,
        duration: 1500, // Adjusted duration
        useNativeDriver: true,
      }).start();
    }, 1500); // Starts immediately after logo animation ends

    // Stage 3: Loading indicator appears (adjusted timing)
    // שלב 3: מחוון טעינה מופיע (תזמון מותאם)
    setTimeout(() => {
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 3000); // Starts after letters animation
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
            <View key={index} style={styles.letterWordPair}>
              {/* Emphasized first letter as part of the word */}
              {/* אות ראשונה מודגשת כחלק מהמילה */}
              <Text numberOfLines={1} allowFontScaling={false}>
                <Text style={styles.letterText}>{item.word.charAt(0)}</Text>
                <Text style={styles.wordText}>{item.word.substring(1)}</Text>
              </Text>
              {index < trekWords.length - 1 && (
                <Text style={styles.separatorText}> | </Text>
              )}
            </View>
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
    color: '#3A8DFF', // Orange color for the logo
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
    marginHorizontal: 2, // Reduced space between each letter-word pair
    flex: 0, // Don't allow flex growth
    minWidth: 0, // Allow shrinking
  },
  letterText: {
    fontSize: 20, // Reduced size for smaller screens
    fontWeight: 'bold',
    color: '#3A8DFF', // Orange for initials
    // Removed marginRight as it's now part of the same Text component
  },
  wordText: {
    fontSize: 16, // Reduced size for smaller screens
    color: '#333333', // Darker text for readability
    fontWeight: '500',
  },
  separatorText: {
    fontSize: 16, // Reduced size
    color: '#AAAAAA', // Lighter separator
    marginHorizontal: 3, // Reduced margin
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888888',
    fontSize: 16, // Slightly larger loading text
    letterSpacing: 1.2,
    marginTop: 10, // Space between spinner and text
  },
});