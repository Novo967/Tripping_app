// Bio.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
  bio: string;
  isEditing: boolean;
  setBio: (bio: string) => void;
  onSave: () => void;
  onEditToggle: () => void;
};
export default function Bio({ bio, isEditing, setBio, onSave, onEditToggle }: Props) {
  return (
    <View style={styles.bioContainer}>
      {isEditing ? (
        <View>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            placeholder="ספר על עצמך..."
            multiline
            maxLength={150}
            textAlignVertical="top"
          />
          <View style={styles.bioActions}>
            <TouchableOpacity onPress={onSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>שמור</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onEditToggle} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={onEditToggle} style={styles.bioDisplay}>
          <Text
            style={[styles.bioText, bio ? styles.bioTextFilled : styles.bioTextPlaceholder]}
          >
            {bio || 'לחץ כאן כדי להוסיף תיאור עליך...'}
          </Text>
          <Ionicons name="pencil" size={16} color="#666" style={styles.bioEditIcon} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bioContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bioDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 40,
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  bioTextFilled: {
    color: '#262626',
  },
  bioTextPlaceholder: {
    color: '#8e8e8e',
  },
  bioEditIcon: {
    marginLeft: 10,
    marginTop: 2,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#262626',
    minHeight: 80,
    backgroundColor: '#fafafa',
  },
  bioActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#8e8e8e',
    fontSize: 14,
  },
});
