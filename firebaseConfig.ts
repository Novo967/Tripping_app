// lib/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAVuS1ZbOSWIpYY4rnXIfTToDBHoa42KW0",
  authDomain: "tripapp-f99f4.firebaseapp.com",
  projectId: "tripapp-f99f4",
  storageBucket: "tripapp-f99f4.firebasestorage.app",
  messagingSenderId: "328672185045",
  appId: "1:328672185045:web:a7c46b800584ec383ff05c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
