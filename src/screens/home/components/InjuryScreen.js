import React, { Component } from 'react';
import { Text, View, Image, ScrollView } from 'react-native';
import ButtonCustom from '../../../components/ButtonCustom';
import DescriptionCard from '../../../components/DescriptionCard';
import { getIntensity } from '../../../uril';
import { COLOR } from '../../../styles';

const CardBackgroundImage = require('../../../../assets/img/bg_injury_prevention.png');

export default class InjuryScreen extends Component {
  renderInjurySection = () => (
    <ScrollView
      style={{ flex: 1 }}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={0.1}
    >
      {this.props.data.map((item, i) => (
        <View style={styles.injusryImageConainer} key={i}>
          <Image style={styles.injusryImage} source={{ uri: item.iconUrl }} />
          <Text style={styles.injusryText}>{item.name} {getIntensity(item.intensity)}</Text>
        </View>
      ))}
    </ScrollView>
  )

  render() {
    return (
      <View>
        <DescriptionCard
          image={CardBackgroundImage}
          buttonText={'Continue'}
          title="Lower Back"
          subTitle="Day 4 of 14"
          descritption="progressive strength"
        />
        <View style={styles.injuryContainer}>
          <Text style={styles.injuryTitle}>InjuryScreen</Text>
          {this.renderInjurySection()}
        </View>
        <View style={styles.screenContent}>
          <Text style={styles.contentTitle}>April 20, 2016</Text>
          <Text style={styles.contentDescription}>was your last Shoulder screen</Text>
          <ButtonCustom text="Screen Again" />
        </View>
      </View>
    );
  }
}

const styles = {
  injuryContainer: {
    padding: 20,
    backgroundColor: COLOR.lightGray,
  },
  injuryTitle: {
    paddingTop: 10,
    fontSize: 20,
    fontWeight: '500',
  },
  screenContent: {
    padding: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTitle: {
    fontSize: 36,
    fontWeight: '700',
    paddingBottom: 10,
  },
  contentDescription: {
    fontSize: 18,
    fontWeight: '500',
    paddingBottom: 40,
  },
  injusryImageConainer: { 
    padding: 15, 
  },
  injusryImage: { 
    backgroundColor: '#fff', 
    width: 140, 
    height: 100, 
  },
  injusryText: { 
    paddingTop: 20, 
    fontSize: 16, 
    fontWeight: '700',
  },
};
