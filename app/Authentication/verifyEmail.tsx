import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function VerifyEmailScreen() {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload(); // לרענן את הנתונים מהשרת
        if (user.emailVerified) {
          router.replace('/(tabs)/home'); // אם מאומת, נשלח ל-Home
        }
      }
    });
    return unsubscribe;
  }, []);

  const handleCheckVerification = async () => {
    const user = auth.currentUser;
    if (user) {
      setChecking(true);
      await user.reload();
      if (user.emailVerified) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('עדיין לא מאומת', 'אנא בדקו את תיבת הדואר שלכם ולחצו על קישור האימות.');
      }
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>אימות אימייל</Text>
      <Text style={styles.subtitle}>
        נשלח אליך מייל אימות. אנא אשר את כתובת האימייל לפני הכניסה לאפליקציה.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCheckVerification}
        disabled={checking}
      >
        {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>בדוק שוב</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#3A8DFF', padding: 14, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
