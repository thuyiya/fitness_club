import React, { Component } from 'react';
import { Text, Dimensions, View, Image, ScrollView } from 'react-native';
import ButtonCustom from '../../../components/ButtonCustom';
import DescriptionCard from '../../../components/DescriptionCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const data = [
  {
    name: 'Hip',
    iconUrl: 'https://s3-us-east-2.amazonaws.com/zonein.assets/images/body-parts/NEWHip.png',
    id: '5a148ae1b101ad66fdc76bca',
    verticalId: '5a0425ee8b2ec888576425d4',
    intensity: 1,
  },
  {
    name: 'Quadricep',
    iconUrl: 'https://s3-us-east-2.amazonaws.com/zonein.assets/images/body-parts/NEWQuadricep.png',
    id: '5a412338e704aa1ccc566a76',
    verticalId: '5a0425ee8b2ec888576425d4',
    intensity: 2,
  },
  {
    name: 'Hamstring',
    iconUrl: 'https://s3-us-east-2.amazonaws.com/zonein.assets/images/body-parts/NEWHamstring.png',
    id: '5a412574e704aa1ccc566a78',
    verticalId: '5a0425ee8b2ec888576425d4',
    intensity: 3,
  },
];

export default class InjuryScreen extends Component {
  getIntensity = (value) => {
    let state = 'NORMAL';
    let color = '#000';
    
    if (value > 2) {
      state = 'HIGH';
      color = 'red';
    } else {
      state = 'STABLE';
      color = '#2cb929';
    }
    
    return (
      <Text style={{ color, fontSize: 16, fontWeight: '800' }}>{state}</Text>
    );
  }

  renderInjurySection= () => (
    <ScrollView
      style={{ flex: 1 }}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={0.1}
    >
      {data.map((item, i) => (
        <View style={{ padding: 15 }} key={i}>
          <Image style={{ backgroundColor: '#fff', width: 140, height: 100 }} source={{ uri: item.iconUrl }} />
          <Text style={{ paddingTop: 20, fontSize: 16, fontWeight: '700' }}>Shoulder {this.getIntensity(item.intensity)}</Text>
        </View>
      ))}
    </ScrollView>
  )

  render() {
    return (
      <View>
        <DescriptionCard 
          image={require('../../../../assets/img/bg_injury_prevention.png')} 
          buttonText={'Continue'}
          title="Lower Back"
          subTitle="Day 4 of 14"
          descritption="progressive strength"
        />
        <View style={{ padding: 20, backgroundColor: '#f2f2f2' }}>
          <Text style={{ paddingTop: 10, fontSize: 20, fontWeight: '500' }}>InjuryScreen</Text>
          {this.renderInjurySection()}
        </View>
        <View style={{ padding: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 36, fontWeight: '700', paddingBottom: 10 }}>April 20, 2016</Text>
          <Text style={{ fontSize: 18, fontWeight: '500', paddingBottom: 40 }}>was your last Shoulder screen</Text>
          <ButtonCustom text="Screen Again" />
        </View>
      </View>
    );
  }
}
