import React, { Component } from 'react';
import { Text, View } from 'react-native';

import BarChart from '../../../components/BarChart';
import ButtonCustom from '../../../components/ButtonCustom';

export default class NutritionsBarChart extends Component {
    state = { }
    render() {
      return (
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#000', paddingTop: 10, paddingBottom: 20 }}>Performance Nutrition Coahing</Text>
          <Text style={{ padding: 10, fontSize: 36, fontWeight: '700', alignSelf: 'center' }}>Goal: 15 meals</Text>
          <View style={{ paddingBottom: 10 }}>
            <BarChart
              data={[30, 53, 64, 0, 0, 9, 90]}
              min={0}
              max={30}
              width={20}
              height={300}
              current={10}
            />
            <View>
              <View
                style={{
                  borderBottomColor: 'gray',
                  borderBottomWidth: 1,
                }}
              />
              <Text style={{ 
                position: 'absolute',
                top: -16,
                backgroundColor: '#ecf0f1',
                padding: 5,
                color: '#000', 
                fontSize: 18, 
                fontWeight: '600', 
                alignSelf: 'center', 
              }}
              >Last 7 Days</Text>
            </View>
          </View>
          <Text style={{ fontSize: 28, padding: 20, alignSelf: 'center' }}>Total: 8 meals</Text>
          <ButtonCustom text="Get Next Meal" />
        </View>
      );
    }
}
