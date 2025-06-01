import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import React from 'react';
import { Button } from 'react-native';
import { auth } from './firebaseConfig';

export default function GoogleSignInButton() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '328672185045-sciua9fpf5bts89104gbf61sq5i56q2j.apps.googleusercontent.com',
    iosClientId: '328672185045-sciua9fpf5bts89104gbf61sq5i56q2j.apps.googleusercontent.comm',
    androidClientId: '328672185045-sciua9fpf5bts89104gbf61sq5i56q2j.apps.googleusercontent.com',
    webClientId: '328672185045-sciua9fpf5bts89104gbf61sq5i56q2j.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential);
    }
  }, [response]);

  return <Button title="Sign in with Google" onPress={() => promptAsync()} />;
}
