// app/ProfileServices/OtherUser/OtherUserProfileOptions.tsx

import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useTheme } from '../ThemeContext';

const { width } = Dimensions.get('window');

interface OtherUserProfileOptionsProps {
  username: string;
  userId: string; // ✅ הוספתי UID
  onBlockUser: () => void;
}

const OtherUserProfileOptions: React.FC<OtherUserProfileOptionsProps> = ({ 
  username, 
  userId,
  onBlockUser 
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [scaleValue] = useState(new Animated.Value(0));
  const { theme } = useTheme();
  const router = useRouter();

  const openModal = () => {
    setIsModalVisible(true);
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleShareUser = async () => {
    try {
      const profileUrl = `myapp://profile/${username}`;
      const shareOptions = {
        message: `בדוק את הפרופיל של ${username} באפליקציה!`,
        url: profileUrl,
        title: `פרופיל של ${username}`,
      };

      await Share.share(shareOptions);
      closeModal();
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleReportUser = () => {
    closeModal();
    router.push({
      
      pathname: "../ReportUserModal",
      params: { uid: userId, username }
    });
  };

  const handleBlockUser = () => {
    closeModal();
    onBlockUser();
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.isDark ? theme.colors.background : '#f8f9fa' }
        ]}
        onPress={openModal}
      >
        <Feather name="more-vertical" size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: theme.colors.surface,
                    transform: [{ scale: scaleValue }],
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    אפשרויות
                  </Text>
                </View>

                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      { borderBottomColor: theme.isDark ? '#374151' : '#E5E7EB' }
                    ]}
                    onPress={handleShareUser}
                  >
                    <View style={styles.optionContent}>
                      <Feather name="share-2" size={20} color="#3A8DFF" />
                      <Text style={[styles.optionText, { color: theme.colors.text }]}>
                        שתף משתמש
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      { borderBottomColor: theme.isDark ? '#374151' : '#E5E7EB' }
                    ]}
                    onPress={handleReportUser}
                  >
                    <View style={styles.optionContent}>
                      <Feather name="flag" size={20} color="#FFA500" />
                      
                      <Text style={[styles.optionText, { color: '#FFA500' }]}>
                        דווח משתמש
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleBlockUser}
                  >
                    <View style={styles.optionContent}>
                      <Feather name="user-x" size={20} color="#FF3B30" />
                      <Text style={[styles.optionText, { color: '#FF3B30' }]}>
                        חסום משתמש
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default OtherUserProfileOptions;

const styles = StyleSheet.create({
  optionsButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
  },
  optionContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
  },
});
