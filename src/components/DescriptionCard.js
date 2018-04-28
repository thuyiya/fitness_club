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
      <ImageBackground
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT / 2, justifyContent: 'center' }}
        source={image}
      >
        <View style={{ paddingLeft: 40 }}>
          <Text style={{ paddingBottom: 20, color: '#fff', fontSize: 28, fontWeight: '500' }}>{subTitle}</Text>
          <Text style={{ paddingBottom: 10, color: '#fff', fontSize: 36, fontWeight: '600' }}>{title}</Text>
          <Text style={{ paddingBottom: 10, color: '#fff', fontSize: 24, fontWeight: '300' }}>
            {descritption}
          </Text>
        </View>
        <ButtonCustom text={buttonText} invert onPress={onButtonPress} />
      </ImageBackground>
    </View>
  );

export default DescriptionCard;
