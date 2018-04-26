import React, { Component } from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';

const chart_data = {
  data: [30, 53, 64, 34, 14, 26, 77],
};

const Bar = ({ height, active }) => {
  const style = {
    backgroundColor: 'transparent',
    height: 300,
    width: 20,
    borderRadius: 100,
    padding: 1,
    position: 'relative',
  };
  
  const fillStyle = {
    backgroundColor: active ? '#f9ca24' : '#ffeaa7',
    borderRadius: 100,
    width: 20,
    position: 'absolute',
    bottom: 0,
    zIndex: 3,
    height,

  };
  
  return (
    <View>
      <View style={style}>
        <View style={fillStyle} />
      </View>
    </View>
  );
};

export default class BarChart extends Component {
    state = {
      currentIndex: 7,
    }
    render() {
      return (
        <View style={{ paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
          {chart_data.data.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => { this.setState({ currentIndex: i }); }}>
              <Bar height={300 * (item / 100)} active={i === this.state.currentIndex} />
            </TouchableOpacity>
          
          ))}
        </View>
      );
    }
}
