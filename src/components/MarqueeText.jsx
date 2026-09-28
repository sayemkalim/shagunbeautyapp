import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * MarqueeText
 * Automatically scrolls text continuously in a single line without wrapping
 * and without displaying an ellipsis (...) when the text exceeds the threshold or container width.
 *
 * Props:
 * @param {string} text - The text string to display.
 * @param {object} style - TextStyle for the text.
 * @param {object} containerStyle - ViewStyle for outer clipping container.
 * @param {number} threshold - Character length threshold to trigger marquee (default: 18).
 * @param {number} speed - Pixels per second scrolling speed (default: 36).
 * @param {number} delay - Initial pause before scrolling starts in ms (default: 1500).
 * @param {number} spacing - Gap between repeating text instances in px (default: 36).
 */
export default function MarqueeText({
  text = '',
  style,
  containerStyle,
  threshold = 18,
  speed = 36,
  delay = 1500,
  spacing = 36,
}) {
  const isFocused = useIsFocused?.() ?? true;
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const animatedX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const cleanText = typeof text === 'string' ? text.trim() : String(text || '');
  const isOverLength = cleanText.length > threshold;
  const isOverWidth = containerWidth > 0 && contentWidth > 0 && contentWidth > containerWidth;
  const shouldScroll = Boolean(cleanText && (isOverLength || isOverWidth));

  const startAnimation = useCallback(() => {
    if (!shouldScroll || contentWidth <= 0) return;

    if (animationRef.current) {
      animationRef.current.stop();
    }

    animatedX.setValue(0);
    const duration = (contentWidth / speed) * 1000;

    animationRef.current = Animated.loop(
      Animated.sequence([
        // Initial pause so user can easily read the beginning of the title
        Animated.delay(delay),
        Animated.timing(animatedX, {
          toValue: -contentWidth,
          duration: Math.max(duration, 1500),
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    animationRef.current.start();
  }, [shouldScroll, contentWidth, speed, delay, animatedX]);

  useEffect(() => {
    if (isFocused && shouldScroll && contentWidth > 0) {
      startAnimation();
    } else {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      animatedX.setValue(0);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isFocused, shouldScroll, contentWidth, cleanText, startAnimation, animatedX]);

  const onContainerLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  };

  const handleBlockLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - contentWidth) > 2) {
      setContentWidth(w);
    }
  };

  return (
    <View
      style={[styles.container, containerStyle]}
      onLayout={onContainerLayout}>
      {shouldScroll ? (
        <Animated.View
          style={[
            styles.animatedRow,
            { transform: [{ translateX: animatedX }] },
          ]}>
          {/* Block 1: Measured single line */}
          <View onLayout={handleBlockLayout} style={styles.block}>
            <Text
              style={[style, styles.marqueeText]}
              numberOfLines={1}
              ellipsizeMode="clip">
              {cleanText}
            </Text>
            <View style={{ width: spacing }} />
          </View>

          {/* Block 2: Seamless duplicate in single line */}
          <View style={styles.block}>
            <Text
              style={[style, styles.marqueeText]}
              numberOfLines={1}
              ellipsizeMode="clip">
              {cleanText}
            </Text>
            <View style={{ width: spacing }} />
          </View>
        </Animated.View>
      ) : (
        <View onLayout={handleBlockLayout} style={styles.staticWrapper}>
          <Text
            style={[style, styles.singleLine]}
            numberOfLines={1}
            ellipsizeMode="clip">
            {cleanText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    height: 32,
  },
  animatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minWidth: 5000,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  marqueeText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  staticWrapper: {
    justifyContent: 'center',
  },
  singleLine: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
