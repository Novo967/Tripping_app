import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../ThemeContext';

interface GroupChatInputProps {
  input: string;
  onSetInput: (text: string) => void;
  onSendMessage: () => Promise<void>;
  onHandleImagePicker: () => void;
  isUploading: boolean;
}

const GroupChatInput: React.FC<GroupChatInputProps> = ({
  input,
  onSetInput,
  onSendMessage,
  onHandleImagePicker,
  isUploading,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // שמור את ההודעה לפני הניקוי
    const messageToSend = input.trim();
    
    // נקה את התיבה מיד
    onSetInput('');
    
    // שלח את ההודעה
    try {
      await onSendMessage();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <View
      style={[
        styles.inputWrapper,
        {
          backgroundColor: theme.isDark ? '#1F2937' : '#FFFFFF',
          borderTopColor: theme.isDark ? '#2C3E50' : '#E8E8E8',
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
        },
      ]}
    >
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.isDark ? '#2C3E50' : '#F5F5F5' },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.cameraButton,
            {
              backgroundColor: theme.isDark ? '#2C3E50' : '#FFFFFF',
              shadowColor: theme.isDark ? '#000' : '#000',
            },
          ]}
          onPress={onHandleImagePicker}
          activeOpacity={0.7}
          disabled={isUploading}
        >
          <Ionicons
            name="camera"
            size={24}
            color={theme.isDark ? '#A0C4FF' : '#3A8DFF'}
          />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
          ]}
          placeholder="הקלד הודעה קבוצתית..."
          placeholderTextColor={theme.isDark ? '#BDC3C7' : '#999'}
          value={input}
          onChangeText={onSetInput}
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
          textAlign="right"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={[
            styles.sendButton,
            !input.trim() && styles.sendButtonDisabled,
            {
              backgroundColor: input.trim()
                ? '#3A8DFF'
                : theme.isDark
                ? '#3E506B'
                : '#E8E8E8',
              shadowColor: input.trim()
                ? theme.isDark
                ? '#1F2937'
                : '#3A8DFF'
                : '#000',
              shadowOpacity: input.trim() ? 0.3 : 0,
              elevation: input.trim() ? 4 : 0,
            },
          ]}
          activeOpacity={0.8}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={22} color={input.trim() ? '#FFFFFF' : theme.isDark ? '#555' : '#CCC'} style={{ }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GroupChatInput;

const styles = StyleSheet.create({
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: -20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 50,
  },
  cameraButton: {
    width: 40,
    height: 40,
    marginBottom: 3,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    marginBottom: 3,
    borderRadius: 20,
    backgroundColor: '#3A8DFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#3A8DFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8E8E8',
    shadowOpacity: 0,
    elevation: 0,
  },
});