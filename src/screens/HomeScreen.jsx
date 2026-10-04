import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  Linking,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {
  Search,
  Zap,
  Gift,
  Umbrella,
  Award,
  Percent,
  Clock,
  Droplet,
  Star,
  Heart,
  X,
  Sparkles,
  Gem,
  ChevronRight,
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import BottomSheetModal from '../components/BottomSheetModal';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { useBanners } from '../hooks/useBanners';
import { useSecondBanner } from '../hooks/useSecondBanner';
import { useCardBanners } from '../hooks/useCardBanners';
import { useMarquee } from '../hooks/useMarquee';
import { useCartStore } from '../store/cartStore';
import { addToCartApi } from '../api/cart';
import { Skeleton } from '../components/Skeleton';
import MarqueeBanner from '../components/MarqueeBanner';
import BrandMarqueeBanner from '../components/BrandMarqueeBanner';
import CardBannerSection from '../components/CardBannerSection';
import ProductCard from '../components/ProductCard';
import { getImageSource } from '../utils/imageOptimizer';
import { isProductOutOfStock, getProductStockStatus } from '../utils/productUtils';

import fonts from '../theme/typography';

const DUMMY_IMG = require('../../assets/dummy_product.png');
import colors from '../theme/colors';
import { moderateScale } from '../theme/responsive';

const parsePrice = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal) || 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const { width: screenWidth } = Dimensions.get('window');
const BANNER_WIDTH = screenWidth - 32;
const DEALS_GAP = 12;
const DEAL_CARD_WIDTH = (screenWidth - 16 * 2 - DEALS_GAP) / 2;
const BESTSELLER_GAP = 12;
const BESTSELLER_CARD_WIDTH = (screenWidth - 16 * 2 - BESTSELLER_GAP) / 2;
const BESTSELLER_SNAP_INTERVAL = (BESTSELLER_CARD_WIDTH + BESTSELLER_GAP) * 2;

function CategorySkeleton() {
  return (
    <View style={{ alignItems: 'center' }}>
      <Skeleton width={84} height={84} radius={42} />
      <Skeleton width={60} height={10} radius={4} style={{ marginTop: 8 }} />
    </View>
  );
}

const SPOTLIGHT_CARD_WIDTH = Math.min(Math.round((screenWidth - 44) / 2), 205);
const SPOTLIGHT_HERO_HEIGHT = Math.round(SPOTLIGHT_CARD_WIDTH * 0.95);

function BrandSkeleton() {
  return (
    <View style={styles.spotlightScrollContent}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.spotlightCard}>
          <Skeleton width="100%" height={SPOTLIGHT_HERO_HEIGHT} radius={0} />
          <View style={styles.spotlightBrandFooter}>
            <Skeleton width="75%" height={16} radius={4} style={{ marginBottom: 4 }} />
            <Skeleton width="50%" height={10} radius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

function RemoteImage({ source, defaultSource, style, resizeMode = 'cover', radius = 0, preset = 'PRODUCT_CARD' }) {
  const [loaded, setLoaded] = useState(false);
  const isLocalSource = typeof source === 'number';

  const resolvedSource = useMemo(() => {
    return getImageSource(source, preset, defaultSource);
  }, [source, preset, defaultSource]);

  return (
    <View style={[style, { overflow: 'hidden' }, radius > 0 ? { borderRadius: radius } : null]}>
      {!loaded && !isLocalSource && (
        <Skeleton style={StyleSheet.absoluteFill} radius={radius} fillParent />
      )}
      <Image
        source={resolvedSource}
        defaultSource={defaultSource}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onLoadEnd={() => setLoaded(true)}
      />
    </View>
  );
}

function SearchHintText() {
  const [searchHint, setSearchHint] = useState(SEARCH_SUGGESTIONS[0]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % SEARCH_SUGGESTIONS.length;
      setSearchHint(SEARCH_SUGGESTIONS[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text numberOfLines={1} style={styles.searchPlaceholderText}>{searchHint}</Text>
  );
}

function DealCardSkeleton() {
  return (
    <View
      style={{
        width: DEAL_CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 10,
      }}>
      <Skeleton width="100%" height={150} radius={12} />
      <Skeleton width="90%" height={11} radius={5} style={{ marginTop: 10 }} />
      <Skeleton width="60%" height={11} radius={5} style={{ marginTop: 6 }} />
      <Skeleton width="50%" height={14} radius={5} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={36} radius={10} style={{ marginTop: 12 }} />
    </View>
  );
}

// ─── Header background shade ────────────────────
const BG_HEADER = '#FFFFFF';
const GRID_LINE = 'rgba(241, 245, 249, 0.8)'; // subtle clean grid lines
const CELL = 26; // px per grid square

// Pure-code grid background: renders horizontal + vertical lines over lavender
function GridBackground({ style, children }) {
  return (
    <View style={[gridStyles.container, style]}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View
          key={`v${i}`}
          pointerEvents="none"
          style={[gridStyles.vLine, { left: i * CELL }]}
        />
      ))}
      {Array.from({ length: 40 }).map((_, i) => (
        <View
          key={`h${i}`}
          pointerEvents="none"
          style={[gridStyles.hLine, { top: i * CELL }]}
        />
      ))}
      {children}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    backgroundColor: BG_HEADER,
    overflow: 'hidden',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: GRID_LINE,
  },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: GRID_LINE,
  },
});

// ─── Data ──────────────────────────────────────────────────────────────────────
const DEAL_CHIPS = [
  { id: '1', title: 'Lightning\nDeals', image: require('../../assets/lightning_deals.png') },
  { id: '2', title: 'Monsoon\nSale', image: require('../../assets/monsoon_sale.png') },
  { id: '4', title: 'Bestsellers\nof the Season', image: require('../../assets/best_seller.png') },
  { id: '5', title: 'Super\nSavers', image: require('../../assets/super_saver.png') },
];

const SEARCH_SUGGESTIONS = [
  'Search "Night Cream"',
  'Search "Lipstick"',
  'Search "Face Serum"',
  'Search "Sunscreen SPF 50"',
  'Search "Ubtan Face Wash"',
  'Search "Hair Oil"',
  'Search "Foundation"',
  'Search "Moisturizer"',
];

const CATEGORIES = [
  { id: '1', name: 'Cleanse', image: require('../../assets/cat_cleanse.png') },
  { id: '2', name: 'Treat', image: require('../../assets/cat_treat.png') },
  { id: '3', name: 'Moisturize', image: require('../../assets/cat_moisturize.png') },
  { id: '4', name: 'Protect', image: require('../../assets/cat_protect.png') },
];

const FALLBACK_BANNERS = [
  { id: 'fallback-1', image: require('../../assets/luxury_banner.png') },
  { id: 'fallback-2', image: require('../../assets/glow_banner_products.png') },
  { id: 'fallback-3', image: require('../../assets/luxury_banner_6.png') },
];

const BUDGET_STORES = [
  { id: 'b1', title: 'Under ₹299', subtitle: 'Everyday Essentials', maxPrice: 299, colors: ['#ECFDF5', '#D1FAE5'], accent: '#059669', priceText: '₹299', badge: 'BEST SELLER', image: require('../../assets/under_299.png') },
  { id: 'b2', title: 'Under ₹499', subtitle: 'Trending Skincare', maxPrice: 499, colors: ['#FFF5F5', '#FED7D7'], accent: '#E53E3E', priceText: '₹499', badge: 'POPULAR', image: require('../../assets/under_499.png') },
  { id: 'b3', title: 'Under ₹699', subtitle: 'Self-Care Treats', maxPrice: 699, colors: ['#EEF2FF', '#E0E7FF'], accent: '#4F46E5', priceText: '₹699', badge: 'RECOMMENDED', image: require('../../assets/under_699.png') },
  { id: 'b4', title: 'Under ₹999', subtitle: 'Luxury Indulgence', maxPrice: 999, colors: ['#FFFBEB', '#FEF3C7'], accent: '#D97706', priceText: '₹999', badge: 'PREMIUM', image: require('../../assets/under_999.png') },
];

const DEALS_TITLES_ROTATION = [
  { title: 'Deals Of The Day', subtitle: 'Here today, gone tomorrow.' },
  { title: 'Exclusive Wholesale Picks', subtitle: 'Handpicked bulk discounts just for you.' },
  { title: 'Steal Deals of the Week', subtitle: 'Unbeatable prices on trending items.' },
  { title: 'Hot Selling Favorites', subtitle: 'Best rates on top salon and beauty stock.' },
  { title: 'Flash Wholesale Special', subtitle: 'Limited stock offers, act fast!' },
];

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const [activeSlide, setActiveSlide] = useState(0);
  const [bestsellerActivePage, setBestsellerActivePage] = useState(0);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: realProducts = [], isLoading: productsLoading } = useProducts({ per_page: 1000 });
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: banners = [], isLoading: bannersLoading } = useBanners();
  const { data: secondBanner, isLoading: secondBannerLoading } = useSecondBanner();
  const { data: cardBanners = [], isLoading: cardBannersLoading } = useCardBanners();
  const { data: activeMarquees = [] } = useMarquee();

  useEffect(() => {
    if (isFocused) {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  }, [isFocused, queryClient]);

  const marqueeItems = useMemo(() => {
    if (!Array.isArray(activeMarquees) || activeMarquees.length === 0) {
      return [];
    }
    const texts = [];
    activeMarquees.forEach((m) => {
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
  }, [activeMarquees]);



  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['brands'] }),
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
        queryClient.invalidateQueries({ queryKey: ['secondBanner'] }),
        queryClient.invalidateQueries({ queryKey: ['cardBanners'] }),
        queryClient.invalidateQueries({ queryKey: ['marquee'] }),
      ]);
    } catch (error) {
      console.error('Home refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const secondBannerSource = useMemo(() => {
    const rawUrl = secondBanner?.banner_url;
    return getImageSource(rawUrl, 'BANNER_HERO', require('../../assets/luxury_banner.png'));
  }, [secondBanner?.banner_url]);

  const handleSecondBannerPress = useCallback(() => {
    if (!secondBanner) {
      navigation.navigate('Products', {
        filterType: 'supersaver',
        headerTitle: 'Weekend Sale',
      });
      return;
    }

    const productId =
      secondBanner.product?._id ||
      (typeof secondBanner.product === 'string' && secondBanner.product ? secondBanner.product : null);

    if (productId) {
      navigation.navigate('ProductDetail', { productId });
      return;
    }

    if (secondBanner.link && typeof secondBanner.link === 'string') {
      const trimmed = secondBanner.link.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        Linking.openURL(trimmed).catch((err) => {
          console.warn('Failed to open second banner link:', err);
        });
        return;
      }
    }

    navigation.navigate('Products', {
      filterType: 'supersaver',
      headerTitle: secondBanner.title || 'Weekend Sale',
    });
  }, [secondBanner, navigation]);

  // Dynamic deals title that changes automatically every 4 days
  const currentDealsHeader = useMemo(() => {
    const fourDaysInMs = 1000 * 60 * 60 * 24 * 4;
    const periodIndex = Math.floor(Date.now() / fourDaysInMs);
    const index = periodIndex % DEALS_TITLES_ROTATION.length;
    return DEALS_TITLES_ROTATION[index];
  }, []);
  const bannerSlides = useMemo(
    () =>
      banners.length > 0
        ? [...banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : FALLBACK_BANNERS,
    [banners]
  );
  const bannerItems = useMemo(
    () =>
      bannerSlides.map((banner) => ({
        banner,
        key: banner._id || banner.id,
        imageSource: getImageSource(banner.banner_url || banner.image, 'BANNER_HERO'),
      })),
    [bannerSlides]
  );
  const categoryItems = useMemo(
    () =>
      categories.map((cat) => ({
        cat,
        imageSource: getImageSource(cat.images?.[0], 'CATEGORY_ICON'),
      })),
    [categories]
  );
  const spotlightBrands = useMemo(() => {
    if (!brands || brands.length === 0) return [];

    const validBrands = brands.filter((b) => b && b.name && b.name.trim().length > 0);

    const SPOTLIGHT_DEALS = [
      { offer: 'Up To 70% Off', subtitle: 'Steal The Spotlight' },
      { offer: 'Min. 40% Off', subtitle: 'Everyday Luxury' },
      { offer: 'Up To 50% Off', subtitle: 'Glow Essentials' },
      { offer: 'Flat 35% Off', subtitle: 'Trending Skincare' },
      { offer: 'Up To 60% Off', subtitle: 'Salon Hair Care' },
      { offer: 'Min. 30% Off', subtitle: 'Pure & Organic' },
      { offer: 'Flat 25% Off', subtitle: 'Dermatologist Choice' },
      { offer: 'Up To 45% Off', subtitle: 'Signature Beauty' },
    ];

    return validBrands.slice(0, 12).map((brand, idx) => {
      // Find products belonging to this brand for max discount calculation
      const brandProducts = realProducts.filter((p) => {
        const pBId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
        return pBId === brand._id || (p.name && p.name.toLowerCase().includes(brand.name.toLowerCase()));
      });

      const logoImage = brand.images?.[0] || null;

      let maxDiscount = 0;
      brandProducts.forEach((p) => {
        const orig = parsePrice(p.price);
        const disc = parsePrice(p.discounted_price);
        if (orig > disc && orig > 0) {
          const pct = Math.round(((orig - disc) / orig) * 100);
          if (pct > maxDiscount) maxDiscount = pct;
        }
      });

      const deal = SPOTLIGHT_DEALS[idx % SPOTLIGHT_DEALS.length];
      const offerText = maxDiscount > 0 ? `Up To ${maxDiscount}% Off` : deal.offer;
      const subtitleText =
        brand.discount_label_text && brand.discount_label_text !== 'na'
          ? brand.discount_label_text
          : deal.subtitle;

      return {
        brand,
        logoImage,
        offerText,
        subtitleText,
      };
    });
  }, [brands, realProducts]);
  const dealsProducts = useMemo(
    () =>
      realProducts.slice(0, 200).map((item) => {
        const itemId = item._id || item.id;
        const originalPrice = item.price || 0;
        const finalPrice = item.discounted_price || item.price || 0;
        const discount =
          originalPrice > finalPrice
            ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
            : 0;
        const rawImg = item.images?.[0] || item.image || item.banner_image;
        const imageSource = getImageSource(rawImg, 'PRODUCT_CARD');

        let brandNameStr = '';
        if (typeof item.brand === 'object' && item.brand?.name) {
          brandNameStr = item.brand.name;
        } else if (item.brandName) {
          brandNameStr = item.brandName;
        } else if (typeof item.brand === 'string') {
          if (/^[0-9a-fA-F]{24}$/.test(item.brand)) {
            const found = brands.find((b) => b._id === item.brand);
            brandNameStr = found ? found.name : '';
          } else {
            brandNameStr = item.brand;
          }
        }

        const titleText = brandNameStr
          ? item.name.toLowerCase().startsWith(brandNameStr.toLowerCase())
            ? item.name.slice(brandNameStr.length).trim()
            : item.name
          : item.name;

        return { item, itemId, originalPrice, finalPrice, discount, imageSource, brandNameStr, titleText };
      }),
    [realProducts, brands]
  );

  const bestsellerProducts = useMemo(() => {
    const tagged = realProducts.filter(
      (p) =>
        p.is_best_seller === true ||
        p.isBestSeller === true ||
        p.is_bestseller === true ||
        p.tag === 'bestseller' ||
        (Array.isArray(p.tags) &&
          p.tags.some((t) => {
            const s = String(t).toLowerCase();
            return s === 'bestseller' || s === 'best seller';
          }))
    );

    return tagged.map((item) => {
      const itemId = item._id || item.id;
      const originalPrice = item.price || 0;
      const finalPrice = item.discounted_price || item.price || 0;
      const discount =
        originalPrice > finalPrice
          ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
          : 0;
      const rawImg = item.images?.[0] || item.image || item.banner_image;
      const imageSource = getImageSource(rawImg, 'PRODUCT_CARD');

      let brandNameStr = '';
      if (typeof item.brand === 'object' && item.brand?.name) {
        brandNameStr = item.brand.name;
      } else if (item.brandName) {
        brandNameStr = item.brandName;
      } else if (typeof item.brand === 'string') {
        if (/^[0-9a-fA-F]{24}$/.test(item.brand)) {
          const found = brands.find((b) => b._id === item.brand);
          brandNameStr = found ? found.name : '';
        } else {
          brandNameStr = item.brand;
        }
      }

      const titleText = brandNameStr
        ? item.name.toLowerCase().startsWith(brandNameStr.toLowerCase())
          ? item.name.slice(brandNameStr.length).trim()
          : item.name
        : item.name;

      return { item, itemId, originalPrice, finalPrice, discount, imageSource, brandNameStr, titleText };
    });
  }, [realProducts, brands]);

  useEffect(() => {
    bestsellerProducts.forEach(({ imageSource }) => {
      if (imageSource?.uri) Image.prefetch(imageSource.uri);
    });
  }, [bestsellerProducts]);

  useEffect(() => {
    bannerItems.forEach(({ imageSource }) => {
      if (imageSource?.uri) Image.prefetch(imageSource.uri);
    });
  }, [bannerItems]);

  useEffect(() => {
    categoryItems.forEach(({ imageSource }) => {
      if (imageSource?.uri) Image.prefetch(imageSource.uri);
    });
  }, [categoryItems]);



  useEffect(() => {
    dealsProducts.forEach(({ imageSource }) => {
      if (imageSource?.uri) Image.prefetch(imageSource.uri);
    });
  }, [dealsProducts]);

  const sliderRef = useRef(null);

  const handleScroll = useCallback((event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.floor((offset + slideSize / 2) / slideSize);
    setActiveSlide(activeIndex);
  }, []);

  const handleBestsellerScroll = useCallback((event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offset / BESTSELLER_SNAP_INTERVAL);
    setBestsellerActivePage(pageIndex);
  }, []);


  useEffect(() => {
    if (bannerSlides.length < 2) return undefined;
    const timer = setInterval(() => {
      if (sliderRef.current) {
        sliderRef.current.scrollToOffset({
          offset: ((activeSlide + 1) % bannerSlides.length) * BANNER_WIDTH,
          animated: true,
        });
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [activeSlide, bannerSlides.length]);

  const HOME_SECTIONS = useMemo(() => [
    { id: 'top_lavender' },
    { id: 'brand_marquee' },
    { id: 'luxury_banner' },
    { id: 'categories' },
    { id: 'spotlight_brands' },
    { id: 'card_banners' },
    { id: 'bestsellers' },
    { id: 'deals' },
    { id: 'footer' },
  ], []);

  const renderSectionItem = useCallback(({ item }) => {
    switch (item.id) {
      case 'top_lavender':
        return (
          <GridBackground style={styles.topLavenderSection}>
            {/* Continuous Sliding Marquee Sale Banner */}
            {marqueeItems.length > 0 && (
              <MarqueeBanner
                items={marqueeItems}
                onPress={() =>
                  navigation.navigate('Products', {
                    filterType: 'supersaver',
                    headerTitle: 'For You',
                  })
                }
              />
            )}

            {/* Weekend Sale Banner */}
            <TouchableOpacity
              style={styles.saleBannerContainer}
              activeOpacity={0.9}
              onPress={handleSecondBannerPress}>
              <Image
                source={secondBannerSource}
                style={styles.saleBannerImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* Deal Chips FlatList */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealChipsScroll}
              data={DEAL_CHIPS}
              keyExtractor={(chip) => chip.id}
              renderItem={({ item: chip }) => {
                const hasImage = !!chip.image;
                return (
                  <TouchableOpacity
                    style={hasImage ? styles.dealChipCardImageOnly : styles.dealChipCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      let filterType = '';
                      let headerTitle = '';
                      if (chip.id === '1') {
                        filterType = 'lightning';
                        headerTitle = 'Lightning Deals';
                      } else if (chip.id === '2') {
                        filterType = 'monsoon';
                        headerTitle = 'Monsoon Sale';
                      } else if (chip.id === '3') {
                        filterType = 'freegift';
                        headerTitle = 'Free Gift Inside';
                      } else if (chip.id === '4') {
                        filterType = 'bestseller';
                        headerTitle = 'Bestsellers of the Season';
                      } else if (chip.id === '5') {
                        filterType = 'supersaver';
                        headerTitle = 'Super Savers';
                      }
                      navigation.navigate('Products', { filterType, headerTitle });
                    }}>
                    {hasImage ? (
                      <Image
                        source={chip.image}
                        style={styles.dealChipFullImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <>
                        <View style={[styles.chipIconContainer, { backgroundColor: chip.iconBg }]}>
                          <chip.Icon size={22} color={chip.iconColor} />
                        </View>
                        <Text style={styles.dealChipTitle}>{chip.title}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </GridBackground>
        );

      case 'brand_marquee':
        return brands.length > 0 ? (
          <BrandMarqueeBanner
            brands={brands}
            style={styles.brandMarqueeWrapper}
          />
        ) : null;

      case 'luxury_banner':
        return (
          <View style={styles.luxuryBannerWrapper}>
            <View style={styles.luxuryBanner}>
              {(bannersLoading || refreshing) ? (
                <Skeleton width={BANNER_WIDTH} height={180} radius={16} />
              ) : (
                <FlatList
                  ref={sliderRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  data={bannerItems}
                  keyExtractor={(bItem) => bItem.key}
                  getItemLayout={(_, index) => ({
                    length: BANNER_WIDTH,
                    offset: BANNER_WIDTH * index,
                    index,
                  })}
                  renderItem={({ item: { banner, imageSource } }) => (
                    <TouchableOpacity
                      activeOpacity={0.95}
                      style={{ width: BANNER_WIDTH, height: 180 }}
                      onPress={() => {
                        const bannerProductsList =
                          Array.isArray(banner.products) && banner.products.length > 0
                            ? banner.products
                            : banner.product
                            ? [typeof banner.product === 'string' ? { _id: banner.product } : banner.product]
                            : [];

                        if (bannerProductsList.length > 1) {
                          navigation.navigate('Products', {
                            headerTitle: banner.title || banner.name || 'Special Offers',
                            bannerProducts: bannerProductsList,
                          });
                        } else if (bannerProductsList.length === 1) {
                          const singleProduct = bannerProductsList[0];
                          const targetId = singleProduct?._id || singleProduct?.id;
                          if (targetId) {
                            navigation.navigate('ProductDetail', {
                              productId: targetId,
                              product: {
                                ...singleProduct,
                                price: parsePrice(singleProduct.price),
                                discounted_price: parsePrice(
                                  singleProduct.discounted_price || singleProduct.price
                                ),
                              },
                            });
                          }
                        }
                      }}>
                      <RemoteImage
                        source={imageSource}
                        defaultSource={require('../../assets/dummy_product.png')}
                        style={styles.luxuryBannerImage}
                        resizeMode="cover"
                        preset="BANNER_HERO"
                      />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            {/* Carousel Dots below the banner */}
            {!bannersLoading && bannerSlides.length > 1 && (
              <View style={styles.luxuryBannerDots}>
                {bannerSlides.map((banner, index) => (
                  <View
                    key={banner._id || banner.id || index}
                    style={[styles.luxuryDot, activeSlide === index && styles.luxuryDotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        );

      case 'categories':
        return (
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Shop By Category</Text>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
              data={
                categoriesLoading || refreshing
                  ? Array.from({ length: 6 }).map((_, i) => ({ isSkeleton: true, id: `cat-skel-${i}` }))
                  : categories.length === 0
                  ? CATEGORIES.map((cat) => ({ ...cat, isStatic: true }))
                  : categoryItems.map((ci) => ({ ...ci.cat, imageSource: ci.imageSource }))
              }
              keyExtractor={(catItem, index) => catItem._id || catItem.id || `cat-${index}`}
              renderItem={({ item: catItem }) => {
                if (catItem.isSkeleton) {
                  return (
                    <View style={styles.categoryItem}>
                      <CategorySkeleton />
                    </View>
                  );
                }
                if (catItem.isStatic) {
                  return (
                    <TouchableOpacity
                      style={styles.categoryItem}
                      activeOpacity={0.95}
                      onPress={() => navigation.navigate('Products', { categoryId: catItem.id, categoryName: catItem.name })}>
                      <Image source={catItem.image} style={styles.categoryItemImage} />
                      <Text style={styles.categoryItemLabel}>{catItem.name}</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Products', { categoryId: catItem._id, categoryName: catItem.name })}>
                    <RemoteImage
                      source={catItem.imageSource}
                      defaultSource={require('../../assets/dummy_product.png')}
                      style={styles.categoryItemImage}
                      radius={42}
                      preset="CATEGORY_ICON"
                    />
                    <Text style={styles.categoryItemLabel}>{catItem.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );

      case 'spotlight_brands':
        return (brandsLoading || refreshing || spotlightBrands.length > 0) ? (
          <LinearGradient
            colors={['#FDEAB0', '#FEF2CB', '#FFF8E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.spotlightSection}>
            <View style={styles.spotlightHeader}>
              <Text style={styles.spotlightTitle}>BRANDS IN SPOTLIGHT</Text>
            </View>

            {(brandsLoading || refreshing) ? (
              <BrandSkeleton />
            ) : (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.spotlightScrollContent}
                data={spotlightBrands}
                keyExtractor={(bItem) => bItem.brand._id || bItem.brand.id}
                ListFooterComponent={
                  <TouchableOpacity
                    style={[styles.spotlightCard, styles.spotlightViewAllCard]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Brands')}>
                    <View style={styles.spotlightViewAllInner}>
                      <View style={styles.spotlightViewAllCircle}>
                        <ChevronRight size={24} color="#102A43" />
                      </View>
                      <Text style={styles.spotlightViewAllTitle}>EXPLORE ALL</Text>
                      <Text style={styles.spotlightViewAllSubtitle}>View all brands</Text>
                    </View>
                  </TouchableOpacity>
                }
                renderItem={({ item: bItem }) => (
                  <TouchableOpacity
                    style={styles.spotlightCard}
                    activeOpacity={0.88}
                    onPress={() =>
                      navigation.navigate('Products', {
                        brandId: bItem.brand._id,
                        brandName: bItem.brand.name,
                      })
                    }>
                    <View style={styles.spotlightCardContent}>
                      <View style={styles.spotlightImageContainer}>
                        {bItem.logoImage ? (
                          <Image
                            source={getImageSource(bItem.logoImage, 'BRAND_LOGO')}
                            style={styles.spotlightBrandHeroImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.spotlightFallbackEmblem}>
                            <Text style={styles.spotlightFallbackInitial}>
                              {bItem.brand.name?.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.spotlightBrandFooter}>
                        <Text style={styles.spotlightBrandNameText} numberOfLines={1}>
                          {bItem.brand.name?.trim().toUpperCase()}
                        </Text>
                        {bItem.subtitleText ? (
                          <Text style={styles.spotlightSubtitleText} numberOfLines={1}>
                            {bItem.subtitleText}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </LinearGradient>
        ) : null;

      case 'card_banners':
        return (
          <CardBannerSection
            cardBanners={cardBanners}
            isLoading={cardBannersLoading}
            refreshing={refreshing}
            navigation={navigation}
          />
        );

      case 'bestsellers':
        return (productsLoading || refreshing || bestsellerProducts.length > 0) ? (
          <View style={styles.bestsellerSection}>
            <View style={styles.bestsellerHeader}>
              <Text style={styles.bestsellerTitle}>Best Sellers</Text>
            </View>

            {(productsLoading || refreshing) ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={BESTSELLER_SNAP_INTERVAL}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={styles.bestsellerScrollContent}
                data={Array.from({ length: 4 })}
                keyExtractor={(_, i) => `bs-skel-${i}`}
                renderItem={() => (
                  <View style={styles.bestsellerCard}>
                    <Skeleton width="100%" height={150} radius={12} />
                    <Skeleton width="90%" height={11} radius={5} style={{ marginTop: 10 }} />
                    <Skeleton width="60%" height={11} radius={5} style={{ marginTop: 6 }} />
                    <Skeleton width="50%" height={14} radius={5} style={{ marginTop: 8 }} />
                    <Skeleton width="100%" height={36} radius={10} style={{ marginTop: 12 }} />
                  </View>
                )}
              />
            ) : (
              <>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={BESTSELLER_SNAP_INTERVAL}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  onScroll={handleBestsellerScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={styles.bestsellerScrollContent}
                  data={bestsellerProducts}
                  keyExtractor={(bsItem, idx) => bsItem.itemId || bsItem.item?._id || `bs-${idx}`}
                  renderItem={({ item: bsItem }) => {
                    const productItem = bsItem.item || bsItem;
                    return (
                      <ProductCard
                        product={productItem}
                        width={BESTSELLER_CARD_WIDTH}
                        style={styles.bestsellerCard}
                        brands={brands}
                      />
                    );
                  }}
                />

                {bestsellerProducts.length > 2 && (
                  <View style={styles.bestsellerDotsRow}>
                    {Array.from({ length: Math.min(6, Math.ceil(bestsellerProducts.length / 2)) }).map((_, i) => (
                      <View
                        key={i}
                        style={[styles.bestsellerDot, bestsellerActivePage === i && styles.bestsellerDotActive]}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        ) : null;

      case 'deals':
        return (
          <LinearGradient
            colors={['#F3E8FF', '#FAF5FF', '#FFFFFF']}
            style={styles.dealsLinearSection}>
            <View style={styles.dealsHeaderCard}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.dealsTitle}>{currentDealsHeader.title}</Text>
                <Text style={styles.dealsSubtitle}>{currentDealsHeader.subtitle}</Text>
              </View>
            </View>

            {(productsLoading || refreshing) ? (
              <View style={styles.dealsGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <DealCardSkeleton key={i} />
                ))}
              </View>
            ) : realProducts.length > 0 ? (
              <View style={styles.dealsGrid}>
                {dealsProducts.map((deal) => {
                  const dealItem = deal.item || deal;
                  return (
                    <ProductCard
                      key={dealItem._id || dealItem.id || `deal-${deal.itemId}`}
                      product={dealItem}
                      width={DEAL_CARD_WIDTH}
                      style={styles.dealProductCard}
                      brands={brands}
                    />
                  );
                })}
              </View>
            ) : null}

            {/* Bottom Soft Purple Fade */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', '#FAF5FF', '#F3E8FF']}
              style={styles.bottomGradientFade}
            />
          </LinearGradient>
        );

      case 'footer':
        return (
          <View style={styles.homeFooter}>
            <Text style={styles.homeFooterTitle}>
              Empower{"\n"}Your Beauty!
            </Text>
            <View style={styles.homeFooterSubtitleRow}>
              <Text style={styles.homeFooterSubtitle}>Made with </Text>
              <Text style={styles.heartText}>❤️</Text>
              <Text style={styles.homeFooterSubtitle}> in India</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  }, [
    marqueeItems,
    secondBannerSource,
    handleSecondBannerPress,
    navigation,
    brands,
    brandsLoading,
    bannersLoading,
    refreshing,
    bannerItems,
    handleScroll,
    activeSlide,
    bannerSlides,
    categoriesLoading,
    categories,
    categoryItems,
    spotlightBrands,
    cardBanners,
    cardBannersLoading,
    productsLoading,
    bestsellerProducts,
    handleBestsellerScroll,
    bestsellerActivePage,
    currentDealsHeader,
    realProducts.length,
    dealsProducts,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {isFocused && (
        <StatusBar
          backgroundColor="#FFFFFF"
          barStyle="dark-content"
          translucent={false}
        />
      )}

      {/* ── Search Bar ── */}
      <GridBackground style={styles.searchSection}>
        <View style={styles.logoSearchRow}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/SBL.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Search')}>
            <Search size={20} color="#64748B" style={styles.searchIcon} />
            <SearchHintText />
          </TouchableOpacity>
        </View>
      </GridBackground>

      <FlatList
        data={HOME_SECTIONS}
        keyExtractor={(sec) => sec.id}
        renderItem={renderSectionItem}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  topLavenderSection: { paddingBottom: 8 },
  bottomWhiteSection: { backgroundColor: '#FFFFFF', paddingTop: 0, paddingBottom: 14 },
  brandMarqueeWrapper: {
    marginBottom: 12,
  },
  searchSection: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  logoSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 75,
    height: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerLogoImage: {
    width: 155,
    height: 155,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    minHeight: moderateScale(48),
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 10 },
  searchPlaceholderText: { flex: 1, fontSize: moderateScale(14), fontFamily: fonts.medium, color: '#94A3B8' },
  scrollContent: { paddingBottom: 14 },
  saleBannerContainer: { marginBottom: 10, borderRadius: 1, overflow: 'hidden', height: 180, backgroundColor: '#F3E8FF' },
  saleBannerImage: { width: '100%', height: '100%' },
  dealChipsScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  dealChipCard: {
    width: 115,
    height: 115,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealChipCardImageOnly: {
    width: 115,
    height: 115,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dealChipFullImage: {
    width: '100%',
    height: '100%',
  },
  chipIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dealChipTitle: { fontSize: moderateScale(9.5), fontFamily: fonts.medium, color: '#334155', textAlign: 'center', lineHeight: moderateScale(12) },
  luxuryBanner: { marginHorizontal: 16, borderRadius: 18, backgroundColor: '#E4E4E1', height: 180, position: 'relative', overflow: 'hidden' },
  luxuryBannerImage: { width: BANNER_WIDTH, height: '100%' },
  luxuryBannerDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 },
  luxuryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  luxuryDotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  categoriesSection: { marginTop: 12 },
  categoriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  categoriesTitle: { fontSize: moderateScale(18), fontFamily: fonts.big, color: '#000000' },
  categoriesScroll: { paddingHorizontal: 16, gap: 16, paddingBottom: 4 },
  categoryItem: { alignItems: 'center' },
  categoryItemImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  categoryItemLabel: { marginTop: 8, fontSize: moderateScale(12), fontFamily: fonts.medium, color: '#1E1B4B', textAlign: 'center' },
  categoriesLoadingContainer: { height: 100, width: BANNER_WIDTH, alignItems: 'center', justifyContent: 'center' },
  
  /* Budget Beauty Store Section Styles */
  budgetSection: { marginTop: 12 },
  budgetHeader: { paddingHorizontal: 16, marginBottom: 8 },
  budgetTitle: { fontSize: moderateScale(18), fontFamily: fonts.big, color: '#000000' },
  budgetSubtitle: { fontSize: moderateScale(12), fontFamily: fonts.medium, color: '#64748B', marginTop: 2 },
  budgetScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  budgetCard: {
    width: 140,
    height: 155,
    borderRadius: 22,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  budgetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  budgetBadgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  budgetBadgeText: {
    fontSize: moderateScale(8.5),
    fontFamily: fonts.big,
    letterSpacing: 0.3,
  },
  budgetCardPriceContainer: {
    alignItems: 'center',
    marginVertical: 2,
  },
  budgetCardPriceText: {
    fontSize: moderateScale(28),
    fontFamily: fonts.big,
  },
  budgetCardBody: {
    marginTop: 2,
  },
  budgetCardTitle: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  budgetCardSubtitle: {
    fontSize: moderateScale(10),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  budgetCardImageWrapper: {
    width: 140,
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetCardImage: {
    width: '100%',
    height: '100%',
  },

  /* Best Sellers Section */
  bestsellerSection: {
    marginTop: 12,
  },
  bestsellerHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bestsellerTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#000000',
  },
  bestsellerScrollContent: {
    paddingHorizontal: 16,
    gap: BESTSELLER_GAP,
    paddingBottom: 4,
  },
  bestsellerCard: {
    width: BESTSELLER_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
  },
  bestsellerDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  bestsellerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8B4FE',
  },
  bestsellerDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  /* Deals Of The Day Section (LinearGradient Background) */
  dealsLinearSection: {
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  dealsHeaderCard: {
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  dealsHeaderCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alarmIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealsTitle: {
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  dealsSubtitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
    marginTop: 2,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 14,
  },
  dealProductCard: {
    width: DEAL_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
  },
  imageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 6,
    paddingVertical: 2.5,
    paddingHorizontal: 5.5,
    zIndex: 10,
  },
  gradientBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    letterSpacing: 0.5,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  ratingText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginLeft: 4,
  },
  reviewDivider: {
    fontSize: moderateScale(12),
    color: '#CBD5E1',
    marginHorizontal: 6,
  },
  reviewText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 4,
    marginTop: 4,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.small,
    color: '#475569',
    lineHeight: moderateScale(18),
    minHeight: moderateScale(36),
  },
  brandText: {
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'nowrap',
  },
  finalPrice: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  originalPrice: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#FD3A2D',
    marginLeft: 4,
  },
  bestPriceText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#059669',
    marginTop: 4,
  },
  bestPriceAmount: {
    fontFamily: fonts.big,
  },
  addToBagButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  addToBagText: {
    color: colors.primary,
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
  },
  goToBagButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goToBagText: {
    color: '#FFFFFF',
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
  },
  outOfStockButton: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  outOfStockText: {
    color: '#FFFFFF',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 8,
  },
  outOfStockBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockBadgeLabel: {
    color: '#FFFFFF',
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    letterSpacing: 0.5,
  },
  bottomGradientFade: {
    height: 14,
    marginTop: 4,
  },

  /* Variant Selection Bottom Sheet Styles */
  variantSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  variantSheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  variantSheetSubTitle: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  variantOptionsList: {
    maxHeight: 280,
    marginVertical: 14,
  },
  variantOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  variantOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
  },
  variantRadioCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  variantOptionName: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  variantSkuText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    marginTop: 2,
  },
  variantPriceCol: {
    alignItems: 'flex-end',
  },
  variantFinalPrice: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  variantMrpPrice: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  confirmVariantBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  confirmVariantBtnText: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  homeFooter: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 36,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 10,
    width: '100%',
  },
  homeFooterTitle: {
    fontSize: moderateScale(48),
    fontFamily: fonts.big,
    color: '#82868B',
    textAlign: 'left',
    lineHeight: moderateScale(52),
    fontWeight: 'bold',
  },
  homeFooterSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  homeFooterSubtitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#9C9FA3',
  },
  heartText: {
    fontSize: moderateScale(14),
    color: '#EF4444',
  },
  // ─── BRANDS IN SPOTLIGHT ────────────────────
  spotlightSection: {
    marginTop: 12,
    marginBottom: 0,
    paddingTop: 12,
    paddingBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    position: 'relative',
  },
  spotlightTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#0F172A',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  adBadge: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  adBadgeText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    color: '#B45309',
    letterSpacing: 0.5,
  },
  spotlightScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotlightCard: {
    width: SPOTLIGHT_CARD_WIDTH,
    height: SPOTLIGHT_HERO_HEIGHT + 64,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(217, 180, 120, 0.45)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#8C6D3B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  spotlightCardContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  spotlightImageContainer: {
    width: '100%',
    height: SPOTLIGHT_HERO_HEIGHT,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    position: 'relative',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  spotlightOfferBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    zIndex: 2,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  spotlightOfferBadgeText: {
    color: '#0F172A',
    fontSize: moderateScale(9.5),
    fontFamily: fonts.big,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  spotlightBrandHeroImage: {
    width: '84%',
    height: '68%',
  },
  spotlightFallbackEmblem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightFallbackInitial: {
    fontSize: moderateScale(24),
    fontFamily: fonts.big,
    fontWeight: '800',
    color: '#92400E',
  },
  spotlightBrandFooter: {
    height: 64,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F6EEDB',
    borderBottomLeftRadius: 19,
    borderBottomRightRadius: 19,
  },
  spotlightBrandNameText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    letterSpacing: 0.8,
    color: '#0F172A',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  spotlightSubtitleText: {
    fontSize: moderateScale(10.5),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  spotlightViewAllCard: {
    height: SPOTLIGHT_HERO_HEIGHT + 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  spotlightViewAllInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFBEB',
  },
  spotlightViewAllCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  spotlightViewAllTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#0F172A',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  spotlightViewAllSubtitle: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
});
