import Slider from '@react-native-community/slider';
import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

interface Props {
  displayDistance: number;
  setDisplayDistance: (val: number) => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export default function DistanceFilterButton({ displayDistance, setDisplayDistance, visible, setVisible }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* לחיצה על הרקע תסגור את המודל */}
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        {/* התוכן של המודל – מוצג באמצע המסך למטה */}  
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 25,
          alignItems: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0
        }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20 }}>בחר מרחק להצגה</Text>
          <Text style={{ fontSize: 24, color: '#FF6F00', marginBottom: 20 }}>{displayDistance} קמ</Text>
          <Slider
            minimumValue={1}
            maximumValue={150}
            value={displayDistance}
            onValueChange={setDisplayDistance}
            step={1}
            minimumTrackTintColor="#FF6F00"
            maximumTrackTintColor="#d3d3d3"
            style={{ width: '100%' }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
            <Text>1 קמ</Text>
            <Text>150 קמ</Text>
          </View>
          <TouchableOpacity
            onPress={() => setVisible(false)}
            style={{ marginTop: 20, backgroundColor: '#FF6F00', padding: 12, borderRadius: 8, minWidth: 100 }}
          >
            <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>שמור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>


  );
}
