import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { ProgressCircle } from 'react-native-svg-charts';

import ButtonCustom from '../../../components/ButtonCustom';

export default class SessionsCircularChart extends Component {
  render() {
    return (
      <View style={{ backgroundColor: '#fff', padding: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#000', paddingTop: 10, paddingBottom: 20 }}>Mental Performance Progress</Text>
        <View style={{ padding: 20 }}>
          <View style={{ position: 'absolute', top: 300 / 2, alignSelf: 'center', alignContent: 'center', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', width: 220 }}>
              <Text style={{ fontSize: 58, fontWeight: '800', marginLeft: 25 }}>4</Text>
              <Text style={{ fontSize: 26, fontWeight: '600' }}>sessions completed</Text>
            </View>
            <Text>Goal: 6 sessions</Text>
          </View>
          <ProgressCircle
            style={{ height: 340 }}
            progress={0.7}
            strokeWidth={20}
            backgroundColor={'#fdf5de'}
            progressColor={'#f6c84b'}
            {...this.props}
          />
        </View>
        <ButtonCustom text="Take Next Session" />
      </View>
    );
  }
}
