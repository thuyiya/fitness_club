import React from 'react';

import { 
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';

const ButtonCustom = ({ invert, text, onPress }) =>
  (
    <TouchableOpacity style={[styles.buttonContainer, { backgroundColor: invert ? '#fff' : '#0abde3' }]} onPress={onPress}>
      <Text style={[styles.text, { color: invert ? '#5ad0ea' : '#fff' }]}>{text}</Text>
      <Image 
        source={invert ? require('../../assets/img/arrow_blue.png') : require('../../assets/img/arrow_white.png')} 
        style={styles.imageIcon}
      />
    </TouchableOpacity>
  );

export default ButtonCustom;

const styles = {
  buttonContainer: {
    flexDirection: 'row',
    height: 40,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 20, 
    alignSelf: 'center',
  },
  text: { 
    alignSelf: 'center',
    fontWeight: '700', 
    fontSize: 20, 
    paddingRight: 10,
  },
  imageIcon: {
    alignSelf: 'center',
    width: 6,
    height: 10,
  },
};
