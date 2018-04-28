import React, { Component } from 'react';
import { View, Text } from 'react-native';

import ProgressCircle from '../../../components/ProgressCircle/ProgressCircle';

import { COLOR } from '../../../styles';

import ButtonCustom from '../../../components/ButtonCustom';

export default class SessionsCircularChart extends Component {
  render() {
    const { goal, completed } = this.props.data;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mental Performance Progress</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartDescriptionContent}>
            <View style={styles.mainDescription}>
              <Text style={styles.numberDescription}>{completed}</Text>
              <Text style={styles.textDescription}>sessions completed</Text>
            </View>
            <Text>Goal: {goal} sessions</Text>
          </View>
          <ProgressCircle
            style={{ height: 340 }}
            progress={completed / goal}
            strokeWidth={20}
            backgroundColor={COLOR.lightOrange}
            progressColor={COLOR.orange}
            {...this.props}
          />
        </View>
        <ButtonCustom text="Take Next Session" />
      </View>
    );
  }
}

const styles = {
  container: { 
    backgroundColor: '#fff', 
    padding: 30, 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#000', 
    paddingTop: 10, 
    paddingBottom: 20,
  },
  chartContainer: { 
    padding: 20, 
  },
  chartDescriptionContent: { 
    position: 'absolute', 
    top: 300 / 2, 
    alignSelf: 'center', 
    alignContent: 'center', 
    alignItems: 'center', 
  },
  mainDescription: { 
    flexDirection: 'row', 
    width: 220, 
  },
  numberDescription: { 
    fontSize: 58, 
    fontWeight: '800', 
    marginLeft: 25, 
  },
  textDescription: { 
    fontSize: 26, 
    fontWeight: '600', 
  },
};
