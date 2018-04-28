import React, { Component } from 'react';
import { Text, View } from 'react-native';

import { COLOR } from '../../../styles';

import BarChart from '../../../components/BarChart';
import ButtonCustom from '../../../components/ButtonCustom';

export default class NutritionsBarChart extends Component {
    state = { }
    render() {
      return (
        <View style={styles.container}>
          <Text style={styles.titleText}>Performance Nutrition Coahing</Text>
          <Text style={styles.goalText}>Goal: {this.props.data.goal || 0} meals</Text>
          <View style={{ paddingBottom: 10 }}>
            <BarChart
              data={this.props.data.dailyMeals}
              height={300}
              max={this.props.data.goal}
            />
            <View>
              <View style={styles.horizantalLine} />
              <Text style={styles.lableOnLine}>Last 7 Days</Text>
            </View>
          </View>
          <Text style={styles.totalText}>Total: {this.props.data.totalMeals} meals</Text>
          <ButtonCustom text="Get Next Meal" />
        </View>
      );
    }
}

const styles = {
  container: { 
    backgroundColor: COLOR.lightGray, 
    padding: 30, 
  },
  titleText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#000', 
    paddingTop: 10, 
    paddingBottom: 20, 
  },
  goalText: { 
    padding: 10,
    fontSize: 36, 
    fontWeight: '700', 
    alignSelf: 'center', 
  },
  horizantalLine: {
    borderBottomColor: 'gray',
    borderBottomWidth: 1,
  },
  lableOnLine: { 
    position: 'absolute',
    top: -16,
    backgroundColor: COLOR.lightGray,
    padding: 5,
    color: COLOR.gray, 
    fontSize: 18, 
    fontWeight: '600', 
    alignSelf: 'center', 
  },
  totalText: { 
    fontSize: 28, 
    padding: 20, 
    color: COLOR.gray,
    alignSelf: 'center', 
  },
};
