import React, { Component } from 'react';
import { View, ScrollView } from 'react-native';

import PerformancePicker from './components/PerformancePicker';
import AnalysisScreen from './components/AnalysisScreen';
import InjuryScreen from './components/InjuryScreen';
import NutritionsBarChart from './components/NutritionsBarChart';
import SessionsCircularChart from './components/SessionsCircularChart';

const DATA = [{
  name: 'Nutrition',
  description: 'Nutrition coaching tailored to your body and needs ',
  iconUrl: 'https://s3-us-east-2.amazonaws.com/zonein.assets/images/verticals/nutrition.png',
  order: 1,
  screenName: 'MealFinder',
  createdAt: '2017-11-09T09:35:18.853Z',
  updatedAt: '2017-11-09T09:35:18.853Z',
  id: '5a042259a87283872edcde4c',
},
{
  name: 'Injury Prevention',
  description: 'Injury risk analytics and plans by Olympic experts ',
  iconUrl: 'https://s3-us-east-2.amazonaws.com/zonein.assets/images/verticals/injury.png',
  order: 2,
  screenName: 'InjurySelection',
  createdAt: '2017-11-09T09:51:42.689Z',
  updatedAt: '2017-11-09T09:51:42.689Z',
  id: '5a0425ee8b2ec888576425d4',
},
{
  name: 'Mental',
  description: 'Get in the zone with your pro performance coach ',
  iconUrl: 'https://s3-us-east-2.amazonaws.com/zonein.assets/images/verticals/mental.png',
  order: 3,
  screenName: 'FeaturedPrograms',
  createdAt: '2017-11-09T09:35:18.853Z',
  updatedAt: '2017-11-09T09:35:18.853Z',
  id: '5a042a52a004e60010c36e37',
},
];

export default class Home extends Component {
    state = { }
    render() {
      return (
        <View style={{ flex: 1 }}>
          <ScrollView>
            <PerformancePicker data={DATA} />
            <View style={{ padding: 30, backgroundColor: '#f2f2f2' }}>
              <NutritionsBarChart />
            </View>
            <SessionsCircularChart />
            <InjuryScreen />
            <AnalysisScreen />
          </ScrollView>
        </View>
      );
    }
}
