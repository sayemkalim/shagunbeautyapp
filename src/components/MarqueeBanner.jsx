import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  AppState,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import fonts from '../theme/typography';
import colors from '../theme/colors';
import { moderateScale } from '../theme/responsive';
import { useMarquee } from '../hooks/useMarquee';

export default function MarqueeBanner({
  items,
  speed = 36, // pixels per second for a smooth readable scroll
  backgroundColor = '#d6b3f8ff',
  borderColor = '#EDE9FE',
  textColor = '#334155',
  separator = '•',
  separatorColor = colors.primary || '#7209B7',
  onPress,
  style,
  textStyle,
}) {
  const isFocused = useIsFocused();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);

  // Fetch active marquee texts from public API endpoint /api/marquee/active if items prop not provided
  const { data: fetchedMarquees = [] } = useMarquee();

  // Extract dynamic items from prop or API (no hardcoded fallback)
  const finalItems = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
    if (Array.isArray(fetchedMarquees) && fetchedMarquees.length > 0) {
      const texts = [];
      fetchedMarquees.forEach((m) => {
        const raw = typeof m === 'string' ? m : m?.text;
        if (raw && typeof raw === 'string') {
          if (raw.includes('•') || raw.includes('●')) {
            const separatorChar = raw.includes('•') ? '•' : '●';
            raw.split(separatorChar).forEach((part) => {
              const trimmed = part.trim();
              if (trimmed) texts.push(trimmed);
            });
          } else {
            const trimmed = raw.trim();
            if (trimmed) texts.push(trimmed);
          }
        }
      });
      return texts;
    }
    return [];
  }, [items, fetchedMarquees]);

  // Guarantee enough items inside each block so the block width is comfortably larger than screen width
  const repeatedItems = useMemo(() => {
    if (!finalItems || finalItems.length === 0) return [];
    let result = [...finalItems];
    while (result.length < 6) {
      result = result.concat(finalItems);
    }
    return result;
  }, [finalItems]);

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

  // If there are no active marquee items from the API/props, do not render (no hardcoded text)
  if (!finalItems || finalItems.length === 0) {
    return null;
  }

  const renderContent = (prefix) => (
    <View style={styles.contentRow}>
      {repeatedItems.map((text, idx) => (
        <View key={`${prefix}-${idx}`} style={styles.itemWrapper}>
          <Text style={[styles.text, { color: textColor }, textStyle]}>
            {text}
          </Text>
          <Text style={[styles.separator, { color: separatorColor }]}>
            {separator}
          </Text>
        </View>
      ))}
    </View>
  );

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor, borderTopColor: borderColor, borderBottomColor: borderColor },
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
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: moderateScale(36),
    overflow: 'hidden',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
  text: {
    fontSize: moderateScale(11.5),
    fontFamily: fonts.big,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  separator: {
    fontSize: moderateScale(11),
    marginHorizontal: 12,
    fontWeight: 'bold',
  },
});
