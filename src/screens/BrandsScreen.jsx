import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Search, ChevronLeft } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { useBrands } from '../hooks/useBrands';

const DUMMY_IMG = require('../../assets/dummy_product.png');

export default function BrandsScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [search, setSearch] = useState('');
  const {
    data: brands = [],
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useBrands();

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Split into rows of 3
  const rows = [];
  for (let i = 0; i < filtered.length; i += 3) {
    rows.push(filtered.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {isFocused && <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />}

      {/* Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation ? navigation.goBack() : null}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        
        <View style={styles.searchBarContainer}>
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

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            {error?.message || 'Failed to load brands.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }>

          {/* Heading */}
          <Text style={styles.sectionTitle}>Brands in Focus</Text>

          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>
              {search ? 'No brands match your search.' : 'No brands available yet.'}
            </Text>
          ) : (
            rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.row}>
                {row.map((brand) => (
                  <TouchableOpacity
                    key={brand._id}
                    style={styles.brandCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('Products', {
                        brandId: brand._id,
                        brandName: brand.name,
                      })
                    }>
                    <Image
                      source={
                        brand.images?.[0] ? { uri: brand.images[0] } : DUMMY_IMG
                      }
                      style={styles.brandImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.brandName} numberOfLines={2}>
                      {brand.name}
                    </Text>
                    {brand.newly_launched ? (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>New</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
                {/* Fill empty slots if row < 3 */}
                {row.length < 3 &&
                  Array.from({ length: 3 - row.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.emptyCard} />
                  ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
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
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: colors.white,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
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
    padding: 12,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#EEF1F3',
    overflow: 'hidden',
  },
  brandImage: {
    width: '100%',
    height: 72,
  },
  brandName: {
    fontSize: 12,
    fontFamily: fonts.big,
    lineHeight: 15,
    color: colors.text,
    textAlign: 'center',
    marginTop: 10,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.white,
  },
  emptyCard: {
    flex: 1,
  },
});
