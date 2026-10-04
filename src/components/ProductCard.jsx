import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import OptimizedImage from './OptimizedImage';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { useCartStore } from '../store/cartStore';
import { addToCartApi } from '../api/cart';
import { getProductStockStatus, isProductOutOfStock } from '../utils/productUtils';

const DEFAULT_IMAGE_FALLBACK = require('../../assets/dummy_product.png');

const parsePrice = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function ProductCard({
  product,
  width,
  style,
  imageAspectRatio = 1,
  onPress,
  brands = [],
  showBrand = true,
  onAddToCartSuccess,
}) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const cartItems = useCartStore((state) => state.items || []);
  const addToCart = useCartStore((state) => state.addToCart);
  const setCartData = useCartStore((state) => state.setCartData);

  const [isLoading, setIsLoading] = useState(false);

  const pId = product?._id || product?.id;

  // Resolve cached query details if available
  const cached = queryClient?.getQueryData(['product', pId]);
  const effectiveItem = useMemo(() => {
    return cached ? { ...product, ...(cached.data || cached) } : product;
  }, [cached, product]);

  const { isCompletelyOutOfStock, isSelectOption } = useMemo(() => {
    return getProductStockStatus(effectiveItem);
  }, [effectiveItem]);

  const isInCart = useMemo(() => {
    return cartItems.some((ci) => (ci.productId || ci.id) === pId);
  }, [cartItems, pId]);

  // Brand Name resolution
  const brandNameStr = useMemo(() => {
    if (!showBrand) return '';
    if (typeof effectiveItem?.brand === 'object' && effectiveItem?.brand?.name) {
      return effectiveItem.brand.name;
    }
    if (effectiveItem?.brandName) {
      return effectiveItem.brandName;
    }
    if (typeof effectiveItem?.brand === 'string') {
      if (/^[0-9a-fA-F]{24}$/.test(effectiveItem.brand)) {
        const found = brands.find((b) => b._id === effectiveItem.brand);
        return found ? found.name : '';
      }
      return effectiveItem.brand;
    }
    return '';
  }, [effectiveItem, brands, showBrand]);

  // Clean Title Text
  const titleText = useMemo(() => {
    const rawName = effectiveItem?.name || '';
    if (brandNameStr && rawName.toLowerCase().startsWith(brandNameStr.toLowerCase())) {
      return rawName.slice(brandNameStr.length).trim();
    }
    return rawName;
  }, [effectiveItem?.name, brandNameStr]);

  // Price calculations
  const originalPrice = parsePrice(effectiveItem?.price);
  const finalPrice =
    parsePrice(effectiveItem?.discounted_price) || (originalPrice > 0 ? originalPrice : 999);
  const discount =
    originalPrice > finalPrice
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : 0;

  const isBestseller =
    effectiveItem?.is_best_seller ||
    effectiveItem?.isBestSeller ||
    effectiveItem?.is_bestseller ||
    effectiveItem?.tag === 'bestseller';

  const imageUri =
    effectiveItem?.images?.[0] ||
    effectiveItem?.image ||
    effectiveItem?.banner_image ||
    null;

  const handleCardPress = useCallback(() => {
    if (onPress) {
      onPress(effectiveItem);
    } else {
      navigation.navigate('ProductDetail', {
        productId: pId,
        product: effectiveItem,
      });
    }
  }, [onPress, navigation, pId, effectiveItem]);

  const handleAddToCart = useCallback(async () => {
    if (isLoading) return;

    if (isProductOutOfStock(effectiveItem)) {
      return;
    }

    if (isInCart) {
      try {
        navigation.navigate('BottomTabs', { screen: 'Bag' });
      } catch {
        navigation.navigate('Bag');
      }
      return;
    }

    if (isSelectOption) {
      navigation.navigate('ProductDetail', {
        productId: pId,
        product: effectiveItem,
      });
      return;
    }

    setIsLoading(true);

    addToCart({
      productId: pId,
      name: effectiveItem.name,
      brandName: brandNameStr,
      price: originalPrice > 0 ? originalPrice : finalPrice,
      discountedPrice: finalPrice,
      baseDiscountedPrice: finalPrice,
      price_tiers: effectiveItem.price_tiers || effectiveItem.priceTiers || null,
      image: imageUri,
      quantity: 1,
      available_inventory: effectiveItem.available_inventory,
      base_available_inventory: effectiveItem.base_available_inventory,
    });

    const existing = cartItems.find((ci) => (ci.productId || ci.id) === pId && !ci.variant);
    const targetQty = existing ? (existing.quantity || 1) + 1 : 1;

    try {
      const res = await addToCartApi({
        type: 'product',
        productId: pId,
        quantity: targetQty,
      });
      const cartData = res?.data?.data || res?.data;
      if (cartData && Array.isArray(cartData.items)) {
        setCartData(cartData);
      }
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (onAddToCartSuccess) {
        onAddToCartSuccess(effectiveItem);
      }
    } catch (e) {
      console.log('ProductCard addToCart error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    effectiveItem,
    isInCart,
    isSelectOption,
    navigation,
    pId,
    addToCart,
    brandNameStr,
    originalPrice,
    finalPrice,
    imageUri,
    cartItems,
    setCartData,
    queryClient,
    onAddToCartSuccess,
  ]);

  return (
    <TouchableOpacity
      style={[styles.productCard, width ? { width } : null, style]}
      activeOpacity={0.85}
      onPress={handleCardPress}>
      {/* Product Image Container */}
      <View style={[styles.imageContainer, { aspectRatio: imageAspectRatio }]}>
        <OptimizedImage
          source={imageUri}
          preset="PRODUCT_CARD"
          defaultSource={DEFAULT_IMAGE_FALLBACK}
          style={[styles.productImage, isCompletelyOutOfStock && { opacity: 0.6 }]}
          resizeMode="cover"
        />

        {isBestseller && !isCompletelyOutOfStock ? (
          <LinearGradient
            colors={['#A78BFA', colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBadge}>
            <Text style={styles.gradientBadgeText}>BESTSELLER</Text>
          </LinearGradient>
        ) : null}
      </View>

      {/* Details Container */}
      <View style={styles.detailsContainer}>
        <View>
          <Text numberOfLines={2} style={styles.productTitle}>
            {brandNameStr ? <Text style={styles.brandText}>{brandNameStr} </Text> : null}
            {titleText}
          </Text>

          <View style={styles.priceRow}>
            {discount > 0 ? (
              <>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={styles.originalPrice}>
                  ₹{originalPrice}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={styles.finalPrice}>
                  ₹{finalPrice}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={styles.discountText}>
                  {discount}% OFF
                </Text>
              </>
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={styles.finalPrice}>
                ₹{finalPrice}
              </Text>
            )}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.addToBagButton,
            isInCart && styles.goToBagButton,
            isCompletelyOutOfStock && styles.outOfStockButton,
          ]}
          activeOpacity={0.85}
          disabled={isCompletelyOutOfStock || isLoading}
          onPress={handleAddToCart}>
          {isLoading ? (
            <ActivityIndicator size="small" color={isInCart ? '#FFFFFF' : colors.primary} />
          ) : (
            <Text
              style={[
                styles.addToBagText,
                isInCart && styles.goToBagText,
                isCompletelyOutOfStock && styles.outOfStockText,
              ]}>
              {isCompletelyOutOfStock
                ? 'OUT OF STOCK'
                : isSelectOption
                ? 'SELECT OPTION'
                : isInCart
                ? 'GO TO BAG'
                : 'ADD TO BAG'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
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
  },
  outOfStockButton: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  outOfStockText: {
    color: '#FFFFFF',
  },
});
