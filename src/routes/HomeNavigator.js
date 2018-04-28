import { YellowBox } from 'react-native';
import { StackNavigator, TabNavigator } from 'react-navigation';

import Home from '../screens/home/';
import Session from '../screens/session';

// this for untill react fixed thire issue
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader']);

const HomeStack = StackNavigator({
  Home: { 
    screen: Home,
    // navigationOptions: ({ navigation }) => ({
    //     title: `${navigation.state.params.name}'s Profile'`,
    //   }),
    navigationOptions: {
      title: 'Hey, James!',
      headerStyle: {
        backgroundColor: '#0abde3',
      },
      headerTitleStyle: {
        color: '#fff',
      },
    }, 
  },
  Session: { screen: Session },
});

export default TabNavigator(
  {
    Home: { screen: HomeStack },
    Settings: { screen: Home },
  }
);
