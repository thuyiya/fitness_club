import React from 'react';
import { 
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';

import { COLOR } from '../styles';

const BLUE_ARROW_IMAGE = require('../../assets/img/arrow_blue.png');
const WHITE_ARROW_IMAGE = require('../../assets/img/arrow_white.png'); 

const ButtonCustom = ({ invert, text, onPress }) =>
  (
    <TouchableOpacity style={[styles.buttonContainer, { backgroundColor: invert ? '#fff' : COLOR.lightBlue }]} onPress={onPress}>
      <Text style={[styles.text, { color: invert ? COLOR.blue : '#fff' }]}>{text}</Text>
      <Image 
        source={invert ? BLUE_ARROW_IMAGE : WHITE_ARROW_IMAGE} 
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
