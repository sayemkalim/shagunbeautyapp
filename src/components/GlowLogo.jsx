import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import colors from '../theme/colors';

function Sparkle({ size, style }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      pointerEvents="none">
      <Path
        d="M12 0c.7 4.6 2.4 8.5 5 11.1 2.6 2.6 6.5 4.3 11 5-4.5.7-8.4 2.4-11 5-2.6 2.6-4.3 6.5-5 11-.7-4.5-2.4-8.4-5-11-2.6-2.6-6.5-4.3-11-5 4.5-.7 8.4-2.4 11-5C9.6 8.5 11.3 4.6 12 0Z"
        fill={colors.primary}
      />
    </Svg>
  );
}

// Approximation of the "Glow" wordmark — the source design uses a bespoke
// script logotype that isn't a system font, so this recreates the look
// (bold italic serif + sparkle accents) rather than pixel-matching it.
export default function GlowLogo({ size = 40 }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.wordmark, { fontSize: size }]}>Glow</Text>
      <Sparkle size={size * 0.28} style={[styles.sparkle, { top: -size * 0.18, left: size * 0.98 }]} />
      <Sparkle size={size * 0.16} style={[styles.sparkle, { top: size * 0.5, left: size * 1.32 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    flexDirection: 'row',
  },
  wordmark: {
    color: colors.primary,
    fontWeight: '800',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  sparkle: {
    position: 'absolute',
  },
});
