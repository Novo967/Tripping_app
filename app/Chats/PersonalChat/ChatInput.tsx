import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../ProfileServices/ThemeContext';

interface ChatInputProps {
  input: string;
  onSetInput: (text: string) => void;
  onSendMessage: (imageUrl?: string) => Promise<void>;
  onHandleImagePicker: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ input, onSetInput, onSendMessage, onHandleImagePicker }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
      <View style={[styles.inputContainer, { backgroundColor: theme.isDark ? '#1C242E' : '#F5F5F5' }]}>
        <TouchableOpacity style={[styles.cameraButton, { backgroundColor: theme.isDark ? '#3D4D5C' : '#FFFFFF' }]} onPress={onHandleImagePicker} activeOpacity={0.7}>
          <Ionicons name="camera" size={24} color="#3A8DFF" />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.isDark ? '#1C242E' : '#F5F5F5' }]}
          placeholder="הקלד הודעה..."
          placeholderTextColor={theme.isDark ? '#999' : '#999'}
          value={input}
          onChangeText={onSetInput}
          onSubmitEditing={() => onSendMessage()}
          returnKeyType="send"
          textAlign="right"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={() => onSendMessage()}
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          activeOpacity={0.8}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={20} color={input.trim() ? '#FFFFFF' : theme.isDark ? '#555' : '#CCC'} style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatInput;

const styles = StyleSheet.create({
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 50,
  },
  cameraButton: {
    width: 40,
    height: 40,
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