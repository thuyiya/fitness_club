import React, { Component } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

import BarChart from '../../components/BarChart';

export default class Home extends Component {
    state = { }
    render() {
      return (
        <View style={{ flex: 1, padding: 40 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#000', paddingTop: 10, paddingBottom: 20 }}>Performance Nutrition Coahing</Text>
          <Text style={{ padding: 10, fontSize: 36, fontWeight: '700', alignSelf: 'center' }}>Goal: 15 meals</Text>
          <View style={{ paddingBottom: 10 }}>
            <BarChart
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
                backgroundColor: '#fff',
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
          <TouchableOpacity style={{ backgroundColor: 'gray', padding: 10, borderRadius: 20, alignSelf: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>Get Next Meal</Text>
          </TouchableOpacity>
        </View>
      );
    }
}
