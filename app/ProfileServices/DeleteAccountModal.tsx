import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../ProfileServices/ThemeContext';

interface DeleteAccountModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export default function DeleteAccountModal({
  isVisible,
  onClose,
  onConfirmDelete,
}: DeleteAccountModalProps) {
  const [isChecked, setChecked] = useState(false);
  const { theme } = useTheme();

  const handleDeletePress = () => {
    if (isChecked) {
      onConfirmDelete();
      onClose();
    } else {
      Alert.alert(
        'אישור חובה',
        'עליך לסמן שאתה מבין כי מחיקת החשבון היא לצמיתות.'
      );
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View
          style={[
            styles.modalView,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <View style={styles.header}>
            <Ionicons
              name="warning-outline"
              size={50}
              color="#FF3B30"
            />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              מחיקת חשבון לצמיתות
            </Text>
          </View>
          <Text style={[styles.modalText, { color: theme.colors.text }]}>
            פעולה זו היא בלתי הפיכה.
          </Text>
          <Text style={[styles.modalText, { color: theme.colors.text }]}>
            לאחר מחיקת החשבון, כל הנתונים שלך, כולל תמונות, מידע אישי והתאמות, יימחקו לצמיתות ולא יהיה ניתן לשחזרם.
          </Text>

          <View style={styles.checkboxContainer}>
            <Checkbox
              style={styles.checkbox}
              value={isChecked}
              onValueChange={setChecked}
              color={isChecked ? theme.colors.primary : theme.colors.text}
            />
            <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
              אני מבין/ה כי מחיקת החשבון היא לצמיתות.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={onClose}
            >
              <Text style={[styles.textStyle, { color: theme.colors.text }]}>ביטול</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                isChecked ? styles.buttonDelete : styles.buttonDisabled,
              ]}
              onPress={handleDeletePress}
              disabled={!isChecked}
            >
              <Text style={styles.textStyle}>מחק חשבון</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonDelete: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#FF3B30',
    opacity: 0.5,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});