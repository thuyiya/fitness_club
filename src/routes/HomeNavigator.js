import React from 'react';
import { Image, YellowBox, View } from 'react-native';
import { StackNavigator, TabNavigator } from 'react-navigation';

import Empty from '../screens/empty';
import Home from '../screens/home/';
import Session from '../screens/session';

// this for untill react fixed thire issue
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader']);

const tabBar = TabNavigator(
  {
    Foods: { 
      screen: Empty,
      navigationOptions: {
        tabBarIcon: (data) => <Image style={{ width: 40, height: 40, tintColor: data.tintColor }} source={require('../../assets/img/restaurant.png')} />,
      }, 
    },
    Reports: { 
      screen: Empty,
      navigationOptions: {
        tabBarIcon: (data) => <Image style={{ width: 40, height: 40, tintColor: data.tintColor }} source={require('../../assets/img/reports.png')} />,
      }, 
    },
    Home: { 
      screen: Home,
      navigationOptions: {
        tabBarIcon: (data) => <Image style={{ width: 70, height: 70, tintColor: data.tintColor }} source={require('../../assets/img/spiral.png')} />,
      }, 
    },
    Meditation: { 
      screen: Empty,
      navigationOptions: {
        tabBarIcon: (data) => <Image style={{ width: 40, height: 40, tintColor: data.tintColor }} source={require('../../assets/img/yoga.png')} />,
      }, 
    },
    Profile: { 
      screen: Empty,
      navigationOptions: {
        tabBarIcon: (data) => <Image style={{ width: 40, height: 40, tintColor: data.tintColor }} source={require('../../assets/img/user.png')} />,
      }, 
    },
  }, {
    initialRouteName: 'Home',
    tabBarOptions: {
      showLabel: false,
      inactiveTintColor: '#dfe6e9',
      activeTintColor: '#fff',
      //   activeBackgroundColor: '#0abde3',
      style: {
        backgroundColor: '#5ad0ea',
        borderTopColor: 'transparent',
      },
    },
      
  }
);

export default StackNavigator({
  Home: { 
    screen: tabBar,
    // navigationOptions: ({ navigation }) => ({
    //     title: `${navigation.state.params.name}'s Profile'`,
    //   }),
    navigationOptions: {
      title: 'Hey, James!',
      headerStyle: {
        backgroundColor: '#5ad0ea',
        borderBottomColor: 'transparent',
      },
      headerRight: <View style={{ padding: 20 }}><Image style={{ width: 25, height: 25 }} source={require('../../assets/img/ring.png')} /></View>,
      headerTitleStyle: {
        color: '#fff',
      },
    }, 
  },
  Session: { screen: Session },
}, {
  mode: 'modal',
});
