import React from 'react';
import { Text } from 'react-native';

export const getIntensity = (value) => {
  let state = 'NORMAL';
  let color = '#000';
    
  if (value > 2) {
    state = 'HIGH';
    color = 'red';
  } else {
    state = 'STABLE';
    color = '#2cb929';
  }
    
  return (
    <Text style={{ color, fontSize: 16, fontWeight: '800' }}>{state}</Text>
  );
};
