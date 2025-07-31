import { useAuthRequest } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = '328672185045-j2ufp6opvvq2hbce9u4og7rt6ghvb08j.apps.googleusercontent.com';
const IOS_CLIENT_ID = '328672185045-ope89nmh8ft15p1smem42e7no81ukc85.apps.googleusercontent.com';
const WEB_CLIENT_ID = '328672185045-g7gkss6smt3t1nkbp73nf1tt2bmham58.apps.googleusercontent.com'; // ודא שזה מדויק!

const { width, height } = Dimensions.get('window');

const getExpoWebRedirectUri = () => {
  const expoConfig = Constants.expoConfig;
  const expoUsername = expoConfig?.owner;
  const appSlug = expoConfig?.slug;
  const appScheme = expoConfig?.scheme; // <--- הוספנו גישה ל-scheme

  if (!expoUsername || !appSlug || !appScheme) { // <--- ודא שגם scheme קיים
    console.warn('Could not determine Expo username, app slug, or scheme for redirect URI. Using fallback URI.');
    return 'https://auth.expo.io/@your-fallback-username/your-fallback-app-slug';
  }

  // זהו ה-URI שגוגל מצפה לו עבור לקוח ווב של Expo Go
  // נוסיף את ה-scheme בסוף ה-URI כדי לוודא שהוא חלק מההפניה
  return `https://auth.expo.io/@${expoUsername}/${appSlug}`; // <--- שינוי כאן
};


export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const redirectUri = getExpoWebRedirectUri();
  console.log('Redirect URI for Google (from getExpoWebRedirectUri):', redirectUri);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: WEB_CLIENT_ID,
      redirectUri,
      scopes: ['profile', 'email'],
    },
    {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    }
  );

  useEffect(() => {
    if (response) {
      console.log('Auth Session Response Type:', response.type);
      if (response.type === 'success') {
        const { id_token } = response.params;
        console.log('Received id_token:', id_token ? 'YES' : 'NO'); // נדפיס רק אם קיים
        if (id_token) {
          handleGoogleSignIn(id_token);
        } else {
          Alert.alert('שגיאה', 'לא התקבל אסימון זיהוי מגוגל. אנא נסה שוב.');
          setIsLoading(false);
        }
      } else if (response.type === 'cancel') {
        Alert.alert('התחברות בוטלה', 'התחברות לגוגל בוטלה על ידי המשתמש.');
        setIsLoading(false);
      } else if (response.type === 'error') {
        console.error("Google Sign-In Error (Auth Session):", response.error);
        Alert.alert('שגיאה בהתחברות לגוגל', `אירעה שגיאה: ${response.error?.message || 'לא ידועה'}. אנא נסה שוב.`);
        setIsLoading(false);
      }
    }
  }, [response]);

  const validateForm = () => {
    // ... (ללא שינוי)
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
    // ... (ללא שינוי)
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

      await fetch('https://tripping-app.onrender.com/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          username: username.trim(),
        }),
      });

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        await fetch('https://tripping-app.onrender.com/update-user-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            latitude,
            longitude,
            username: username.trim(),
          }),
        });
      }

      router.push('/(tabs)/home');
    } catch (error) {
      console.error("שגיאה ברישום:", error);
      Alert.alert('שגיאה ברישום');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (idToken: String) => {
    setIsLoading(true);
    try {
      console.log('Attempting Firebase sign-in with Google ID Token...');
      const idTokenPrimitive = String(idToken); // <--- הוסף את השורה הזו
    
      const credential = GoogleAuthProvider.credential(idTokenPrimitive); // <--- השתמש ב-idTokenPrimitive כאן
      console.log('Firebase credential created.');

      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      console.log('Firebase sign-in successful. User UID:', user.uid);

      const usernameToSave = user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש גוגל');
      console.log('Saving user data to Firestore...');
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        uid: user.uid,
        username: usernameToSave,
        createdAt: new Date(),
      }, { merge: true });
      console.log('User data saved to Firestore.');

      console.log('Calling backend /register-user...');
      await fetch('https://tripping-app.onrender.com/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          username: usernameToSave,
        }),
      });
      console.log('Backend /register-user call complete.');

      console.log('Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        console.log('Location permission granted. Getting current position...');
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        console.log('Location received:', { latitude, longitude });

        console.log('Calling backend /update-user-location...');
        await fetch('https://tripping-app.onrender.com/update-user-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            latitude,
            longitude,
            username: usernameToSave,
          }),
        });
        console.log('Backend /update-user-location call complete.');
      } else {
        console.warn('Location permission not granted.');
      }

      console.log('Navigating to home screen...');
      router.push('/(tabs)/home');
    } catch (error: any) {
      console.error("שגיאה בתהליך הכניסה ל-Firebase עם גוגל:", error);
      Alert.alert('שגיאה בהתחברות לגוגל', error.message);
    } finally {
      setIsLoading(false);
      console.log('Finished handleGoogleSignIn process.');
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
            <Text style={styles.logo}>Triping</Text>
            <View style={styles.logoUnderline} />
          </View>
          <Text style={styles.welcomeText}>הצטרפו אלינו</Text>
          <Text style={styles.subtitle}>צרו חשבון חדש והתחילו את ההרפתקה שלכם</Text>
        </View>

        {/* כפתור התחברות עם גוגל - ממוקם ראשון */}
        <TouchableOpacity
          style={[
            styles.googleButton,
            isLoading && styles.googleButtonDisabled,
          ]}
          onPress={() => {
            if (request && !isLoading) {
              setIsLoading(true);
              promptAsync();
            } else if (!request) {
              Alert.alert('שגיאה', 'התחברות לגוגל אינה זמינה כרגע. אנא נסה שוב מאוחר יותר.');
            }
          }}
          disabled={isLoading || !request}
          activeOpacity={0.8}
        >
          <View style={styles.googleButtonContent}>
            <Text style={styles.googleIcon}>Google</Text> 
          </View>
        </TouchableOpacity>

        {/* מפריד בין התחברות עם גוגל להרשמה רגילה */}
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
                    onPress={() => router.push('/Authentication/TermsOfServiceScreen')}
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
          {/* המפריד והקישור להתחברות קיימים כבר בתוך ה-footerContainer.
              העברנו את המפריד הראשון למעלה כדי להפריד את כפתור גוגל. */}
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
    marginBottom: 0, // Adjusted to reduce space before divider
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
    fontSize: 20, // Adjust size as needed
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