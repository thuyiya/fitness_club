import React, { Component } from 'react';
import { 
  Text,
  View,
  Image,
} from 'react-native';

import { COLOR } from '../../../styles';

export default class PerformancePicker extends Component {
  render() {
    return (
    // should sort by order
      <View style={styles.container}>
        {this.props.data.map((item, i) => (
          <View style={styles.imageContainer} key={i}>
            <Image style={styles.image} source={{ uri: item.iconUrl }} />
            <Text style={styles.imageDescriptionText}>{item.name}</Text>
          </View>
        ))}
      </View>
    );
  }
}

const styles = {
  container: { 
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  imageContainer: { 
    padding: 20, 
    alignItems: 'center' 
  },
  image: { 
    width: 80, 
    height: 80 
  },
  imageDescriptionText: { 
    width: 80, 
    color: COLOR.blueGray, 
    textAlign: 'center', 
    paddingTop: 15, 
    fontSize: 16, 
    fontWeight: '600'
   }
}
