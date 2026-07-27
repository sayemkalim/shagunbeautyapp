import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export function Skeleton({ width = '100%', height = 14, radius = 8, fillParent = false, style }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 350],
  });

  const sizeStyle = fillParent ? null : { width, height };

  return (
    <View style={[styles.base, sizeStyle, { borderRadius: radius, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }, { skewX: '-20deg' }],
          },
        ]}>
        <LinearGradient
          colors={['#EFE5FD', '#FDFBFF', '#EFE5FD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

export function ProductCardSkeleton({ cardWidth }) {
  return (
    <View style={[styles.productCard, cardWidth ? { width: cardWidth } : null]}>
      <Skeleton width="100%" height={180} radius={16} />
      <Skeleton width="40%" height={12} radius={6} style={{ marginTop: 10 }} />
      <Skeleton width="90%" height={12} radius={6} style={{ marginTop: 6 }} />
      <Skeleton width="60%" height={12} radius={6} style={{ marginTop: 6 }} />
      <Skeleton width="50%" height={16} radius={6} style={{ marginTop: 10 }} />
      <Skeleton width="100%" height={34} radius={10} style={{ marginTop: 10 }} />
    </View>
  );
}

export function AddressCardSkeleton() {
  return (
    <View style={styles.addressCard}>
      <Skeleton width="50%" height={14} radius={5} />
      <Skeleton width="90%" height={11} radius={5} style={{ marginTop: 10 }} />
      <Skeleton width="70%" height={11} radius={5} style={{ marginTop: 6 }} />
      <Skeleton width="40%" height={11} radius={5} style={{ marginTop: 8 }} />
    </View>
  );
}

export function OrderCardSkeleton() {
  return (
    <View style={styles.orderCard}>
      {/* Header */}
      <View style={styles.orderCardHeader}>
        <View>
          <Skeleton width={120} height={14} radius={6} />
          <Skeleton width={80} height={10} radius={4} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={70} height={20} radius={6} />
      </View>
      <View style={styles.divider} />
      {/* Body */}
      <View style={styles.orderCardBody}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width={60} height={60} radius={12} />
          <Skeleton width={60} height={60} radius={12} />
        </View>
      </View>
      <View style={styles.divider} />
      {/* Footer */}
      <View style={styles.orderCardFooter}>
        <Skeleton width={60} height={12} radius={4} />
        <Skeleton width={90} height={16} radius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#F3E8FF',
  },
  productCard: {
    padding: 4,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    padding: 16,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardBody: {
    paddingVertical: 12,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});

export default Skeleton;
