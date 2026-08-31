import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ArrowUpDown,
  Search,
  X,
  Tag,
  Handbag,
  Inbox,
} from 'lucide-react-native';

import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import { useProducts } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { addToCart } from '../redux/cartSlice';
import { addToCartApi } from '../api/cart';
import { ProductCardSkeleton } from '../components/Skeleton';
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
  "Customer Rating",
];

export default function ProductsScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const numColumns = isTablet ? 3 : 2;
  const cardGap = 12;
  const COLUMN_WIDTH = (width - 24 - (cardGap * (numColumns - 1))) / numColumns;

  const { categoryId, categoryName, brandId, brandName, headerTitle, filterType, minPrice, maxPrice } = route.params || {};
  const screenTitle = headerTitle || brandName || categoryName || 'Products';
  
  // Sheet state: null | 'sort' | 'brand' | 'gender' | 'filters'
  const [activeModal, setActiveModal] = useState(null);
  
  // Filter/Sort states
  const [sortBy, setSortBy] = useState("What's new");
  const [selectedBrands, setSelectedBrands] = useState(() =>
    brandId ? { [brandId]: true } : {}
  );
  const [brandSearch, setBrandSearch] = useState('');
  const [favorites, setFavorites] = useState({});

  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items || []);
  const [loadingProductId, setLoadingProductId] = useState(null);

  const handleAddToCart = async (product) => {
    const pId = product._id || product.id;
    const isInCart = cartItems.some((ci) => (ci.productId || ci.id) === pId);

    if (isInCart) {
      navigation.navigate('BottomTabs', { screen: 'Bag' });
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

  useEffect(() => {
    if (brandId) {
      setSelectedBrands({ [brandId]: true });
    }
  }, [brandId]);

  // API calls
  const {
    data: products = [],
    isLoading: isProductsLoading,
    isRefetching,
    refetch,
  } = useProducts({ category: categoryId, brand: brandId });

  const { data: brands = [], isLoading: isBrandsLoading } = useBrands();

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
          const original = p.price || 0;
          const sell = p.discounted_price || original;
          const off = original > 0 ? Math.round(((original - sell) / original) * 100) : 0;
          return off >= 20;
        });
      } else if (filterType === 'lightning') {
        result = result.filter((p) => {
          const original = p.price || 0;
          const sell = p.discounted_price || original;
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
            p.price > 400 ||
            tags.includes('gift') ||
            nameLower.includes('gift')
          );
        });
      }
    }

    // Brand filtering
    const activeBrandIds = Object.keys(selectedBrands).filter((id) => selectedBrands[id]);
    if (activeBrandIds.length > 0) {
      result = result.filter((p) => {
        const pBrandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
        const pBrandName = typeof p.brand === 'object' ? p.brand?.name : p.brand;
        return activeBrandIds.includes(pBrandId) || activeBrandIds.includes(pBrandName);
      });
    }

    // Price range filtering
    if (minPrice !== undefined) {
      result = result.filter((p) => {
        const finalPrice = p.discounted_price || p.price || 0;
        return finalPrice >= minPrice;
      });
    }
    if (maxPrice !== undefined) {
      result = result.filter((p) => {
        const finalPrice = p.discounted_price || p.price || 0;
        return finalPrice <= maxPrice;
      });
    }

    // Sorting logic
    if (sortBy === "Price - low to high") {
      result.sort((a, b) => (a.discounted_price || a.price) - (b.discounted_price || b.price));
    } else if (sortBy === "Price - high to low") {
      result.sort((a, b) => (b.discounted_price || b.price) - (a.discounted_price || a.price));
    } else if (sortBy === "Discount") {
      result.sort((a, b) => {
        const discA = a.price > a.discounted_price ? (a.price - a.discounted_price) / a.price : 0;
        const discB = b.price > b.discounted_price ? (b.price - b.discounted_price) / b.price : 0;
        return discB - discA;
      });
    }

    return result;
  }, [products, selectedBrands, sortBy, filterType, minPrice, maxPrice]);

  // Check if all filtered brands are selected
  const allBrandsSelected = useMemo(() => {
    if (filteredBrands.length === 0) return false;
    return filteredBrands.every((b) => !!selectedBrands[b._id]);
  }, [filteredBrands, selectedBrands]);

  const toggleSelectAllBrands = () => {
    if (allBrandsSelected) {
      // Deselect all
      setSelectedBrands((prev) => {
        const next = { ...prev };
        filteredBrands.forEach((b) => {
          next[b._id] = false;
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

  const toggleBrandCheckbox = (id) => {
    setSelectedBrands((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
    const originalPrice = item.price || 0;
    const finalPrice = item.discounted_price || originalPrice;
    const discount = originalPrice > finalPrice
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : 0;

    const isFav = !!favorites[item._id];
    const imageSource = item.images?.[0] ? { uri: item.images[0], cache: 'force-cache' } : require('../../assets/dummy_product.png');

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
      ? (item.name.toLowerCase().startsWith(brandNameStr.toLowerCase())
          ? item.name.slice(brandNameStr.length).trim()
          : item.name)
      : item.name;

    return (
      <TouchableOpacity
        style={[styles.productCard, { width: COLUMN_WIDTH }]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ProductDetail', {
            productId: item._id,
            product: item,
          })
        }>
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
            defaultSource={require('../../assets/dummy_product.png')}
            style={styles.productImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.detailsContainer}>
          <Text numberOfLines={2} style={styles.productTitle}>
            {brandNameStr ? <Text style={styles.brandText}>{brandNameStr} </Text> : null}
            {titleText}
          </Text>

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

          {(() => {
            const isInCart = cartItems.some((ci) => (ci.productId || ci.id) === item._id);
            const isLoadingThis = loadingProductId === item._id;

            return (
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
            );
          })()}
        </View>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>{screenTitle}</Text>
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
            <Handbag size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main product list */}
      {isProductsLoading ? (
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
          keyExtractor={(item) => item._id}
          numColumns={numColumns}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
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
        <View style={styles.bottomSheet}>
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
        <View style={[styles.bottomSheet, styles.brandSheet]}>
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
                    const isChecked = !!selectedBrands[brand._id];
                    return (
                      <TouchableOpacity
                        key={brand._id}
                        style={styles.brandListItem}
                        activeOpacity={0.8}
                        onPress={() => toggleBrandCheckbox(brand._id)}>
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
      <View style={styles.floatingFilterBar}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    padding: 4,
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
