import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getImageSource } from '../utils/imageOptimizer';

const DUMMY_IMG = require('../../assets/dummy_product.png');

export default function BrandMarqueeBanner({
  brands = [],
  speed = 28, // pixels per second for smooth, readable scrolling
  gradientColors = ['#FAF5FF', '#F3E8FF', '#FAF5FF'],
  borderColor = '#E9D5FF',
  style,
}) {
  const isFocused = useIsFocused();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);

  // Prepare brands list: prioritize brands with logos, plus '& MANY MORE...' at the end
  const sequenceItems = useMemo(() => {
    if (!Array.isArray(brands) || brands.length === 0) return [];

    const withLogos = [];
    const withoutLogos = [];

    brands.forEach((b) => {
      if (!b || !b.name || !b.name.trim()) return;
      const hasLogo = !!(b.images?.[0] || b.logo || b.image);
      if (hasLogo) {
        withLogos.push(b);
      } else {
        withoutLogos.push(b);
      }
    });

    const orderedBrands = [...withLogos, ...withoutLogos];
    if (orderedBrands.length === 0) return [];

    // Map into sequence items and add '& MANY MORE...' at the end
    const items = orderedBrands.map((b) => ({
      type: 'brand',
      id: b._id || b.id || b.name,
      name: b.name.trim(),
      logoUri: b.images?.[0] || b.logo || b.image || null,
      brand: b,
    }));

    items.push({
      type: 'more',
      id: 'and-many-more',
      name: '& MANY\nMORE...',
    });

    return items;
  }, [brands]);

  // Guarantee enough items inside each block so the block width is comfortably larger than screen width
  const repeatedItems = useMemo(() => {
    if (sequenceItems.length === 0) return [];
    let result = [...sequenceItems];
    while (result.length < 8) {
      result = result.concat(sequenceItems);
    }
    return result;
  }, [sequenceItems]);

  const startMarquee = useCallback(() => {
    if (contentWidth <= 0) return;

    if (animRef.current) {
      animRef.current.stop();
    }

    animatedValue.setValue(0);
    const duration = (contentWidth / speed) * 1000;

    animRef.current = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: -contentWidth,
        duration: Math.max(duration, 1000),
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animRef.current.start();
  }, [contentWidth, speed, animatedValue]);

  // Restart animation when contentWidth changes or screen gains focus
  useEffect(() => {
    if (isFocused && contentWidth > 0 && repeatedItems.length > 0) {
      startMarquee();
    } else if (animRef.current) {
      animRef.current.stop();
    }

    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [contentWidth, isFocused, startMarquee, repeatedItems.length]);

  // Handle app minimizing and coming back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isFocused && contentWidth > 0 && repeatedItems.length > 0) {
        startMarquee();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isFocused, contentWidth, startMarquee, repeatedItems.length]);

  const handleLayout = (e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && Math.abs(w - contentWidth) > 1) {
      setContentWidth(w);
    }
  };

  if (sequenceItems.length === 0) {
    return null;
  }

  const renderItem = (item, prefix, idx) => {
    if (item.type === 'more') {
      return (
        <View key={`${prefix}-more-${idx}`} style={styles.itemWrapper}>
          <View style={styles.moreItem}>
            <Text style={styles.moreText}>{item.name}</Text>
          </View>
          <View style={styles.verticalDivider} />
        </View>
      );
    }

    return (
      <View key={`${prefix}-${item.id}-${idx}`} style={styles.itemWrapper}>
        <View style={styles.brandItem}>
          {item.logoUri ? (
            <Image
              source={getImageSource(item.logoUri, 'BRAND_LOGO', DUMMY_IMG)}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          ) : (
            <Text numberOfLines={1} style={styles.brandNameText}>
              {item.name.toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.verticalDivider} />
      </View>
    );
  };

  const renderContent = (prefix) => (
    <View style={styles.contentRow}>
      {repeatedItems.map((item, idx) => renderItem(item, prefix, idx))}
    </View>
  );

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.container,
        { borderTopColor: borderColor, borderBottomColor: borderColor },
        style,
      ]}>
      <Animated.View
        style={[
          styles.marqueeTrack,
          {
            transform: [{ translateX: animatedValue }],
          },
        ]}>
        {/* Block 1: Measured */}
        <View onLayout={handleLayout} style={styles.block}>
          {renderContent('b1')}
        </View>
        {/* Block 2: Seamless duplicate */}
        <View style={styles.block}>
          {renderContent('b2')}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: moderateScale(56),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  marqueeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandItem: {
    height: moderateScale(54),
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: moderateScale(98),
    height: moderateScale(38),
  },
  brandNameText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1E1B4B',
    letterSpacing: 1.1,
  },
  moreItem: {
    height: moderateScale(54),
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: moderateScale(10.5),
    fontFamily: fonts.big,
    color: '#1E1B4B',
    textAlign: 'center',
    letterSpacing: 0.8,
    lineHeight: moderateScale(14),
  },
  verticalDivider: {
    width: 1,
    height: moderateScale(30),
    backgroundColor: '#DDD6FE',
  },
});
