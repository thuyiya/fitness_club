import React from 'react';
import { 
  View, ImageBackground, Text, Dimensions,
} from 'react-native';

import ButtonCustom from './ButtonCustom';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const DescriptionCard = ({
  onButtonPress,
  buttonText,
  image, 
  title,
  descritption,
  subTitle,
}) => 
  (
    <View>
      <ImageBackground style={styles.image} source={image} >
        <View style={{ paddingLeft: 40 }}>
          <Text style={styles.subTitle}>{subTitle}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.descritption}>{descritption}</Text>
        </View>
        <ButtonCustom text={buttonText} invert onPress={onButtonPress} />
      </ImageBackground>
    </View>
  );

export default DescriptionCard;

const styles = {
  image: { 
    width: SCREEN_WIDTH, 
    height: SCREEN_HEIGHT / 2, 
    justifyContent: 'center', 
  },
  subTitle: { 
    paddingBottom: 20, 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: '500', 
  },
  title: { 
    paddingBottom: 10, 
    color: '#fff', 
    fontSize: 36, 
    fontWeight: '600', 
  },
  descritption: { 
    paddingBottom: 10, 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: '300', 
  },
};
