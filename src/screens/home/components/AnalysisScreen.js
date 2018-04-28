import React, { Component } from 'react';
import { Text, View } from 'react-native';
import ButtonCustom from '../../../components/ButtonCustom';
import DescriptionCard from '../../../components/DescriptionCard';

const CardBackgroundImage = require('../../../../assets/img/bg_daily_dose.png');

export default class Analysis extends Component {
    state = {}
    render() {
      return (
        <View>
          <DescriptionCard 
            image={CardBackgroundImage} 
            buttonText={'Start'}
            title="Post Game Analysis"
            subTitle="Daily Dose"
            descritption="Coping and learning from mistakes"
          />
          <View style={styles.statusContainer}>
            <Text style={styles.statesText}>Let your Coach know what you've been up to</Text>
            <ButtonCustom text="Update Them" />
          </View>
        </View>
      );
    }
}

const styles = {
  statusContainer: { 
    padding: 40, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  statesText: { 
    paddingBottom: 20, 
    fontSize: 26, 
    fontWeight: '600', 
    textAlign: 'center', 
  },
};
