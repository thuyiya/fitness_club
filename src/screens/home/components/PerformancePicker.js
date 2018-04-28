import React, { Component } from 'react';
import { 
  Text,
  View,
  Image,
} from 'react-native';

export default class PerformancePicker extends Component {
  render() {
    return (
    // should sort by order
      <View
        style={{ backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between' }}
      >
        {this.props.data.map((item, i) => (
          <View style={{ padding: 20, alignItems: 'center' }} key={i}>
            <Image style={{ width: 80, height: 80 }} source={{ uri: item.iconUrl }} />
            <Text style={{ width: 80, color: '#079992', textAlign: 'center', paddingTop: 20, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
          </View>
        ))}
      </View>
    );
  }
}
