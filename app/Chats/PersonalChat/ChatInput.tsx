import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../ThemeContext';

interface ChatInputProps {
  input: string;
  onSetInput: (text: string) => void;
  onSendMessage: (imageUrl?: string) => Promise<void>;
  onHandleImagePicker: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ input, onSetInput, onSendMessage, onHandleImagePicker }) => {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
      style={{ flexDirection: 'column' }}
    >
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom,
        }
      ]}>
        <View style={[styles.inputContainer, { backgroundColor: theme.isDark ? '#1C242E' : '#F5F5F5' }]}>
          <TouchableOpacity
            style={[styles.cameraButton, { backgroundColor: theme.isDark ? '#3D4D5C' : '#FFFFFF' }]}
            onPress={onHandleImagePicker}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={24} color="#3A8DFF" />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.isDark ? '#1C242E' : '#F5F5F5' }]}
            placeholder="כתוב הודעה..."
            placeholderTextColor={theme.isDark ? '#999' : '#999'}
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
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled,
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
          <Ionicons name="send" size={22} color={input.trim() ? '#FFFFFF' : theme.isDark ? '#555' : '#CCC'}/>
        </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatInput;

const styles = StyleSheet.create({
  inputWrapper: {
    paddingHorizontal: 16,
    marginBottom: -20,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 0,
    minHeight: 50,
  },
  cameraButton: {
    width: 40,
    height: 40,
    marginBottom: 5,
    borderRadius: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    marginBottom: 5,
    borderRadius: 20,
    backgroundColor: '#3A8DFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
    shadowColor: '#3A8DFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8E8E8',
    shadowOpacity: 0,
    elevation: 0,
  },
});