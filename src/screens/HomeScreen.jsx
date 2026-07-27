import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  LayoutAnimation,
  Platform,
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
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import BottomSheetModal from '../components/BottomSheetModal';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { addToCart } from '../redux/cartSlice';
import { addToCartApi } from '../api/cart';
import { Skeleton } from '../components/Skeleton';

import fonts from '../theme/typography';
import colors from '../theme/colors';
import { moderateScale } from '../theme/responsive';

const { width: screenWidth } = Dimensions.get('window');
const BANNER_WIDTH = screenWidth - 32;
const DEALS_GAP = 14;
const DEAL_CARD_WIDTH = (screenWidth - 16 * 2 - DEALS_GAP) / 2;
const DEALS_SNAP_INTERVAL = (DEAL_CARD_WIDTH + DEALS_GAP) * 2;

function CategorySkeleton() {
  return (
    <View style={{ alignItems: 'center' }}>
      <Skeleton width={106} height={106} radius={22} />
      <Skeleton width={60} height={10} radius={4} style={{ marginTop: 8 }} />
    </View>
  );
}

function DealCardSkeleton() {
  return (
    <View
      style={{
        width: DEAL_CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 8,
      }}>
      <Skeleton width="100%" height={150} radius={12} />
      <Skeleton width="90%" height={11} radius={5} style={{ marginTop: 10 }} />
      <Skeleton width="60%" height={11} radius={5} style={{ marginTop: 6 }} />
      <Skeleton width="50%" height={14} radius={5} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={30} radius={8} style={{ marginTop: 8 }} />
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
  { id: '1', title: 'Lightning\nDeals', Icon: Zap, iconColor: '#EAB308', iconBg: '#FEF9C3' },
  { id: '2', title: 'Monsoon\nStore', Icon: Umbrella, iconColor: '#EC4899', iconBg: '#FCE7F3' },
  { id: '3', title: 'Free Gift\nInside', Icon: Gift, iconColor: '#EF4444', iconBg: '#FEE2E2' },
  { id: '4', title: 'Bestsellers\nof the Season', Icon: Award, iconColor: '#06B6D4', iconBg: '#ECFEFF' },
  { id: '5', title: 'Super\nSavers', Icon: Percent, iconColor: '#8B5CF6', iconBg: '#F3E8FF' },
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

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const dispatch = useDispatch();
  const [activeSlide, setActiveSlide] = useState(0);
  const [dealsActivePage, setDealsActivePage] = useState(0);
  const [searchHint, setSearchHint] = useState(SEARCH_SUGGESTIONS[0]);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: realProducts = [], isLoading: productsLoading } = useProducts({ per_page: 12 });
  const { data: brands = [] } = useBrands();
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

  const handleDealsScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offset / DEALS_SNAP_INTERVAL);
    setDealsActivePage(pageIndex);
  };

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [activeSlide]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (sliderRef.current) {
        sliderRef.current.scrollTo({
          x: ((activeSlide + 1) % 3) * BANNER_WIDTH,
          animated: true,
        });
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [activeSlide]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % SEARCH_SUGGESTIONS.length;
      setSearchHint(SEARCH_SUGGESTIONS[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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
            <Text numberOfLines={1} style={styles.searchPlaceholderText}>{searchHint}</Text>
          </TouchableOpacity>
        </View>
      </GridBackground>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* ── Top Lavender Grid Section ── */}
        <GridBackground style={styles.topLavenderSection}>
          {/* Weekend Sale Banner */}
          <TouchableOpacity style={styles.saleBannerContainer} activeOpacity={0.9}>
            <Image
              source={require('../../assets/top_banner.jpg')}
              style={styles.saleBannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Deal Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dealChipsScroll}>
            {DEAL_CHIPS.map((chip) => (
              <TouchableOpacity key={chip.id} style={styles.dealChipCard} activeOpacity={0.8}>
                <View style={[styles.chipIconContainer, { backgroundColor: chip.iconBg }]}>
                  <chip.Icon size={22} color={chip.iconColor} />
                </View>
                <Text style={styles.dealChipTitle}>{chip.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GridBackground>

        {/* ── Bottom White Section ── */}
        <View style={styles.bottomWhiteSection}>
          {/* New Luxury Ritual Banner Slider */}
          <View style={styles.luxuryBanner}>
            <ScrollView
              ref={sliderRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}>
          
              <TouchableOpacity activeOpacity={0.95} style={{ width: BANNER_WIDTH, height: 180 }}>
                <Image
                  source={require('../../assets/luxury_banner.png')}
                  style={styles.luxuryBannerImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              
              <TouchableOpacity activeOpacity={0.95} style={{ width: BANNER_WIDTH, height: 180 }}>
                <Image
                  source={require('../../assets/luxury_banner_3.png')}
                  style={styles.luxuryBannerImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            
              <TouchableOpacity activeOpacity={0.95} style={{ width: BANNER_WIDTH, height: 180 }}>
                <Image
                  source={require('../../assets/luxury_banner_6.png')}
                  style={styles.luxuryBannerImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </ScrollView>
          </View>
          
          {/* Carousel Dots below the banner */}
          <View style={styles.luxuryBannerDots}>
            <View style={[styles.luxuryDot, activeSlide === 0 && styles.luxuryDotActive]} />
            <View style={[styles.luxuryDot, activeSlide === 1 && styles.luxuryDotActive]} />
            <View style={[styles.luxuryDot, activeSlide === 2 && styles.luxuryDotActive]} />
          </View>

          {/* Categories Section */}
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Categories</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}>
              {categoriesLoading ? (
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
                categories.map((cat) => {
                  const imageSource = cat.images?.[0] ? { uri: cat.images[0] } : require('../../assets/dummy_product.png');
                  return (
                    <TouchableOpacity
                      key={cat._id}
                      style={styles.categoryItem}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('Products', { categoryId: cat._id, categoryName: cat.name })}>
                      <Image source={imageSource} style={styles.categoryItemImage} />
                      <Text style={styles.categoryItemLabel}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* ── Deals Of The Day (Light Primary Purple LinearGradient Background) ── */}
          <LinearGradient
            colors={['#F3E8FF', '#FAF5FF', '#FFFFFF']}
            style={styles.dealsLinearSection}>
            {/* Centered Banner Header */}
            <View style={styles.dealsHeaderCard}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.dealsTitle}>Deals Of The Day</Text>
                <Text style={styles.dealsSubtitle}>Here today, gone tomorrow.</Text>
              </View>
            </View>

            {productsLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={DEALS_SNAP_INTERVAL}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={styles.dealsSwiperContent}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <DealCardSkeleton key={i} />
                ))}
              </ScrollView>
            ) : realProducts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={DEALS_SNAP_INTERVAL}
                decelerationRate="fast"
                snapToAlignment="start"
                onScroll={handleDealsScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.dealsSwiperContent}>
                {realProducts.map((item) => {
                  const itemId = item._id || item.id;
                  const isInCart = cartItems.some((ci) => (ci.productId || ci.id) === itemId);
                  const isLoadingThis = loadingProductId === itemId;

                  const originalPrice = item.price || 0;
                  const finalPrice = item.discounted_price || item.price || 0;
                  const discount =
                    originalPrice > finalPrice
                      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
                      : 0;

                  const imageSource = item.images?.[0]
                    ? { uri: item.images[0] }
                    : item.image
                    ? { uri: item.image }
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

                  return (
                    <TouchableOpacity
                      key={item._id || item.id}
                      style={styles.swiperProductCard}
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
                        <Image
                          source={imageSource}
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
            ) : null}

            {!productsLoading && realProducts.length > 2 && (
              <View style={styles.dealsDotsRow}>
                {Array.from({ length: Math.ceil(realProducts.length / 2) }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dealsDot, dealsActivePage === i && styles.dealsDotActive]}
                  />
                ))}
              </View>
            )}

            {/* Bottom Soft Purple Fade */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', '#FAF5FF', '#F3E8FF']}
              style={styles.bottomGradientFade}
            />
          </LinearGradient>
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
    borderRadius: 12,
    minHeight: moderateScale(50),
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { marginRight: 10 },
  searchPlaceholderText: { flex: 1, fontSize: moderateScale(14), fontFamily: fonts.medium, color: '#94A3B8' },
  scrollContent: { paddingBottom: 24 },
  saleBannerContainer: { margin: 16, borderRadius: 16, overflow: 'hidden', height: 180, backgroundColor: '#F3E8FF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  saleBannerImage: { width: '100%', height: '100%' },
  dealChipsScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  dealChipCard: { width: 90, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, alignItems: 'center' },
  chipIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  dealChipTitle: { fontSize: moderateScale(9), fontFamily: fonts.medium, color: '#334155', textAlign: 'center', lineHeight: moderateScale(12) },
  luxuryBanner: { marginHorizontal: 16, borderRadius: 16, backgroundColor: '#E4E4E1', height: 180, position: 'relative', overflow: 'hidden' },
  luxuryBannerImage: { width: BANNER_WIDTH, height: '100%' },
  luxuryBannerDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  luxuryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  luxuryDotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  categoriesSection: { marginTop: 24 },
  categoriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  categoriesTitle: { fontSize: moderateScale(18), fontFamily: fonts.big, color: '#000000' },
  categoriesScroll: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  categoryItem: { alignItems: 'center' },
  categoryItemImage: { width: 106, height: 106, borderRadius: 22 },
  categoryItemLabel: { marginTop: 8, fontSize: moderateScale(12), fontFamily: fonts.medium, color: '#1E1B4B', textAlign: 'center' },
  categoriesLoadingContainer: { height: 100, width: BANNER_WIDTH, alignItems: 'center', justifyContent: 'center' },
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
  dealsSwiperContent: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 8,
  },
  dealsDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dealsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D8B4FE' },
  dealsDotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  productsLoadingBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swiperProductCard: {
    width: DEAL_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
});
