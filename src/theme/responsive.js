import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Baseline design dimensions (standard ~5.8" phone, e.g. iPhone 11/X)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size) => (height / guidelineBaseHeight) * size;

// factor controls how aggressively size grows on larger screens (0 = no scaling, 1 = full linear scaling)
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const moderateVerticalScale = (size, factor = 0.5) =>
  size + (verticalScale(size) - size) * factor;

export default moderateScale;
