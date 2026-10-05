import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ArrowUpDown,
  Search,
  X,
  Tag,
  Handbag,
  Inbox,
} from 'lucide-react-native';

import { useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { useProducts } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { useCartStore } from '../store/cartStore';
import { ProductCardSkeleton } from '../components/Skeleton';
import ProductCard from '../components/ProductCard';
import MarqueeText from '../components/MarqueeText';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

const { height } = Dimensions.get('window');

const SORT_OPTIONS = [
  "What's new",
  "Price - high to low",
  "Popularity",
  "Discount",
  "Price - low to high",
];

const parsePrice = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal) || 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

export default function ProductsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const numColumns = isTablet ? 3 : 2;
  const cardGap = 12;
  const COLUMN_WIDTH = (width - 24 - (cardGap * (numColumns - 1))) / numColumns;

  const {
    categoryId,
    categoryName,
    brandId,
    brandName,
    headerTitle,
    filterType,
    minPrice,
    maxPrice,
    bannerProducts,
  } = route.params || {};

  const hasBannerProducts = Array.isArray(bannerProducts) && bannerProducts.length > 0;
  const screenTitle =
    headerTitle ||
    brandName ||
    categoryName ||
    (hasBannerProducts ? 'Special Offers' : 'Products');
  
  // Sheet state: null | 'sort' | 'brand' | 'gender' | 'filters'
  const [activeModal, setActiveModal] = useState(null);
  
  // Filter/Sort states
  const [sortBy, setSortBy] = useState("What's new");
  const [selectedBrands, setSelectedBrands] = useState(() => {
    if (brandId) return { [brandId]: true };
    if (brandName) return { [brandName]: true };
    return {};
  });
  const [brandSearch, setBrandSearch] = useState('');
  const [favorites, setFavorites] = useState({});

  const cartTotalQuantity = useCartStore((state) => state.totalQuantity);
  const cartItems = useCartStore((state) => state.items);
  const effectiveCartCount = cartTotalQuantity || (cartItems?.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 0);

  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isFocused) {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  }, [isFocused, queryClient]);

  const { data: brands = [], isLoading: isBrandsLoading } = useBrands();

  useEffect(() => {
    if (brandId) {
      setSelectedBrands({ [brandId]: true });
    } else if (brandName) {
      const match = brands.find(
        (b) => b.name && b.name.trim().toLowerCase() === brandName.trim().toLowerCase()
      );
      if (match) {
        setSelectedBrands({ [match._id]: true });
      } else {
        setSelectedBrands({ [brandName]: true });
      }
    }
  }, [brandId, brandName, brands]);

  // API calls - always request full catalog page (per_page: 1000) so no brand products are cut off
  const {
    data: fetchedProducts = [],
    isLoading: isProductsLoading,
    refetch,
  } = useProducts({
    category: categoryId,
    brand: brandId,
    per_page: 1000,
  });

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.log('Products pull refresh error:', e);
    } finally {
      setPullRefreshing(false);
    }
  }, [refetch]);

  const products = useMemo(() => {
    if (hasBannerProducts) {
      return bannerProducts.map((bp) => {
        const bpId = bp._id || bp.id;
        const catalogMatch = fetchedProducts.find((p) => (p._id || p.id) === bpId);
        const merged = catalogMatch ? { ...catalogMatch, ...bp } : bp;

        const origPrice = parsePrice(bp.price) || parsePrice(catalogMatch?.price) || 0;
        const discPrice =
          parsePrice(bp.discounted_price) ||
          parsePrice(catalogMatch?.discounted_price) ||
          origPrice;

        return {
          ...merged,
          price: origPrice,
          discounted_price: discPrice,
          images:
            catalogMatch?.images?.length > 0
              ? catalogMatch.images
              : bp.images?.length > 0
              ? bp.images
              : bp.banner_image
              ? [bp.banner_image]
              : bp.image
              ? [bp.image]
              : [],
        };
      });
    }
    return fetchedProducts;
  }, [hasBannerProducts, bannerProducts, fetchedProducts]);

  const isDisplayLoading = hasBannerProducts ? false : isProductsLoading;

  // Filtered/Sorted brands for Brand Sheet
  const filteredBrands = useMemo(() => {
    return brands.filter((b) =>
      b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brands, brandSearch]);

  // Brand Sheet sections (Top Picks vs. All Brands)
  const brandSections = useMemo(() => {
    const topPickNames = ['Minimalist', 'COSRX', 'Lakme', 'Plum', 'L\'Oreal', 'Foxtale', 'Pilgrim', 'Cetaphil'];
    const topPicks = filteredBrands.filter((b) =>
      topPickNames.some((name) => b.name.toLowerCase().includes(name.toLowerCase()))
    );
    const allOthers = filteredBrands.filter((b) =>
      !topPickNames.some((name) => b.name.toLowerCase().includes(name.toLowerCase()))
    );

    const sections = [];
    if (topPicks.length > 0) {
      sections.push({ key: 'top', title: 'TOP PICKS', data: topPicks });
    }
    if (allOthers.length > 0) {
      sections.push({ key: 'all', title: 'ALL BRANDS', data: allOthers });
    }
    return sections;
  }, [filteredBrands]);

  // Sorting and brand filtering applied to product catalog list
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Deal chips filtering
    if (filterType) {
      if (filterType === 'bestseller') {
        result = result.filter(
          (p) => p.is_best_seller === true || p.isBestSeller === true || p.is_bestseller === true || p.tag === 'bestseller'
        );
      } else if (filterType === 'supersaver') {
        result = result.filter((p) => {
          const original = parsePrice(p.price);
          const sell = parsePrice(p.discounted_price) || original;
          const off = original > 0 ? Math.round(((original - sell) / original) * 100) : 0;
          return off >= 20;
        });
      } else if (filterType === 'lightning') {
        result = result.filter((p) => {
          const original = parsePrice(p.price);
          const sell = parsePrice(p.discounted_price) || original;
          const off = original > 0 ? Math.round(((original - sell) / original) * 100) : 0;
          return off >= 20 || p.is_lightning_deal === true;
        });
      } else if (filterType === 'monsoon') {
        result = result.filter((p) => {
          const nameLower = (p.name || '').toLowerCase();
          const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];
          return (
            nameLower.includes('monsoon') ||
            nameLower.includes('serum') ||
            nameLower.includes('oil') ||
            nameLower.includes('wash') ||
            nameLower.includes('cream') ||
            tags.includes('monsoon') ||
            tags.includes('skincare')
          );
        });
      } else if (filterType === 'freegift') {
        result = result.filter((p) => {
          const nameLower = (p.name || '').toLowerCase();
          const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];
          return (
            p.is_free_gift === true ||
            parsePrice(p.price) > 400 ||
            tags.includes('gift') ||
            nameLower.includes('gift')
          );
        });
      }
    }

    // Brand filtering
    const activeBrandKeys = Object.keys(selectedBrands).filter((id) => selectedBrands[id]);
    if (activeBrandKeys.length > 0) {
      const activeIds = new Set(activeBrandKeys);
      const activeNormalizedNames = new Set();

      brands.forEach((b) => {
        const bNameNorm = b.name ? b.name.trim().toLowerCase() : '';
        if (
          activeBrandKeys.includes(b._id) ||
          (bNameNorm && activeBrandKeys.some((k) => k.trim().toLowerCase() === bNameNorm))
        ) {
          activeIds.add(b._id);
          if (bNameNorm) activeNormalizedNames.add(bNameNorm);
        }
      });

      activeBrandKeys.forEach((k) => {
        if (k) activeNormalizedNames.add(k.trim().toLowerCase());
      });

      result = result.filter((p) => {
        const pBrandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
        const pBrandName =
          typeof p.brand === 'object'
            ? p.brand?.name
            : (p.brandName || (typeof p.brand === 'string' ? p.brand : ''));
        const pNameLower = (p.name || '').toLowerCase();

        // 1. Direct ID match
        if (pBrandId && activeIds.has(pBrandId)) return true;

        // 2. Direct or normalized brand name match
        if (pBrandName) {
          const normPBrand = pBrandName.trim().toLowerCase();
          if (activeNormalizedNames.has(normPBrand)) return true;
        }

        // 3. Fallback: Check if product name mentions any of the active brand names
        for (const brandNameStr of activeNormalizedNames) {
          if (brandNameStr.length >= 3 && pNameLower.includes(brandNameStr)) {
            return true;
          }
        }

        return false;
      });
    }

    // Price range filtering
    if (minPrice !== undefined) {
      result = result.filter((p) => {
        const finalPrice = parsePrice(p.discounted_price) || parsePrice(p.price) || 0;
        return finalPrice >= minPrice;
      });
    }
    if (maxPrice !== undefined) {
      result = result.filter((p) => {
        const finalPrice = parsePrice(p.discounted_price) || parsePrice(p.price) || 0;
        return finalPrice <= maxPrice;
      });
    }

    // Sorting logic
    if (sortBy === "Price - low to high") {
      result.sort((a, b) => (parsePrice(a.discounted_price) || parsePrice(a.price)) - (parsePrice(b.discounted_price) || parsePrice(b.price)));
    } else if (sortBy === "Price - high to low") {
      result.sort((a, b) => (parsePrice(b.discounted_price) || parsePrice(b.price)) - (parsePrice(a.discounted_price) || parsePrice(a.price)));
    } else if (sortBy === "Discount") {
      result.sort((a, b) => {
        const origA = parsePrice(a.price);
        const sellA = parsePrice(a.discounted_price) || origA;
        const discA = origA > sellA ? (origA - sellA) / origA : 0;
        const origB = parsePrice(b.price);
        const sellB = parsePrice(b.discounted_price) || origB;
        const discB = origB > sellB ? (origB - sellB) / origB : 0;
        return discB - discA;
      });
    }

    return result;
  }, [products, selectedBrands, sortBy, filterType, minPrice, maxPrice, brands]);

  // Check if all filtered brands are selected
  const allBrandsSelected = useMemo(() => {
    if (filteredBrands.length === 0) return false;
    return filteredBrands.every((b) => !!selectedBrands[b._id] || (b.name && !!selectedBrands[b.name]));
  }, [filteredBrands, selectedBrands]);

  const toggleSelectAllBrands = () => {
    if (allBrandsSelected) {
      // Deselect all
      setSelectedBrands((prev) => {
        const next = { ...prev };
        filteredBrands.forEach((b) => {
          delete next[b._id];
          if (b.name) delete next[b.name];
        });
        return next;
      });
    } else {
      // Select all
      setSelectedBrands((prev) => {
        const next = { ...prev };
        filteredBrands.forEach((b) => {
          next[b._id] = true;
        });
        return next;
      });
    }
  };

  const clearBrandFilters = () => {
    setSelectedBrands({});
  };

  const toggleBrandCheckbox = (id, name) => {
    setSelectedBrands((prev) => {
      const next = { ...prev };
      const isCurrentlySelected = !!(next[id] || (name && next[name]));
      if (isCurrentlySelected) {
        delete next[id];
        if (name) delete next[name];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleTabPress = (modalType) => {
    setActiveModal((prev) => (prev === modalType ? null : modalType));
  };

  const renderProductItem = ({ item }) => {
    return (
      <ProductCard
        product={item}
        width={COLUMN_WIDTH}
        brands={brands}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerLeftContainer}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#1A1C1E" />
          </TouchableOpacity>
          <MarqueeText
            text={screenTitle}
            style={styles.headerTitle}
            containerStyle={styles.headerTitleContainer}
            threshold={18}
          />
        </View>
        
        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Search')}>
            <Search size={22} color="#1A1C1E" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('BottomTabs', { screen: 'Bag' })}>
            <View style={styles.cartIconWrapper}>
              <Handbag size={22} color="#1A1C1E" />
              {effectiveCartCount > 0 && (
                <View style={styles.cartHeaderBadge}>
                  <Text style={styles.cartHeaderBadgeText}>{effectiveCartCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main product list */}
      {isDisplayLoading ? (
        <View style={[styles.listContent, styles.skeletonGrid]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} cardWidth={COLUMN_WIDTH} />
          ))}
        </View>
      ) : processedProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Inbox size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any products in this brand or matching your selection.
          </Text>
        </View>
      ) : (
        <FlatList
          key={`products-grid-${numColumns}`}
          data={processedProducts}
          renderItem={renderProductItem}
          keyExtractor={(item, index) => item._id || item.id || `prod-${index}`}
          numColumns={numColumns}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={handlePullRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Backdrop for bottom sheet overlays */}
      {activeModal !== null && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        />
      )}

      {/* Sort Drawer Bottom Sheet */}
      {activeModal === 'sort' && (
        <View style={[styles.bottomSheet, { paddingBottom: 92 + insets.bottom }]}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <ArrowUpDown size={18} color="#1A1C1E" />
              <Text style={styles.sheetTitle}>Sort</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sheetBody}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = sortBy === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.sortOptionRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSortBy(option);
                    setActiveModal(null);
                  }}>
                  <Text style={[styles.sortOptionText, isSelected && styles.sortOptionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Brand Selector Bottom Sheet */}
      {activeModal === 'brand' && (
        <View style={[styles.bottomSheet, styles.brandSheet, { paddingBottom: 92 + insets.bottom }]}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Tag size={18} color="#1A1C1E" />
              <Text style={styles.sheetTitle}>Brand</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Brand Search input */}
          <View style={styles.brandSearchSection}>
            <Search size={18} color="#94A3B8" style={styles.brandSearchIcon} />
            <TextInput
              placeholder="Search Brand"
              placeholderTextColor="#94A3B8"
              style={styles.brandSearchInput}
              value={brandSearch}
              onChangeText={setBrandSearch}
            />
          </View>

          {/* Action toggle line */}
          <View style={styles.brandActionRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={toggleSelectAllBrands}>
              <View style={[styles.checkboxSquare, allBrandsSelected && styles.checkboxSquareActive]}>
                {allBrandsSelected && <Text style={styles.checkboxCheckmark}>✓</Text>}
              </View>
              <Text style={styles.brandActionText}>Select All ({filteredBrands.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearBrandFilters}>
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Brands list */}
          {isBrandsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
          ) : filteredBrands.length === 0 ? (
            <Text style={styles.emptyBrandsText}>No brands match your search.</Text>
          ) : (
            <FlatList
              data={brandSections}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <View style={styles.brandSection}>
                  <Text style={styles.brandSectionHeader}>{item.title}</Text>
                  {item.data.map((brand) => {
                    const isChecked = !!selectedBrands[brand._id] || (brand.name && !!selectedBrands[brand.name]);
                    return (
                      <TouchableOpacity
                        key={brand._id}
                        style={styles.brandListItem}
                        activeOpacity={0.8}
                        onPress={() => toggleBrandCheckbox(brand._id, brand.name)}>
                        <View style={[styles.checkboxSquare, isChecked && styles.checkboxSquareActive]}>
                          {isChecked && <Text style={styles.checkboxCheckmark}>✓</Text>}
                        </View>
                        <Text style={styles.brandNameText}>{brand.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      )}

      {/* Persistent Bottom Filter Bar */}
      <View style={[styles.floatingFilterBar, { bottom: 20 + insets.bottom }]}>
        <TouchableOpacity
          style={styles.filterTab}
          activeOpacity={0.7}
          onPress={() => handleTabPress('sort')}>
          <ArrowUpDown size={16} color={activeModal === 'sort' ? colors.primary : '#475569'} />
          <Text style={[styles.filterTabText, activeModal === 'sort' && styles.filterTabTextActive]}>
            Sort
          </Text>
        </TouchableOpacity>
        
        <View style={styles.filterDivider} />
        
        <TouchableOpacity
          style={styles.filterTab}
          activeOpacity={0.7}
          onPress={() => handleTabPress('brand')}>
          <Tag size={16} color={activeModal === 'brand' ? colors.primary : '#475569'} />
          <Text style={[styles.filterTabText, activeModal === 'brand' && styles.filterTabTextActive]}>
            Brand
          </Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    padding: 4,
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartHeaderBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: colors.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartHeaderBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: moderateScale(19),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#F3E8FF',
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  clearFilterBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  clearFilterBtnText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 90, // space for floating bar
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    paddingHorizontal: 4,
    marginTop: 4,
  },
  productTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.small,
    color: '#475569',
    lineHeight: moderateScale(18),
  },
  brandText: {
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  finalPrice: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  originalPrice: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#FD3A2D',
    marginLeft: 6,
  },
  bestPriceText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#059669', // green for discount offers
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
    borderRadius: 16,
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
  floatingFilterBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 100, // sits highest
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: '100%',
  },
  filterTabText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontFamily: fonts.big,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 80, // covers list but under sheet
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 92, // leaves space for bottom filter bar
    zIndex: 90, // overlay above backdrop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  brandSheet: {
    height: height * 0.75, // taller modal
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  sheetBody: {
    paddingVertical: 12,
  },
  sortOptionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sortOptionText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontFamily: fonts.big,
  },
  brandSearchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  brandSearchIcon: {
    marginRight: 8,
  },
  brandSearchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#1A1C1E',
  },
  brandActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandActionText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  clearFiltersText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  brandList: {
    flex: 1,
    marginTop: 8,
  },
  brandSection: {
    marginTop: 16,
  },
  brandSectionHeader: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  brandListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  brandCheckboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  brandNameText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  emptyBrandsText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 32,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSquareActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },
});
