import React, { useState } from 'react';
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
import { Search } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';

const BRANDS = [
  { id: '1',  name: 'ALPS',          sub: 'Goodness',       bg: '#F2C6C6', textColor: '#7B1D1D' },
  { id: '2',  name: 'DERMDOC',       sub: 'Honest Science',  bg: '#BFDDFF', textColor: '#1A3A6B' },
  { id: '3',  name: 'GOOD VIBES',    sub: '',                bg: '#EDD9B0', textColor: '#5C3A00' },
  { id: '4',  name: 'LAKMÉ',         sub: '',                bg: '#FFFFFF', textColor: '#1A1A1A' },
  { id: '5',  name: 'DOT & KEY',     sub: '',                bg: '#FFF0A0', textColor: '#5C4000' },
  { id: '6',  name: 'MAYBELLINE\nNEW YORK', sub: '',        bg: '#F5F5F5', textColor: '#000000' },
  { id: '7',  name: 'NYbae',         sub: '',                bg: '#E8D5B7', textColor: '#3B2000' },
  { id: '8',  name: 'FACES CANADA',  sub: '',                bg: '#FFD6E0', textColor: '#7B0020' },
  { id: '9',  name: 'the dermaCo',   sub: '',                bg: '#E0D0F5', textColor: '#3A006F' },
  { id: '10', name: "POND'S",        sub: '',                bg: '#C9EEFF', textColor: '#003A5C' },
  { id: '11', name: "L'ORÉAL\nPARIS",sub: '',               bg: '#FFE5A0', textColor: '#5C3500' },
  { id: '12', name: 'mamaearth',     sub: '',                bg: '#C8EAC0', textColor: '#1A4A00' },
];

const DUMMY_IMG = require('../../assets/dummy_product.png');

export default function BrandsScreen() {
  const [search, setSearch] = useState('');

  const filtered = BRANDS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Split into rows of 3
  const rows = [];
  for (let i = 0; i < filtered.length; i += 3) {
    rows.push(filtered.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search for Brands"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Heading */}
        <Text style={styles.sectionTitle}>Brands in Focus</Text>

        {/* 3-Column Brand Grid */}
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((brand) => (
              <TouchableOpacity
                key={brand.id}
                style={[styles.brandCard, { backgroundColor: brand.bg }]}
                activeOpacity={0.85}>
                {/* Brand Name */}
                <Text style={[styles.brandName, { color: brand.textColor }]}>
                  {brand.name}
                </Text>
                {brand.sub ? (
                  <Text style={[styles.brandSub, { color: brand.textColor }]}>
                    {brand.sub}
                  </Text>
                ) : null}

                {/* Dummy product image */}
                <Image
                  source={DUMMY_IMG}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
            {/* Fill empty slots if row < 3 */}
            {row.length < 3 &&
              Array.from({ length: 3 - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.emptyCard} />
              ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.big,
    color: colors.text,
    marginTop: 18,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  brandCard: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    minHeight: 140,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  brandName: {
    fontSize: 12,
    fontFamily: fonts.big,
    lineHeight: 15,
  },
  brandSub: {
    fontSize: 8,
    fontFamily: fonts.medium,
    marginTop: 1,
    opacity: 0.7,
  },
  productEmoji: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emojiText: {
    fontSize: 32,
  },
  emptyCard: {
    flex: 1,
  },
});
