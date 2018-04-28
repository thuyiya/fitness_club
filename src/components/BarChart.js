import React, { Component } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const OFFSET = 30;

const BAR_HEIGHT = ((SCREEN_WIDTH * 2) / 3) + OFFSET;

const Bar = ({ height, active, detail }) => {
  const style = {
    backgroundColor: 'transparent',
    height: BAR_HEIGHT,
    width: 20,
    borderRadius: 100,
    padding: 1,
    position: 'relative',
  };
  
  const fillStyle = {
    backgroundColor: active ? '#f6c84b' : '#ffeaa7',
    borderRadius: 100,
    width: 20,
    position: 'absolute',
    bottom: 10,
    zIndex: 0,
    height: height + OFFSET,
  };

  const verticalLine = {
    alignSelf: 'center', 
    position: 'absolute', 
    bottom: height + 45, 
    backgroundColor: 'gray', 
    width: 2, 
    height: Math.abs(BAR_HEIGHT - (height + (OFFSET * 2))),
  };

  const tabDescription = {
    alignSelf: 'center', 
    top: -20, 
    position: 'absolute', 
    width: 60, 
    height: 40, 
    textAlign: 'center', 
    zIndex: 999, 
    color: '#000', 
  };
  // { active && <Text style={{ position: 'absolute', left: -17, top: -40, width: 55, height: 40, textAlign: 'center', zIndex: 999 }}>Today 12 meals</Text>}
  return (
    <View style={style}>
      {(active & height > -1) && <Text style={tabDescription}>{detail}</Text>}
      {(active & height > -1) && <View style={verticalLine} />}
      <View style={fillStyle} />
    </View>
  );
};

export default class BarChart extends Component {
    state = {
      currentIndex: this.props.data.length - 1,
    }
    render() {
      const sampleData = [-30, -30, -30, -30, -30, -30, -30];
      if (this.props.data.length <= 7) {
        for (let i = 0; i < this.props.data.length; i++) {
          sampleData[i] = this.props.data[i];
        }
      }

      // shoud create get date by index

      return (
        <View style={{ paddingBottom: 30, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
          {sampleData.map((item, i) => (
            <View key={i} >
              <TouchableOpacity onPress={() => { this.setState({ currentIndex: i }); }}>
                <Bar height={220 * (item / this.props.max)} active={i === this.state.currentIndex} detail={`${i == 6 ? 'Today' : ''} ${item} meals`} /> 
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }
}
