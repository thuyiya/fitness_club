import React, { Component } from 'react';
import { Text, ImageBackground, View, Dimensions } from 'react-native';
import ButtonCustom from '../../../components/ButtonCustom';
import DescriptionCard from '../../../components/DescriptionCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default class Analysis extends Component {
    state = {}
    render() {
      return (
        <View>
          <DescriptionCard 
            image={require('../../../../assets/img/bg_daily_dose.png')} 
            buttonText={'Start'}
            title="Post Game Analysis"
            subTitle="Daily Dose"
            descritption="Coping and learning from mistakes"
          />
          <View style={{ padding: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ paddingBottom: 20, fontSize: 26, fontWeight: '600', textAlign: 'center' }}>Let your Coach know what you've been up to</Text>
            <ButtonCustom text="Update Them" />
          </View>
        </View>
      );
    }
}
