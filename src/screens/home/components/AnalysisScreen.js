import React, { Component } from 'react';
import { Text, ImageBackground, View, Dimensions } from 'react-native';
import ButtonCustom from '../../../components/ButtonCustom';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default class Analysis extends Component {
    state = {}
    render() {
      return (
        <View>
          <View>
            <ImageBackground
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT / 2, justifyContent: 'center' }}
              source={require('../../../../assets/img/bg_daily_dose.png')}
            >
              <View style={{ paddingLeft: 40 }}>
                <Text style={{ paddingBottom: 20, color: '#fff', fontSize: 28, fontWeight: '500' }}>Daily Dose</Text>
                <Text style={{ paddingBottom: 10, color: '#fff', fontSize: 36, fontWeight: '600' }}>Post Game Analysis</Text>
                <Text style={{ paddingBottom: 10, color: '#fff', fontSize: 24, fontWeight: '300' }}>

                                Coping and learning
                            from mistakes
                </Text>
                <ButtonCustom text="Start" invert />
              </View>
            </ImageBackground>
          </View>
          <View style={{
            height: SCREEN_HEIGHT / 2,
            backgroundColor: '#fff',
          }}
          >
            <Text>Let your Coach know what you've been up to</Text>
            <ButtonCustom text="Update Them" />
          </View>
        </View>
      );
    }
}
