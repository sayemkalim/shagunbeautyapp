import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
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
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import BottomSheetModal from '../components/BottomSheetModal';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { useBanners } from '../hooks/useBanners';
import { useMarquee } from '../hooks/useMarquee';
import { addToCart } from '../redux/cartSlice';
import { addToCartApi } from '../api/cart';
import { Skeleton } from '../components/Skeleton';
import MarqueeBanner from '../components/MarqueeBanner';

import fonts from '../theme/typography';

const DUMMY_IMG = require('../../assets/dummy_product.png');
import colors from '../theme/colors';
import { moderateScale } from '../theme/responsive';

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

function RemoteImage({ source, defaultSource, style, resizeMode = 'cover', radius = 0 }) {
  const [loaded, setLoaded] = useState(false);
  const isLocalSource = typeof source === 'number';

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {!loaded && !isLocalSource && (
        <Skeleton style={StyleSheet.absoluteFill} radius={radius} fillParent />
      )}
      <Image
        source={source}
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
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [activeSlide, setActiveSlide] = useState(0);
  const [bestsellerActivePage, setBestsellerActivePage] = useState(0);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: realProducts = [], isLoading: productsLoading } = useProducts({ per_page: 30 });
  const { data: brands = [] } = useBrands();
  const { data: banners = [], isLoading: bannersLoading } = useBanners();
  const { data: activeMarquees = [] } = useMarquee();

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

  // Seeded daily shuffle of brands (exactly 8 elements)
  const shuffledBrands = useMemo(() => {
    if (!brands || brands.length === 0) return [];
    
    const d = new Date();
    const dateStr = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;
    const seed = parseInt(dateStr, 10);
    
    // Seeded pseudorandom generator
    const seededRandom = (s) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const shuffled = [...brands];
    let currentSeed = seed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const r = seededRandom(currentSeed);
      currentSeed += 1;
      const j = Math.floor(r * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 8);
  }, [brands]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['brands'] }),
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
        queryClient.invalidateQueries({ queryKey: ['marquee'] }),
      ]);
    } catch (error) {
      console.error('Home refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

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
        imageSource: banner.banner_url
          ? { uri: banner.banner_url, cache: 'force-cache' }
          : banner.image,
      })),
    [bannerSlides]
  );
  const categoryItems = useMemo(
    () =>
      categories.map((cat) => ({
        cat,
        imageSource: cat.images?.[0]
          ? { uri: cat.images[0], cache: 'force-cache' }
          : require('../../assets/dummy_product.png'),
      })),
    [categories]
  );
  const dealsProducts = useMemo(
    () =>
      realProducts.slice(0, 30).map((item) => {
        const itemId = item._id || item.id;
        const originalPrice = item.price || 0;
        const finalPrice = item.discounted_price || item.price || 0;
        const discount =
          originalPrice > finalPrice
            ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
            : 0;
        const imageSource = item.images?.[0]
          ? { uri: item.images[0], cache: 'force-cache' }
          : item.image
          ? { uri: item.image, cache: 'force-cache' }
          : require('../../assets/dummy_product.png');

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
      const imageSource = item.images?.[0]
        ? { uri: item.images[0], cache: 'force-cache' }
        : item.image
        ? { uri: item.image, cache: 'force-cache' }
        : require('../../assets/dummy_product.png');

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

  const cartItems = useSelector((state) => state.cart.items || []);
  const [loadingProductId, setLoadingProductId] = useState(null);

  const handleAddToCart = async (product) => {
    const pId = product._id || product.id;
    const isInCart = cartItems.some((ci) => (ci.productId || ci.id) === pId);

    if (isInCart) {
      navigation.navigate('Bag');
      return;
    }

    setLoadingProductId(pId);

    const originalPrice = product.price || 0;
    const finalPrice = product.discounted_price || product.price || 999;
    
    let bName = '';
    if (typeof product.brand === 'object' && product.brand?.name) {
      bName = product.brand.name;
    } else if (product.brandName) {
      bName = product.brandName;
    } else if (typeof product.brand === 'string') {
      if (/^[0-9a-fA-F]{24}$/.test(product.brand)) {
        const found = brands.find((b) => b._id === product.brand);
        bName = found ? found.name : '';
      } else {
        bName = product.brand;
      }
    }

    const imageUri = product.images?.[0] || product.image || product.banner_image;

    dispatch(
      addToCart({
        productId: pId,
        name: product.name,
        brandName: bName,
        price: originalPrice > 0 ? originalPrice : finalPrice,
        discountedPrice: finalPrice,
        image: imageUri,
        quantity: 1,
      })
    );

    try {
      await addToCartApi({
        type: 'product',
        productId: pId,
        quantity: 1,
      });
    } catch (e) {
      console.log('Add to cart API error:', e);
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.floor((offset + slideSize / 2) / slideSize);
    setActiveSlide(activeIndex);
  };

  const handleBestsellerScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offset / BESTSELLER_SNAP_INTERVAL);
    setBestsellerActivePage(pageIndex);
  };


  useEffect(() => {
    if (bannerSlides.length < 2) return undefined;
    const timer = setInterval(() => {
      if (sliderRef.current) {
        sliderRef.current.scrollTo({
          x: ((activeSlide + 1) % bannerSlides.length) * BANNER_WIDTH,
          animated: true,
        });
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [activeSlide, bannerSlides.length]);

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

      <ScrollView
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
        }>

        {/* ── Top Lavender Grid Section ── */}
        <GridBackground style={styles.topLavenderSection}>
          {/* Continuous Sliding Marquee Sale Banner (Only rendered when active marquee exists from API) */}
          {marqueeItems.length > 0 && (
            <MarqueeBanner
              items={marqueeItems}
              onPress={() =>
                navigation.navigate('Products', {
                  filterType: 'supersaver',
                  headerTitle: 'Super Festive Sale',
                })
              }
            />
          )}

          {/* Weekend Sale Banner */}
          <TouchableOpacity style={styles.saleBannerContainer} activeOpacity={0.9}>
            <Image
              source={require('../../assets/luxury_banner.png')}
              style={styles.saleBannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Deal Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dealChipsScroll}>
            {DEAL_CHIPS.map((chip) => {
              const hasImage = !!chip.image;
              return (
                <TouchableOpacity
                  key={chip.id}
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
            })}
          </ScrollView>
        </GridBackground>

        {/* ── Bottom White Section ── */}
        <View style={styles.bottomWhiteSection}>
          {/* New Luxury Ritual Banner Slider */}
          <View style={styles.luxuryBanner}>
            {(bannersLoading || refreshing) ? (
              <Skeleton width={BANNER_WIDTH} height={180} radius={16} />
            ) : (
              <ScrollView
                ref={sliderRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}>
                {bannerItems.map(({ banner, key, imageSource }) => {
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.95}
                      style={{ width: BANNER_WIDTH, height: 180 }}
                      onPress={() => {
                        if (banner.product?._id) {
                          navigation.navigate('ProductDetail', {
                            productId: banner.product._id,
                            product: banner.product,
                          });
                        }
                      }}>
                      <RemoteImage
                        source={imageSource}
                        defaultSource={require('../../assets/dummy_product.png')}
                        style={styles.luxuryBannerImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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

          {/* Categories Section */}
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Categories</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}>
              {(categoriesLoading || refreshing) ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={styles.categoryItem}>
                    <CategorySkeleton />
                  </View>
                ))
              ) : categories.length === 0 ? (
                CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryItem}
                    activeOpacity={0.95}
                    onPress={() => navigation.navigate('Products', { categoryId: cat.id, categoryName: cat.name })}>
                    <Image source={cat.image} style={styles.categoryItemImage} />
                    <Text style={styles.categoryItemLabel}>{cat.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                categoryItems.map(({ cat, imageSource }) => {
                  return (
                    <TouchableOpacity
                      key={cat._id}
                      style={styles.categoryItem}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('Products', { categoryId: cat._id, categoryName: cat.name })}>
                      <RemoteImage source={imageSource} defaultSource={require('../../assets/dummy_product.png')} style={styles.categoryItemImage} radius={42} />
                      <Text style={styles.categoryItemLabel}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

    

          {/* ── Budget Beauty Store Section ── */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>Budget Beauty Store</Text>
              {/* <Text style={styles.budgetSubtitle}>Premium beauty for every pocket</Text> */}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.budgetScroll}>
              {BUDGET_STORES.map((store) => {
                return (
                  <TouchableOpacity
                    key={store.id}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('Products', {
                        maxPrice: store.maxPrice,
                        headerTitle: `${store.title} Store`,
                      })
                    }>
                    {store.image ? (
                      <View style={styles.budgetCardImageWrapper}>
                        <Image
                          source={store.image}
                          style={styles.budgetCardImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <LinearGradient
                        colors={store.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.budgetCard}>
                        <View style={styles.budgetCardHeader}>
                          <View style={[styles.budgetBadgeContainer, { backgroundColor: `${store.accent}15` }]}>
                            <Text style={[styles.budgetBadgeText, { color: store.accent }]}>{store.badge}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.budgetCardPriceContainer}>
                          <Text style={[styles.budgetCardPriceText, { color: store.accent }]}>{store.priceText}</Text>
                        </View>

                        <View style={styles.budgetCardBody}>
                          <Text style={styles.budgetCardTitle}>{store.title}</Text>
                          <Text style={styles.budgetCardSubtitle}>{store.subtitle}</Text>
                        </View>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Best Sellers Slider Section ── */}
          {(productsLoading || refreshing || bestsellerProducts.length > 0) ? (
            <View style={styles.bestsellerSection}>
              <View style={styles.bestsellerHeader}>
                <Text style={styles.bestsellerTitle}>Best Sellers</Text>
              </View>

              {(productsLoading || refreshing) ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={BESTSELLER_SNAP_INTERVAL}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  contentContainerStyle={styles.bestsellerScrollContent}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <View key={i} style={styles.bestsellerCard}>
                      <Skeleton width="100%" height={150} radius={12} />
                      <Skeleton width="90%" height={11} radius={5} style={{ marginTop: 10 }} />
                      <Skeleton width="60%" height={11} radius={5} style={{ marginTop: 6 }} />
                      <Skeleton width="50%" height={14} radius={5} style={{ marginTop: 8 }} />
                      <Skeleton width="100%" height={36} radius={10} style={{ marginTop: 12 }} />
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={BESTSELLER_SNAP_INTERVAL}
                    decelerationRate="fast"
                    snapToAlignment="start"
                    onScroll={handleBestsellerScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.bestsellerScrollContent}>
                    {bestsellerProducts.map(({ item, itemId, originalPrice, finalPrice, discount, imageSource, brandNameStr, titleText }) => {
                      const isInCart = cartItems.some((ci) => (ci.productId || ci.id) === itemId);
                      const isLoadingThis = loadingProductId === itemId;

                      return (
                        <TouchableOpacity
                          key={item._id || item.id}
                          style={styles.bestsellerCard}
                          activeOpacity={0.85}
                          onPress={() =>
                            navigation.navigate('ProductDetail', {
                              productId: item._id || item.id,
                              product: item,
                            })
                          }>
                          {/* Image Box */}
                          <View style={styles.imageContainer}>
                            <LinearGradient
                              colors={['#A78BFA', colors.primary]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.gradientBadge}>
                              <Text style={styles.gradientBadgeText}>BESTSELLER</Text>
                            </LinearGradient>
                            <RemoteImage
                              source={imageSource}
                              defaultSource={require('../../assets/dummy_product.png')}
                              style={styles.productImage}
                              resizeMode="cover"
                            />
                          </View>

                          {/* Details Container */}
                          <View style={styles.detailsContainer}>
                            <View>
                              <Text numberOfLines={2} style={styles.productTitle}>
                                {brandNameStr ? <Text style={styles.brandText}>{brandNameStr} </Text> : null}
                                {titleText}
                              </Text>

                              {/* Price Row */}
                              <View style={styles.priceRow}>
                                {discount > 0 ? (
                                  <>
                                    <Text style={styles.originalPrice}>₹{originalPrice}</Text>
                                    <Text style={styles.finalPrice}>₹{finalPrice}</Text>
                                    <Text style={styles.discountText}>{discount}% OFF</Text>
                                  </>
                                ) : (
                                  <Text style={styles.finalPrice}>₹{finalPrice}</Text>
                                )}
                              </View>
                            </View>

                            {/* ADD TO BAG / GO TO BAG Button with Spinner */}
                            <TouchableOpacity
                              style={[styles.addToBagButton, isInCart && styles.goToBagButton]}
                              activeOpacity={0.85}
                              disabled={isLoadingThis}
                              onPress={() => handleAddToCart(item)}>
                              {isLoadingThis ? (
                                <ActivityIndicator size="small" color={isInCart ? '#FFFFFF' : colors.primary} />
                              ) : (
                                <Text style={[styles.addToBagText, isInCart && styles.goToBagText]}>
                                  {isInCart ? 'GO TO BAG' : 'ADD TO BAG'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

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
          ) : null}

          {/* ── Deals Of The Day (Light Primary Purple LinearGradient Background) ── */}
          <LinearGradient
            colors={['#F3E8FF', '#FAF5FF', '#FFFFFF']}
            style={styles.dealsLinearSection}>
            {/* Centered Banner Header */}
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
                {dealsProducts.map(({ item, itemId, originalPrice, finalPrice, discount, imageSource, brandNameStr, titleText }) => {
                  const isInCart = cartItems.some((ci) => (ci.productId || ci.id) === itemId);
                  const isLoadingThis = loadingProductId === itemId;

                  return (
                    <TouchableOpacity
                      key={item._id || item.id}
                      style={styles.dealProductCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate('ProductDetail', {
                          productId: item._id || item.id,
                          product: item,
                        })
                      }>
                      {/* Image Box */}
                      <View style={styles.imageContainer}>
                        {(item.is_best_seller || item.isBestSeller || item.is_bestseller || item.tag === 'bestseller') && (
                          <LinearGradient
                            colors={['#A78BFA', colors.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBadge}>
                            <Text style={styles.gradientBadgeText}>BESTSELLER</Text>
                          </LinearGradient>
                        )}
                        <RemoteImage
                          source={imageSource}
                          defaultSource={require('../../assets/dummy_product.png')}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      </View>

                      {/* Details Container */}
                      <View style={styles.detailsContainer}>
                        <View>
                          <Text numberOfLines={2} style={styles.productTitle}>
                            {brandNameStr ? <Text style={styles.brandText}>{brandNameStr} </Text> : null}
                            {titleText}
                          </Text>

                          {/* Price Row */}
                          <View style={styles.priceRow}>
                            {discount > 0 ? (
                              <>
                                <Text style={styles.originalPrice}>₹{originalPrice}</Text>
                                <Text style={styles.finalPrice}>₹{finalPrice}</Text>
                                <Text style={styles.discountText}>{discount}% OFF</Text>
                              </>
                            ) : (
                              <Text style={styles.finalPrice}>₹{finalPrice}</Text>
                            )}
                          </View>
                        </View>

                        {/* ADD TO BAG / GO TO BAG Button with Spinner */}
                        <TouchableOpacity
                          style={[styles.addToBagButton, isInCart && styles.goToBagButton]}
                          activeOpacity={0.85}
                          disabled={isLoadingThis}
                          onPress={() => handleAddToCart(item)}>
                          {isLoadingThis ? (
                            <ActivityIndicator size="small" color={isInCart ? '#FFFFFF' : colors.primary} />
                          ) : (
                            <Text style={[styles.addToBagText, isInCart && styles.goToBagText]}>
                              {isInCart ? 'GO TO BAG' : 'ADD TO BAG'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
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

          {/* Premium Home Screen Footer */}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  topLavenderSection: { paddingBottom: 16 },
  bottomWhiteSection: { backgroundColor: '#FFFFFF', paddingTop: 16, paddingBottom: 24 },
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
  scrollContent: { paddingBottom: 24 },
  saleBannerContainer: { margin: 16, borderRadius: 18, overflow: 'hidden', height: 180, backgroundColor: '#F3E8FF' },
  saleBannerImage: { width: '100%', height: '100%' },
  dealChipsScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
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
  luxuryBannerDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  luxuryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  luxuryDotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  categoriesSection: { marginTop: 24 },
  categoriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  categoriesTitle: { fontSize: moderateScale(18), fontFamily: fonts.big, color: '#000000' },
  categoriesScroll: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
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
  budgetSection: { marginTop: 24 },
  budgetHeader: { paddingHorizontal: 16, marginBottom: 12 },
  budgetTitle: { fontSize: moderateScale(18), fontFamily: fonts.big, color: '#000000' },
  budgetSubtitle: { fontSize: moderateScale(12), fontFamily: fonts.medium, color: '#64748B', marginTop: 2 },
  budgetScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
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
    marginTop: 24,
  },
  bestsellerHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
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
    marginTop: 12,
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
    marginTop: 24,
    paddingTop: 18,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  dealsHeaderCard: {
    alignItems: 'center',
    marginBottom: 18,
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
  bottomGradientFade: {
    height: 24,
    marginTop: 10,
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
    paddingVertical: 56,
    paddingHorizontal: 36,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 18,
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
    marginTop: 18,
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
  brandsSection: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 8,
    borderBottomColor: '#F8FAFC',
  },
  brandsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandsTitle: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  brandsViewAll: {
    fontSize: moderateScale(13),
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  brandGridItem: {
    width: '23%',
    alignItems: 'center',
  },
  brandGridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  brandGridImage: {
    width: '76%',
    height: '76%',
  },
  brandGridName: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#1E1B4B',
    marginTop: 8,
    width: '100%',
    textAlign: 'center',
  },
  brandGridExplore: {
    fontSize: moderateScale(8.5),
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: 1.2,
    marginTop: 2,
    opacity: 0.8,
  },
});
