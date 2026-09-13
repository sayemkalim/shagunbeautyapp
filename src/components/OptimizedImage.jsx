import React, { useState, useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { getImageSource } from '../utils/imageOptimizer';
import Skeleton from './Skeleton';

const DEFAULT_FALLBACK = require('../../assets/dummy_product.png');

/**
 * Performant image component that automatically applies Cloudinary optimization,
 * provides smooth skeleton loading placeholders, and handles error fallbacks.
 */
export default function OptimizedImage({
  source,
  preset = 'PRODUCT_CARD',
  defaultSource = DEFAULT_FALLBACK,
  style,
  imageStyle,
  resizeMode = 'cover',
  radius = 0,
  showSkeleton = true,
  fadeDuration = 200,
  onLoad,
  onError,
  accessibilityLabel,
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isLocalSource = typeof source === 'number';

  const resolvedSource = useMemo(() => {
    if (hasError) {
      return defaultSource || DEFAULT_FALLBACK;
    }
    return getImageSource(source, preset, defaultSource || DEFAULT_FALLBACK);
  }, [source, preset, defaultSource, hasError]);

  const handleLoad = (e) => {
    setLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    setLoaded(true);
    if (onError) onError(e);
  };

  const containerRadiusStyle = radius > 0 ? { borderRadius: radius, overflow: 'hidden' } : null;

  return (
    <View style={[style, containerRadiusStyle, styles.container]}>
      {showSkeleton && !loaded && !isLocalSource && (
        <Skeleton
          style={StyleSheet.absoluteFill}
          radius={radius}
          fillParent
        />
      )}
      <Image
        {...props}
        source={resolvedSource}
        defaultSource={defaultSource}
        style={[StyleSheet.absoluteFill, imageStyle]}
        resizeMode={resizeMode}
        fadeDuration={fadeDuration}
        onLoad={handleLoad}
        onError={handleError}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
});
