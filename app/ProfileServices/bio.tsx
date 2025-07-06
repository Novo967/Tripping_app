// app/ProfileServices/BioWrapper.tsx - Wrapper for Bio component
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Bio from './bio';

type Props = {
  bio: string;
  isEditing: boolean;
  onChange: (bio: string) => void;
  onSave: () => void;
  onEditToggle: () => void;
};

export default function BioWrapper({ bio, isEditing, onChange, onSave, onEditToggle }: Props) {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  if (isEditing) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.touchableContainer}>
            <Bio
              bio={bio}
              isEditing={isEditing}
              onChange={onChange}
              onSave={onSave}
              onEditToggle={onEditToggle}
            />
            {/* Invisible area to catch touches */}
            <View style={styles.invisibleArea} />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Bio
      bio={bio}
      isEditing={isEditing}
      onChange={onChange}
      onSave={onSave}
      onEditToggle={onEditToggle}
    />
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  touchableContainer: {
    flex: 1,
  },
  invisibleArea: {
    flex: 1,
    minHeight: 200,
  },
});