import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Baseline design dimensions (standard ~5.8" phone, e.g. iPhone 11/X / 375dp)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Cap the scale factor so UI doesn't blow up on wide screens or tablets
export const scale = (size) => {
  const ratio = width / guidelineBaseWidth;
  return Math.min(Math.max(ratio, 0.85), 1.25) * size;
};

export const verticalScale = (size) => {
  const ratio = height / guidelineBaseHeight;
  return Math.min(Math.max(ratio, 0.85), 1.25) * size;
};

// factor controls how aggressively size grows on larger screens (0 = no scaling, 1 = full linear scaling)
// Using 0.35 factor provides perfect, subtle scaling without causing text overflow on large screens
export const moderateScale = (size, factor = 0.35) => {
  const scaled = size + (scale(size) - size) * factor;
  return Math.round(scaled * 10) / 10;
};

export const moderateVerticalScale = (size, factor = 0.35) => {
  const scaled = size + (verticalScale(size) - size) * factor;
  return Math.round(scaled * 10) / 10;
};

export default moderateScale;

