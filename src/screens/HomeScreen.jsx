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
import {
  Search,
  Zap,
  Gift,
  Umbrella,
  Award,
  Percent,
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useCategories } from '../hooks/useCategories';

import fonts from '../theme/typography';
import colors from '../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
const BANNER_WIDTH = screenWidth - 32;

// ─── Primary light shade (tint of colors.primary #7209b7) ────────────────────
const LAVENDER = colors.primaryLight ?? '#865ea6ff'; // light purple tint
const GRID_LINE = 'rgba(255,255,255,0.6)'; // subtle white grid lines
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
    backgroundColor: LAVENDER,
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

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [searchHint, setSearchHint] = useState(SEARCH_SUGGESTIONS[0]);
  const [activeSlide, setActiveSlide] = useState(0);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const sliderRef = useRef(null);

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.floor((offset + slideSize / 2) / slideSize);
    setActiveSlide(activeIndex);
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
          backgroundColor={LAVENDER}
          barStyle="dark-content"
          translucent={false}
        />
      )}

      {/* ── Search Bar ── */}
      <GridBackground style={styles.searchSection}>
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Search')}>
          <Search size={20} color="#64748B" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholderText}>{searchHint}</Text>
        </TouchableOpacity>
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
              {/* <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity> */}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}>
              {categoriesLoading ? (
                <View style={styles.categoriesLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LAVENDER,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topLavenderSection: {
    paddingBottom: 16,
  },
  bottomWhiteSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 24,
  },
  searchSection: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 0.8,
    borderColor: '#D0C8E8',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  searchPlaceholderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#94A3B8',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  saleBannerContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#F3E8FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  saleBannerImage: {
    width: '100%',
    height: '100%',
  },
  dealChipsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 16,
  },
  dealChipCard: {
    width: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'center',
  },
  chipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dealChipTitle: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 12,
  },
  luxuryBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#E4E4E1', // premium warm light grey/beige
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  luxuryBannerImage: {
    width: BANNER_WIDTH,
    height: '100%',
  },
  luxuryBannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  luxuryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1', // light neutral grey inactive dot
  },
  luxuryDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary, // active dot uses theme primary color
  },
  categoriesSection: {
    marginTop: 24,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoriesTitle: {
    fontSize: 18,
    fontFamily: fonts.big,
    color: '#000000',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#94A3B8',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 16,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryItemImage: {
    width: 106,
    height: 106,
    borderRadius: 22,
  },
  categoryItemLabel: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: '#000000',
  },
  categoriesLoadingContainer: {
    height: 100,
    width: BANNER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
