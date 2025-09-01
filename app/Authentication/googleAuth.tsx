// --- Imports ---
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Dispatch, SetStateAction } from 'react';
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

// --- Google OAuth Client IDs ---
// משתמש ב-Client IDs מתוך google-services.json
const ANDROID_CLIENT_ID = '328672185045-j2ufp6opvvq2hbce9u4og7rt6ghvb08j.apps.googleusercontent.com';
const IOS_CLIENT_ID = '328672185045-ope89nmh8ft15p1smem42e7no81ukc85.apps.googleusercontent.com';
const WEB_CLIENT_ID = '328672185045-g7gkss6smt3t1nkbp73nf1tt2bmham58.apps.googleusercontent.com';

// פונקציה לקבלת ה-Redirect URI הנכון
const getExpoWebRedirectUri = () => {
  const expoConfig = Constants.expoConfig;
  const expoUsername = expoConfig?.owner;
  const appSlug = expoConfig?.slug;

  // שימוש בנתונים מ-app.json
  const username = expoUsername || 'novrubin';
  const slug = appSlug || 'Tripping_app';
  
  const redirectUri = `https://auth.expo.io/@${username}/${slug}`;
  console.log('Using redirect URI:', redirectUri);
  
  return redirectUri;
};

interface GoogleAuthButtonProps {
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
}

const GoogleAuthButton = ({ setIsLoading, isLoading }: GoogleAuthButtonProps) => {
  // שימוש ב-Google provider הספציפי של Expo - הוא יטפל ב-redirect URIs אוטומטית
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    // Expo יטפל בכל ה-redirect URIs בעצמו
  });

  useEffect(() => {
    if (response) {
      console.log('Google Auth Response Type:', response.type);
      
      if (response.type === 'success') {
        const { id_token, access_token } = response.params;
        console.log('Received tokens:', { 
          id_token: id_token ? 'YES' : 'NO', 
          access_token: access_token ? 'YES' : 'NO' 
        });
        
        if (id_token) {
          handleGoogleSignIn(id_token);
        } else {
          console.error('No id_token received');
          Alert.alert('שגיאה', 'לא התקבל אסימון זיהוי מגוגל. אנא נסה שוב.');
          setIsLoading(false);
        }
      } else if (response.type === 'cancel') {
        console.log('User cancelled Google sign-in');
        Alert.alert('התחברות בוטלה', 'ההתחברות לגוגל בוטלה על ידי המשתמש.');
        setIsLoading(false);
      } else if (response.type === 'error') {
        console.error("Google Sign-In Error:", response.error);
        Alert.alert(
          'שגיאה בהתחברות לגוגל', 
          `אירעה שגיאה: ${response.error?.message || 'לא ידועה'}. אנא נסה שוב.`
        );
        setIsLoading(false);
      }
    }
  }, [response]);
  
  const handleGoogleSignIn = async (idToken: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting Firebase sign-in with Google ID Token...');
      
      // יצירת credential עבור Firebase
      const credential = GoogleAuthProvider.credential(idToken);
      console.log('Firebase credential created.');

      // התחברות ל-Firebase
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      console.log('Firebase sign-in successful. User UID:', user.uid);
      
      // בדיקה אם המשתמש קיים ב-Firestore
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

      // שמירת מיקום המשתמש
      await saveLocationToFirestore(user);

      console.log('Navigating to home screen...');
      router.push('/(tabs)/home');
      
    } catch (error) {
      console.error("שגיאה בתהליך הכניסה ל-Firebase עם גוגל:", error);
      
      // טיפול בסוגי שגיאות ספציפיים
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        let errorMessage = 'אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.';
        
        switch (errorCode) {
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'כתובת האימייל כבר קיימת עם שירות התחברות אחר.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'פרטי ההתחברות לא תקינים.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'המשתמש הזה נחסם.';
            break;
        }
        
        Alert.alert('שגיאה בהתחברות לגוגל', errorMessage);
      } else {
        Alert.alert('שגיאה בהתחברות לגוגל', 'אירעה שגיאה לא צפויה. אנא נסה שוב.');
      }
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
        <Text style={styles.googleIcon}>התחבר עם Google</Text>
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
    marginTop: -10,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GoogleAuthButton;