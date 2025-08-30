import React from 'react';
import {
    Dimensions,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface ImageViewerModalProps {
  isVisible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isVisible, imageUrl, onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.container}>
          <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
            
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ImageViewerModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(0, 0, 0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height,
  },
});