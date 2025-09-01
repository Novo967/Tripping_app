// --- Imports ---
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router'; // שינוי כאן
import * as WebBrowser from 'expo-web-browser';
import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useRef, useState } from 'react'; // שינוי כאן
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
import GoogleAuthButton from './googleAuth';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export const saveLocationToFirestore = async (user: User) => {
  try {
    console.log('Requesting location permissions...');
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') {
      console.log('Location permission granted. Getting current position...');
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      console.log('Location received:', { latitude, longitude });

      await setDoc(doc(db, 'users', user.uid), {
        latitude,
        longitude,
      }, { merge: true });
      console.log('User location saved to Firestore.');
    } else {
      console.warn('Location permission not granted. User document created without location.');
    }
  } catch (error) {
    console.error("Error saving location to Firestore:", error);
  }
};

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const isFirstLoad = useRef(true);

  // שימוש ב-useFocusEffect כדי לשמור את המצב בעת חזרה
  useFocusEffect(
    React.useCallback(() => {
      if (isFirstLoad.current) {
        // זהו הטעינה הראשונה של המסך, אז נאפס את המצב
        isFirstLoad.current = false;
        setEmail('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setAgreedToTerms(false);
      }
      // הפעם הבאה שהמסך יקבל פוקוס, הנתונים יישארו
    }, [])
  );

  const validateForm = () => {
    if (!email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return false;
    }
    if (username.trim().length < 2) {
      Alert.alert('שגיאה', 'שם המשתמש חייב להכיל לפחות 2 תווים');
      return false;
    }
    if (!agreedToTerms) {
      Alert.alert('שגיאה', 'נא לאשר את תנאי השימוש ומדיניות הפרטיות');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: username.trim(),
      });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        uid: user.uid,
        username: username.trim(),
        createdAt: new Date(),
      });

      await saveLocationToFirestore(user);

      Alert.alert('ההרשמה בוצעה בהצלחה!');
      router.push('/(tabs)/home');
    } catch (error) {
      console.error("שגיאה ברישום:", error);
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === 'auth/email-already-in-use') {
          Alert.alert('שגיאה', 'כתובת האימייל כבר קיימת במערכת. אנא נסה להתחבר או להשתמש בכתובת אימייל אחרת.');
        } else if (errorCode === 'auth/invalid-email') {
          Alert.alert('שגיאה', 'כתובת האימייל שהוזנה אינה תקינה.');
        } else {
          Alert.alert('שגיאה ברישום', 'אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.');
        }
      } else {
        Alert.alert('שגיאה ברישום', 'אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePressTerms = () => {
    // שמירת המצב הנוכחי לפני המעבר
    router.push({
      pathname: '/Authentication/TermsOfServiceScreen',
      params: {
        // לא נשמור כאן נתונים רגישים כמו סיסמה, אבל אפשר לשמור שדות אחרים אם צריך
        email: email,
        username: username,
        agreedToTerms: agreedToTerms.toString(),
      },
    });
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
            <Text style={styles.logo}>Trek</Text>
            <View style={styles.logoUnderline} />
          </View>
          <Text style={styles.welcomeText}>הצטרפו אלינו</Text>
          <Text style={styles.subtitle}>צרו חשבון חדש והתחילו את ההרפתקה שלכם</Text>
        </View>

        <GoogleAuthButton setIsLoading={setIsLoading} isLoading={isLoading} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>או</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>שם משתמש</Text>
            <TextInput
              placeholder="בחרו שם משתמש"
              placeholderTextColor="#A0A0A0"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              textAlign="right"
              style={styles.input}
              editable={!isLoading}
              maxLength={30}
            />
          </View>

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
              placeholder="לפחות 6 תווים"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textAlign="right"
              style={styles.input}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>אימות סיסמה</Text>
            <TextInput
              placeholder="הזינו שוב את הסיסמה"
              placeholderTextColor="#A0A0A0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textAlign="right"
              style={[
                styles.input,
                confirmPassword && password !== confirmPassword && styles.inputError
              ]}
              editable={!isLoading}
            />
            {confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>הסיסמאות אינן תואמות</Text>
            )}
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              disabled={isLoading}
            >
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  אני מסכים/ה ל
                    <Text style={styles.termsText}>תנאי השימוש ומדיניות הפרטיות</Text>
                    <TouchableOpacity
                    onPress={handlePressTerms} // שינוי כאן
                    disabled={isLoading}
                    >
                    <Text style={styles.termsLink}>קראו כאן</Text>
                    </TouchableOpacity>
                </Text>
              </View>
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.registerButton,
              isLoading && styles.registerButtonDisabled,
              !agreedToTerms && styles.registerButtonInactive
            ]}
            onPress={handleRegister}
            disabled={isLoading || !agreedToTerms}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'נרשם...' : 'הרשמה'}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>טוען...</Text>
          </View>
        )}

        <View style={styles.footerContainer}>
          <TouchableOpacity
            onPress={() => router.push('/Authentication/login')}
            style={styles.loginLink}
            disabled={isLoading}
          >
            <Text style={styles.loginText}>
              כבר יש לכם חשבון? <Text style={styles.loginTextBold}>התחברו כאן</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ... שאר הקוד של styles ...
const PRIMARY_COLOR = '#3A8DFF';
const SECONDARY_COLOR = '#FF8533';
const BACKGROUND_COLOR = '#FAFBFC';
const TEXT_COLOR = '#1A1A1A';
const GRAY_COLOR = '#6B7280';
const LIGHT_GRAY = '#F3F4F6';
const ERROR_COLOR = '#EF4444';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.06,
    paddingBottom: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: height * 0.04,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: width * 0.1,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    letterSpacing: 1,
  },
  logoUnderline: {
    width: 50,
    height: 4,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    marginTop: 6,
  },
  welcomeText: {
    fontSize: width * 0.065,
    fontWeight: '700',
    color: TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: width * 0.038,
    color: GRAY_COLOR,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
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
  inputError: {
    borderColor: ERROR_COLOR,
    borderWidth: 2,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 14,
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '500',
  },
  registerButton: {
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
  registerButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonInactive: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
  loginLink: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  loginText: {
    textAlign: 'center',
    color: GRAY_COLOR,
    fontSize: 16,
    lineHeight: 24,
  },
  loginTextBold: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: GRAY_COLOR,
    textAlign: 'right',
    lineHeight: 20,
  },
  termsLink: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4285F4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 0,
  },
  googleButtonDisabled: {
    backgroundColor: '#A0A0A0',
    shadowOpacity: 0,
    elevation: 0,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
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