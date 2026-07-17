import React, { useState, useEffect } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Zap,
  Gift,
  Umbrella,
  Award,
  Percent,
} from 'lucide-react-native';

import fonts from '../theme/typography';
import colors from '../theme/colors';

// ─── Primary light shade (tint of colors.primary #4361ee) ────────────────────
const LAVENDER = colors.primaryLight ?? '#E8EDFD'; // very light blue tint
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
    width: 1,
    backgroundColor: GRID_LINE,
  },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
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

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        backgroundColor={LAVENDER}
        barStyle="dark-content"
        translucent={false}
      />

      {/* ── Search Bar ── */}
      <GridBackground style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder={searchHint}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            editable={false}
          />
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
              source={require('../../assets/weekend_sale.png')}
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
          <View style={styles.adBanner}>
            <View style={styles.adLeft}>
              <Text style={styles.adBrandLogo}>mamaearth®</Text>
              <Text style={styles.adBrandTagline}>goodness inside</Text>
              <Text style={styles.adTitle}>Remove Tan &{"\n"}Glow Naturally</Text>
              <Text style={styles.adSubTitle}>with Ubtan Face Wash</Text>
              <View style={styles.adPromoBox}>
                <Text style={styles.adPromoTextBold}>Get 2 freebie on ₹299</Text>
                <Text style={styles.adPromoTextSmall}>3 freebies on ₹349</Text>
              </View>
            </View>

            <View style={styles.adRight}>
              <View style={styles.modelAvatarFrame}>
                <View style={styles.modelAvatarCircle}>
                  <Text style={styles.modelAvatarText}>👩</Text>
                </View>
              </View>
              <View style={styles.polaroidFrame}>
                <View style={styles.polaroidInnerCard}>
                  <Image
                    source={require('../../assets/ubtan_wash.png')}
                    style={styles.polaroidProductImage}
                    resizeMode="cover"
                  />
                  <View style={styles.polaroidFooter}>
                    <Text style={styles.heartIcon}>❤️</Text>
                    <Text style={styles.polaroidText}>Most Loved</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Carousel Dots */}
          <View style={styles.carouselDots}>
            {[0, 1, 2, 3, 4].map((dot, index) => (
              <View
                key={dot}
                style={[styles.carouselDot, index === 4 && styles.carouselDotActive]}
              />
            ))}
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
  scrollContent: {
    paddingBottom: 24,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
  },
  categoryItem: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: fonts.big,
    color: '#64748B',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  categoryLabelActive: {
    color: '#000000',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -12,
    width: '120%',
    height: 3,
    backgroundColor: '#000000',
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
  adBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    backgroundColor: '#FFFDF5',
    flexDirection: 'row',
    padding: 16,
    height: 180,
  },
  adLeft: {
    flex: 1.3,
    justifyContent: 'center',
  },
  adBrandLogo: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: '#15803D',
  },
  adBrandTagline: {
    fontSize: 8,
    fontFamily: fonts.medium,
    color: '#16A34A',
    marginTop: -2,
    marginBottom: 8,
  },
  adTitle: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: '#7C2D12',
    lineHeight: 17,
  },
  adSubTitle: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#7C2D12',
    marginTop: 2,
    marginBottom: 12,
  },
  adPromoBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  adPromoTextBold: {
    fontSize: 9,
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  adPromoTextSmall: {
    fontSize: 8,
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 1,
  },
  adRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modelAvatarFrame: {
    width: 60,
    height: 80,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    justifyContent: 'flex-end',
    marginRight: 24,
  },
  modelAvatarCircle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF08A',
  },
  modelAvatarText: {
    fontSize: 32,
  },
  polaroidFrame: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    width: 72,
    height: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '-6deg' }],
  },
  polaroidInnerCard: {
    flex: 1,
    alignItems: 'center',
  },
  polaroidProductImage: {
    width: 60,
    height: 68,
    borderRadius: 4,
  },
  polaroidFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  heartIcon: {
    fontSize: 7,
  },
  polaroidText: {
    fontSize: 6,
    fontFamily: fonts.big,
    color: '#334155',
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  carouselDotActive: {
    backgroundColor: '#78350F',
  },
});
