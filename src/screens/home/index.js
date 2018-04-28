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

const INJUSRY_DATA = [
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

const NUTRITION_DATA = {
  goal: 15,
  dailyMeals: [1, 4, 8, 5, 10, 0, 11],
  totalMeals: 34,
};

const SESSIONS_DATA = {
  completed: 4,
  goal: 6,
};

export default class Home extends Component {
    state = { }
    render() {
      return (
        <View style={{ flex: 1 }}>
          <ScrollView>
            <PerformancePicker data={DATA} />
            <NutritionsBarChart data={NUTRITION_DATA} />
            <SessionsCircularChart data={SESSIONS_DATA} />
            <InjuryScreen data={INJUSRY_DATA} />
            <AnalysisScreen />
          </ScrollView>
        </View>
      );
    }
}
