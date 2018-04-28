import React, { Component } from 'react';

import { 
  TouchableOpacity,
  Text,
  Image,
  View,
} from 'react-native';

class ButtonCustom extends Component {
  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={[styles.buttonContainer, { backgroundColor: this.props.invert ? '#fff' : '#0abde3' }]} onPress={this.props.onPress}>
          <Text style={[styles.text, { color: this.props.invert ? '#2980b9' : '#fff' }]}>{this.props.text}</Text>
          <Image 
            source={this.props.invert ? require('../../assets/img/arrow_blue.png') : require('../../assets/img/arrow_white.png')} 
            style={styles.imageIcon}
          />
        </TouchableOpacity>
      </View>
    );
  }
}

export default ButtonCustom;

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 20, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { 
    fontWeight: '700', 
    fontSize: 18, 
    paddingRight: 6,
  },
  imageIcon: {
    width: 10,
    height: 10,
  },
};
