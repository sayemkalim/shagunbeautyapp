import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {
  ChevronLeft,
  Search,
  X,
  ArrowUpLeft,
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';

import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useBrands } from '../hooks/useBrands';
import { ProductCardSkeleton } from '../components/Skeleton';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { addToCart } from '../redux/cartSlice';
import { addToCartApi } from '../api/cart';


const POPULAR_SEARCHES = [
  'Vitamin C',
  'Sunscreen',
  'Cetaphil Cleanser',
  'Minimalist Serum',
  'Onion Hair Oil',
  'Face Wash',
];

const RECENT_SEARCHES_KEY = 'recent_searches';

export default function SearchScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const numColumns = isTablet ? 3 : 2;
  const cardGap = 12;
  const COLUMN_WIDTH = (width - 24 - (cardGap * (numColumns - 1))) / numColumns;

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState({});

  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items || []);
  const [loadingProductId, setLoadingProductId] = useState(null);

  // Load recent searches from local storage on mount
  useEffect(() => {
    const loadRecents = async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (raw) {
          setRecentSearches(JSON.parse(raw));
        } else {
          // Default fallbacks if storage is empty
          const defaults = ['Serum', 'Moisturizer', 'Lakme'];
          setRecentSearches(defaults);
          await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(defaults));
        }
      } catch (err) {
        console.log('Failed to load recent searches from storage', err);
      }
    };
    loadRecents();
  }, []);

  // Helper to persist searches to storage
  const saveRecentSearches = async (updatedList) => {
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.log('Failed to save recent searches to storage', err);
    }
  };

  // Query all products to perform fuzzy, high-performance local filtering
  const { data: allProducts = [], isLoading: isProductsLoading } = useProducts({
    per_page: 500,
  });

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  // Reset results display state when typing, to show suggestions
  const handleTextChange = (text) => {
    setInputText(text);
    if (!text.trim()) {
      setSearchQuery('');
      setShowResults(false);
    } else {
      setShowResults(false);
    }
  };

  // Generate fuzzy suggestions list
  const suggestions = useMemo(() => {
    if (!inputText.trim() || showResults) return [];

    const query = inputText.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '');
    const list = new Set();

    // 1. Common cosmetic keywords
    const commonKeywords = [
      'Face Wash',
      'Face Serum',
      'Facial Cleanser',
      'Sunscreen',
      'Moisturizer',
      'Hair Oil',
      'Lip Balm',
      'Shampoo',
    ];

    commonKeywords.forEach((keyword) => {
      if (keyword.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '').includes(query)) {
        list.add(keyword);
      }
    });

    // 2. Category names matching
    categories.forEach((cat) => {
      if (cat.name.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '').includes(query)) {
        list.add(cat.name);
      }
    });

    // 3. Brand names matching
    brands.forEach((brand) => {
      if (brand.name.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '').includes(query)) {
        list.add(brand.name);
      }
    });

    // 4. Product names matching
    let count = 0;
    allProducts.forEach((p) => {
      if (count < 8 && p.name.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '').includes(query)) {
        list.add(p.name);
        count++;
      }
    });

    return Array.from(list).slice(0, 10);
  }, [inputText, showResults, categories, brands, allProducts]);

  // Match every word of the query (AND logic) against the combined
  // name + brand + sku text, so word order/adjacency doesn't matter.
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const queryWords = searchQuery
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .split(/\s+/)
      .filter(Boolean);

    return allProducts.filter((p) => {
      let brandName = '';
      if (typeof p.brand === 'object' && p.brand?.name) {
        brandName = p.brand.name;
      } else if (typeof p.brand === 'string') {
        // p.brand is usually just a Mongo ObjectId — resolve it to the real name
        const found = brands.find((b) => b._id === p.brand);
        brandName = found ? found.name : p.brand;
      }

      const combined = [p.name, brandName, p.sku || '']
        .join(' ')
        .toLowerCase()
        .replace(/&/g, ' and ');

      return queryWords.every((word) => combined.includes(word));
    });
  }, [allProducts, searchQuery, brands]);

  const handleSearchSubmit = () => {
    if (inputText.trim()) {
      const term = inputText.trim();
      setSearchQuery(term);
      setShowResults(true);

      setRecentSearches((prev) => {
        const next = prev.includes(term)
          ? [term, ...prev.filter((t) => t !== term)]
          : [term, ...prev.slice(0, 4)];
        saveRecentSearches(next);
        return next;
      });
    }
  };

  const handleSuggestionPress = (query) => {
    setInputText(query);
    setSearchQuery(query);
    setShowResults(true);

    setRecentSearches((prev) => {
      const next = prev.includes(query)
        ? [query, ...prev.filter((t) => t !== query)]
        : [query, ...prev.slice(0, 4)];
      saveRecentSearches(next);
      return next;
    });
  };

  const handleRecentPress = (query) => {
    setInputText(query);
    setSearchQuery(query);
    setShowResults(true);

    setRecentSearches((prev) => {
      const next = [query, ...prev.filter((t) => t !== query)];
      saveRecentSearches(next);
      return next;
    });
  };

  const clearSearch = () => {
    setInputText('');
    setSearchQuery('');
    setShowResults(false);
  };

  const clearRecents = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
          <View>
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

  const renderSuggestionItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.suggestionRow}
        activeOpacity={0.7}
        onPress={() => handleSuggestionPress(item)}>
        <Search size={16} color="#94A3B8" style={styles.suggestionIcon} />
        <Text style={styles.suggestionText} numberOfLines={1}>
          {item}
        </Text>
        <ArrowUpLeft size={16} color="#CBD5E1" style={styles.arrowIcon} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        
        <View style={styles.searchBarContainer}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search products, brands..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={inputText}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSearchSubmit}
            autoFocus={true}
            returnKeyType="search"
          />
          {inputText.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggested lists, typed suggestions, or search results */}
      {inputText.trim().length === 0 ? (
        <View style={styles.suggestionsContainer}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecents}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tagsContainer}>
                {recentSearches.map((query) => (
                  <TouchableOpacity
                    key={query}
                    style={styles.tag}
                    activeOpacity={0.7}
                    onPress={() => handleRecentPress(query)}>
                    <Text style={styles.tagText}>{query}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Searches */}
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.tagsContainer}>
              {POPULAR_SEARCHES.map((query) => (
                <TouchableOpacity
                  key={query}
                  style={styles.tag}
                  activeOpacity={0.7}
                  onPress={() => handleRecentPress(query)}>
                  <Text style={styles.tagText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Top Brands */}
          {brands.length > 0 && (
            <View style={[styles.section, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Top Brands</Text>
              <View style={styles.tagsContainer}>
                {brands.slice(0, 10).map((brand) => (
                  <TouchableOpacity
                    key={brand._id}
                    style={styles.tag}
                    activeOpacity={0.7}
                    onPress={() => handleRecentPress(brand.name)}>
                    <Text style={styles.tagText}>{brand.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : !showResults ? (
        <FlatList
          key="suggestions-list"
          data={suggestions}
          renderItem={renderSuggestionItem}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.suggestionList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : isProductsLoading ? (
        <View style={[styles.listContent, styles.skeletonGrid]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} cardWidth={COLUMN_WIDTH} />
          ))}
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            No products found matching "{searchQuery}".
          </Text>
        </View>
      ) : (
        <FlatList
          key={`products-grid-${numColumns}`}
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          numColumns={numColumns}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
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
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
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
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#1A1C1E',
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginBottom: 8,
  },
  clearAllText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tagText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  suggestionList: {
    paddingTop: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: '#334155',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
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
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
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
    flex: 1,
    paddingHorizontal: 4,
    marginTop: 4,
    justifyContent: 'space-between',
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
  goToBagButton: {
    backgroundColor: colors.primary,
  },
  goToBagText: {
    color: '#FFFFFF',
  },
});
