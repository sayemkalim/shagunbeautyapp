import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getImageSource } from '../utils/imageOptimizer';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { Skeleton } from './Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(155, Math.round(SCREEN_WIDTH * 0.39));
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = Math.round(BANNER_WIDTH / 2);
const DUMMY_IMG = require('../../assets/dummy_product.png');

function CardBannerSkeleton({ heading }) {
  return (
    <View style={styles.container}>
      {heading ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{heading}</Text>
        </View>
      ) : null}
      <View style={styles.cardSliderSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScrollContent}
          scrollEnabled={false}>
          {[1, 2, 3, 4].map((itemKey) => (
            <View key={`card-banner-skel-${itemKey}`} style={styles.skeletonCardWrapper}>
              <View style={styles.cardImageWrapper}>
                <Skeleton width="100%" height={155} radius={4} fillParent />
              </View>
              <View style={styles.cardInfoContainer}>
                <Skeleton width={75} height={14} radius={4} style={{ marginTop: 2 }} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export default function CardBannerSection({
  cardBanners = [],
  isLoading = false,
  refreshing = false,
  navigation,
  heading,
}) {
  const showSkeleton = isLoading || refreshing;

  // Extract section heading (from prop or from card banners items)
  const sectionHeading = useMemo(() => {
    if (heading && typeof heading === 'string' && heading.trim().length > 0) {
      return heading.trim();
    }
    if (Array.isArray(cardBanners)) {
      const found = cardBanners.find(
        (item) => item?.heading && typeof item.heading === 'string' && item.heading.trim().length > 0
      );
      if (found) return found.heading.trim();
    } else if (cardBanners?.heading && typeof cardBanners.heading === 'string') {
      return cardBanners.heading.trim();
    }
    return '';
  }, [cardBanners, heading]);

  // Separate items into cards and full banners
  const { cards, banners } = useMemo(() => {
    if (!Array.isArray(cardBanners) || cardBanners.length === 0) {
      return { cards: [], banners: [] };
    }

    const sorted = [...cardBanners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const c = [];
    const b = [];

    sorted.forEach((item) => {
      if (item.is_banner) {
        b.push(item);
      } else if (item.is_card) {
        c.push(item);
      } else {
        c.push(item);
      }
    });

    return { cards: c, banners: b };
  }, [cardBanners]);

  const sliderRef = useRef(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const handleBannerScroll = useCallback((event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    if (slideSize > 0) {
      const activeIndex = Math.floor((offset + slideSize / 2) / slideSize);
      setActiveBannerIndex(activeIndex);
    }
  }, []);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const timer = setInterval(() => {
      if (sliderRef.current) {
        const nextIndex = (activeBannerIndex + 1) % banners.length;
        sliderRef.current.scrollTo({
          x: nextIndex * BANNER_WIDTH,
          animated: true,
        });
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [activeBannerIndex, banners.length]);

  const handlePress = useCallback(
    (item) => {
      if (!navigation) return;

      // 1. Multiple products attached -> open Products screen with products list
      if (Array.isArray(item.products) && item.products.length > 1) {
        navigation.navigate('Products', {
          headerTitle: item.title?.trim() || 'Special Offers',
          bannerProducts: item.products,
        });
        return;
      }

      // 2. Single linked product -> navigate directly to ProductDetail
      const singleProductId =
        item.product?._id ||
        (typeof item.product === 'string' && item.product ? item.product : null) ||
        (Array.isArray(item.products) && item.products.length === 1 ? item.products[0]?._id : null);

      if (singleProductId) {
        navigation.navigate('ProductDetail', { productId: singleProductId });
        return;
      }

      // 3. Custom link URL
      if (item.link && typeof item.link === 'string') {
        const trimmed = item.link.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          Linking.openURL(trimmed).catch((err) => {
            console.warn('Failed to open card banner link:', err);
          });
          return;
        }
      }

      // 4. Fallback -> open Products screen
      navigation.navigate('Products', {
        headerTitle: item.title?.trim() || 'Special Collection',
      });
    },
    [navigation]
  );

  if (showSkeleton) {
    return <CardBannerSkeleton heading={sectionHeading} />;
  }

  if (cards.length === 0 && banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ── Section Heading (shown only if present) ── */}
      {sectionHeading ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionHeading}</Text>
        </View>
      ) : null}

      {/* ── 1. Card Banners Horizontal Slider ── */}
      {cards.length > 0 && (
        <View style={styles.cardSliderSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsScrollContent}>
            {cards.map((item, index) => {
              const imageSource = getImageSource(item.banner_url, 'PRODUCT_CARD', DUMMY_IMG);
              const titleText = item.title && typeof item.title === 'string' ? item.title.trim() : '';
              const offerText = item.text && typeof item.text === 'string' ? item.text.trim() : '';
              const hasTitle = titleText.length > 0;
              const hasOffer = offerText.length > 0;

              return (
                <TouchableOpacity
                  key={item._id || `card-${index}`}
                  activeOpacity={0.9}
                  onPress={() => handlePress(item)}>
                  <LinearGradient
                    colors={['#FFFFFF', '#FAF5FF', '#F3E8FF']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.cardWrapper}>
                    {/* Top Image Frame */}
                    <View style={styles.cardImageWrapper}>
                      <Image
                        source={imageSource}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Bottom Info Area */}
                    <View style={styles.cardInfoContainer}>
                      {hasTitle && (
                        <Text numberOfLines={1} style={styles.cardTitle}>
                          {titleText}
                        </Text>
                      )}
                      {hasOffer && (
                        <Text numberOfLines={1} style={styles.cardOffer}>
                          {offerText}
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── 2. Full-Width Banner Slider (if is_banner: true) ── */}
      {banners.length > 0 && (
        <View style={[styles.bannersSection, cards.length > 0 && { marginTop: 12 }]}>
          <View style={styles.bannerSliderWrapper}>
            <ScrollView
              ref={sliderRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleBannerScroll}
              scrollEventThrottle={16}>
              {banners.map((banner, index) => {
                const bannerSource = getImageSource(
                  banner.banner_url,
                  'BANNER_HERO',
                  require('../../assets/luxury_banner.png')
                );
                return (
                  <TouchableOpacity
                    key={banner._id || `banner-${index}`}
                    style={styles.bannerSlide}
                    activeOpacity={0.95}
                    onPress={() => handlePress(banner)}>
                    <Image
                      source={bannerSource}
                      style={styles.bannerImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Carousel Dots below the banner */}
          {banners.length > 1 && (
            <View style={styles.bannerDots}>
              {banners.map((banner, index) => (
                <View
                  key={banner._id || index}
                  style={[
                    styles.bannerDot,
                    activeBannerIndex === index && styles.bannerDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#000000',
  },
  cardSliderSection: {
    paddingVertical: 4,
  },
  cardsScrollContent: {
    paddingHorizontal: 14,
    gap: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    borderWidth: 4,
    borderColor: '#f6d6b6',
    padding: 2,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,

  },
  skeletonCardWrapper: {
    width: CARD_WIDTH,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 4,
    padding: 6,
    overflow: 'hidden',
    backgroundColor: '#FAF5FF',
    elevation: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardImageWrapper: {
    width: '100%',
    height: 170,

    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  // cardInfoContainer: {
  //   paddingTop: 8,
  //   paddingBottom: 4,
  //   paddingHorizontal: 4,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  cardTitle: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  cardOffer: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  cardCta: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Full-width Banner Slider Styles
  bannersSection: {
    paddingTop: 4,
  },
  bannerSliderWrapper: {
    marginHorizontal: 16,
    borderRadius: 10,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  bannerSlide: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  bannerDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});
