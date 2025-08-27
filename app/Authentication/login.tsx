// --- Imports ---
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // פונקציית עזר חדשה לשמירת מיקום ב-Firestore
  const saveLocationToFirestore = async (user) => {
    try {
      console.log('LoginScreen: מתחיל שמירת מיקום ב-Firestore.');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        await setDoc(doc(db, 'users', user.uid), {
          latitude,
          longitude,
        }, { merge: true });
        console.log('LoginScreen: מיקום המשתמש נשמר ב-Firestore בהצלחה.');
      } else {
        console.warn('LoginScreen: הרשאת מיקום לא ניתנה, לא ניתן לשמור מיקום.');
      }
    } catch (error) {
      console.error("LoginScreen: שגיאה בשמירת מיקום ב-Firestore:", error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    setIsLoading(true);
    console.log('LoginScreen: מנסה להתחבר עם:', email);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      console.log('LoginScreen: התחברות מוצלחת! UID של המשתמש:', user.uid);
      await saveLocationToFirestore(user);
      
      router.push('/(tabs)/home');
    } catch (error) {
      console.error("LoginScreen: שגיאה בהתחברות:", error);
      
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const errorCode = error.code;
        console.error("LoginScreen: קוד שגיאה של Firebase:", errorCode);
        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
          Alert.alert('שגיאה בהתחברות', 'כתובת אימייל או סיסמה שגויים. אנא נסה שוב.');
        } else if (errorCode === 'auth/user-not-found') {
          Alert.alert('שגיאה בהתחברות', 'כתובת אימייל זו לא נמצאה במערכת.');
        } else {
          Alert.alert('שגיאה בהתחברות', 'אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.');
        }
      } else {
        Alert.alert('שגיאה בהתחברות', 'אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>TREK</Text>
            <Text style={styles.slogenContainer}>

            </Text>
            <View style={styles.logoUnderline} />
          </View>
          <Text style={styles.welcomeText}>התחברו כדי להמשיך להרפתקה שלכם</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>כתובת אימייל</Text>
            <TextInput
              placeholder="הזינו את כתובת האימייל שלכם"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
              style={styles.input}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>סיסמה</Text>
            <TextInput
              placeholder="הזינו את הסיסמה שלכם"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textAlign="right"
              style={styles.input}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'מתחבר...' : 'התחברות'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* שכבת טעינה, נוספה לזמן ההתחברות */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>מתחבר...</Text>
          </View>
        )}

        <View style={styles.footerContainer}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>או</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/Authentication/register')}
            style={styles.registerLink}
            disabled={isLoading}
          >
            <Text style={styles.registerText}>
              אין לכם חשבון? <Text style={styles.registerTextBold}>הרשמו כאן</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY_COLOR = '#3A8DFF';
const BACKGROUND_COLOR = '#FAFBFC';
const TEXT_COLOR = '#1A1A1A';
const GRAY_COLOR = '#6B7280';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.08,
    paddingBottom: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: height * 0.05,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: width * 0.12,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    letterSpacing: 1,
  },
  slogenContainer: {
    textAlign: 'center',
  },
  logoUnderline: {
    width: 60,
    height: 4,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    marginTop: 8,
  },
  welcomeText: {
    fontSize: width * 0.07,
    fontWeight: '700',
    color: TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 8,
  },
  formContainer: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: TEXT_COLOR,
    textAlign: 'right',
    writingDirection: 'rtl',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 56,
  },
  loginButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerContainer: {
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: GRAY_COLOR,
    fontWeight: '500',
  },
  registerLink: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  registerText: {
    textAlign: 'center',
    color: GRAY_COLOR,
    fontSize: 16,
    lineHeight: 24,
  },
  registerTextBold: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: TEXT_COLOR,
  },
});
