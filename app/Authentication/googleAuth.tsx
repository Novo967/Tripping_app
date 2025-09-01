// --- Imports ---
import { useAuthRequest } from 'expo-auth-session';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Dispatch, SetStateAction } from 'react'; // תיקון: ייבוא טיפוסי ריאקט
import React, { useEffect } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { saveLocationToFirestore } from './register';

// --- Google OAuth Client IDs (אין שינוי) ---
const ANDROID_CLIENT_ID = '328672185045-j2ufp6opvvq2hbce9u4og7rt6ghvb08j.apps.googleusercontent.com';
const IOS_CLIENT_ID = '328672185045-ope89nmh8ft15p1smem42e7no81ukc85.apps.googleusercontent.com';
const WEB_CLIENT_ID = '328672185045-g7gkss6smt3t1nkbp73nf1tt2bmham58.apps.googleusercontent.com';

const getExpoWebRedirectUri = () => {
  const expoConfig = Constants.expoConfig;
  const expoUsername = expoConfig?.owner;
  const appSlug = expoConfig?.slug;
  const appScheme = expoConfig?.scheme;

  if (!expoUsername || !appSlug || !appScheme) {
    console.warn('Could not determine Expo username, app slug, or scheme for redirect URI. Using fallback URI.');
    return 'https://auth.expo.io/@your-fallback-username/your-fallback-app-slug';
  }
  return `https://auth.expo.io/@${expoUsername}/${appSlug}`;
};

// תיקון: הגדרת ממשק ל-Props
interface GoogleAuthButtonProps {
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
}

const GoogleAuthButton = ({ setIsLoading, isLoading }: GoogleAuthButtonProps) => { // תיקון: שימוש בממשק שהוגדר
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
        console.log('Received id_token:', id_token ? 'YES' : 'NO');
        if (id_token) {
          handleGoogleSignIn(id_token as string);
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
  
  const handleGoogleSignIn = async (idToken: string) => { // תיקון: הגדרת הטיפוס של הפרמטר idToken
    setIsLoading(true);
    try {
      console.log('Attempting Firebase sign-in with Google ID Token...');
      const idTokenPrimitive = String(idToken);
      const credential = GoogleAuthProvider.credential(idTokenPrimitive);
      console.log('Firebase credential created.');

      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      console.log('Firebase sign-in successful. User UID:', user.uid);
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const usernameToSave = user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש גוגל');
      
      if (!userDoc.exists()) {
        console.log('User document does not exist. Creating new one...');
        await setDoc(userDocRef, {
          email: user.email,
          uid: user.uid,
          username: usernameToSave,
          createdAt: new Date(),
        });
      }

      await saveLocationToFirestore(user);

      console.log('Navigating to home screen...');
      router.push('/(tabs)/home');
    } catch (error) {
      console.error("שגיאה בתהליך הכניסה ל-Firebase עם גוגל:", error);
      Alert.alert('שגיאה בהתחברות לגוגל');
    } finally {
      setIsLoading(false);
      console.log('Finished handleGoogleSignIn process.');
    }
  };

  return (
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
  );
};

const styles = StyleSheet.create({
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
});

export default GoogleAuthButton;