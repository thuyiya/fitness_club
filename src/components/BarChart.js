import React, { Component } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
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
    color: '#000', 
  };

  const detailText = () => ((active & height > -1 & Platform.OS === 'ios') ? <Text style={tabDescription}>{detail}</Text> : null);
  const verticalLineView = () => ((active & height > -1) ? <View style={[verticalLine, Platform.OS !== 'ios' ? { left: 10 } : {}]} /> : null);
  
  const inAndroid = () => (
    (active & height > -1) ?
      <View style={{ position: 'relative', width: 30 }}>
        <Text style={{ fontSize: 11, textAlign: 'center' }}>Today 0 meals</Text>
      </View> : <View style={{ paddingTop: 40 }} />
  );
  
  return (
    <View>
      {detailText()}
      {Platform.OS !== 'ios' ? inAndroid() : null}
      {verticalLineView()} 
      <View style={style}>
        <View style={fillStyle} />
      </View>
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
                <Bar height={220 * (item / this.props.max)} active={i === this.state.currentIndex} detail={`${i == this.props.data.length - 1 ? 'Today' : ''} ${item} meals`} /> 
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }
}
