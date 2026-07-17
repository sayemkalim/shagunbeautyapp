import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import colors from '../theme/colors';

// Stands in for the real onboarding photo until that asset is dropped into
// assets/. Swap this component out for an <Image> once it's available.
export default function PlaceholderPortrait() {
  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F3DAD3" />
            <Stop offset="1" stopColor="#E9C3B8" />
          </LinearGradient>
        </Defs>
        <Rect width="400" height="600" fill="url(#bg)" />
        <Path
          d="M200 170c46 0 84 40 84 96 0 70-40 132-84 132s-84-62-84-132c0-56 38-96 84-96Z"
          fill="#F6E6E0"
          opacity={0.55}
        />
        <Path
          d="M120 600c6-72 40-118 80-118s74 46 80 118"
          fill="#F6E6E0"
          opacity={0.55}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.onboardingBackground,
    overflow: 'hidden',
  },
});
