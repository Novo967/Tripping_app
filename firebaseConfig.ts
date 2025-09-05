// firebaseConfig.ts
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVuS1ZbOSWIpYY4rnXIfTToDBHoa42KW0",
  authDomain: "tripapp-f99f4.firebaseapp.com",
  projectId: "tripapp-f99f4",
  storageBucket: "tripapp-f99f4.firebasestorage.app",
  messagingSenderId: "328672185045",
  appId: "1:328672185045:web:a7c46b800584ec383ff05c"
};

export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);
