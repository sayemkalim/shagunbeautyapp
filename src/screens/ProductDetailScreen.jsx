import React, { useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  Handbag,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  X,
  Check,
} from 'lucide-react-native';

import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import { addToCart, selectCartItems, selectCartTotalQuantity } from '../redux/cartSlice';
import { addToCartApi } from '../api/cart';

import { useProductDetail } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import BottomSheetModal from '../components/BottomSheetModal';
import { Skeleton } from '../components/Skeleton';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 1.05;
const DUMMY_IMG = require('../../assets/dummy_product.png');

function ProductDetailSkeleton({ navigation }) {
  return (
    <>
      {/* Real, functional header so users aren't stuck while loading */}
      <View style={skeletonStyles.header}>
        <TouchableOpacity
          style={skeletonStyles.headerIconButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack?.()}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <View style={skeletonStyles.headerRightGroup}>
          <View style={skeletonStyles.headerIconButton}>
            <Search size={22} color="#E2E8F0" />
          </View>
          <View style={skeletonStyles.headerIconButton}>
            <Handbag size={22} color="#E2E8F0" />
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <View>
          <Skeleton width={width} height={IMAGE_HEIGHT} radius={0} />
          <View style={skeletonStyles.imageIndicator}>
            <Skeleton width={34} height={16} radius={8} style={{ backgroundColor: 'rgba(255,255,255,0.6)' }} />
          </View>
        </View>

        {/* Title / brand / rating / price */}
        <View style={skeletonStyles.mainInfoSection}>
          <Skeleton width="35%" height={16} radius={5} />
          <Skeleton width="80%" height={18} radius={5} style={{ marginTop: 10 }} />
          <Skeleton width="55%" height={18} radius={5} style={{ marginTop: 6 }} />
          <Skeleton width={54} height={20} radius={4} style={{ marginTop: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Skeleton width={90} height={24} radius={6} />
            <Skeleton width={70} height={18} radius={5} />
            <Skeleton width={60} height={18} radius={5} />
          </View>
        </View>

        {/* Bulk pricing banner */}
        <View style={skeletonStyles.bulkBanner}>
          <Skeleton width={18} height={18} radius={4} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Skeleton width="55%" height={13} radius={5} />
            <Skeleton width="80%" height={11} radius={5} style={{ marginTop: 6 }} />
          </View>
        </View>

        {/* Variant chips */}
        <View style={skeletonStyles.sectionContainer}>
          <Skeleton width="40%" height={15} radius={5} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={72} height={46} radius={12} />
            <Skeleton width={72} height={46} radius={12} />
            <Skeleton width={72} height={46} radius={12} />
          </View>
        </View>

        {/* Tags */}
        <View style={skeletonStyles.sectionContainer}>
          <Skeleton width="50%" height={15} radius={5} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Skeleton width={68} height={22} radius={6} />
            <Skeleton width={84} height={22} radius={6} />
            <Skeleton width={60} height={22} radius={6} />
            <Skeleton width={92} height={22} radius={6} />
          </View>
        </View>

        {/* Delivery & services */}
        <View style={skeletonStyles.sectionContainer}>
          <Skeleton width="50%" height={15} radius={5} style={{ marginBottom: 12 }} />
          <View style={skeletonStyles.serviceItemCard}>
            <Skeleton width={20} height={20} radius={5} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Skeleton width="60%" height={13} radius={5} />
              <Skeleton width="80%" height={11} radius={5} style={{ marginTop: 6 }} />
            </View>
          </View>
          {[0, 1].map((i) => (
            <View key={i} style={skeletonStyles.serviceFeatureRow}>
              <Skeleton width={18} height={18} radius={9} />
              <Skeleton width="55%" height={12} radius={5} style={{ marginLeft: 10 }} />
            </View>
          ))}
        </View>

        {/* Specifications accordion header */}
        <View style={skeletonStyles.sectionContainer}>
          <Skeleton width="60%" height={16} radius={5} />
        </View>
      </ScrollView>

      {/* Fixed bottom bar */}
      <View style={skeletonStyles.bottomBar}>
        <Skeleton width={90} height={48} radius={12} />
        <Skeleton width="100%" height={48} radius={12} style={{ flex: 1, marginLeft: 12 }} />
      </View>
    </>
  );
}

const skeletonStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerIconButton: {
    padding: 6,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  mainInfoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bulkBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceItemCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});

export default function ProductDetailScreen({ route, navigation }) {
  const { productId, product: initialProduct } = route.params || {};

  const {
    data: fetchedProduct,
    isLoading,
  } = useProductDetail(productId, initialProduct);

  const { data: brands = [] } = useBrands();

  const product = useMemo(() => {
    return fetchedProduct || initialProduct || {};
  }, [fetchedProduct, initialProduct]);

  // Active UI States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null); // null = base product selected by default
  const [isColorSelected, setIsColorSelected] = useState(true); // color is selected by default
  const [quantity, setQuantity] = useState(1);
  const [tempQty, setTempQty] = useState(1);
  const [selectedTierQty, setSelectedTierQty] = useState(1);
  const [showFullSpecs, setShowFullSpecs] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isQtyChanged, setIsQtyChanged] = useState(false);

  // Scroll View Refs
  const mainCarouselRef = useRef(null);
  const modalScrollRef = useRef(null);

  // Selected Variant & Pricing
  const currentVariant = selectedVariantIndex !== null ? product?.variants?.[selectedVariantIndex] : null;

  // Extract images edge-to-edge
  const images = useMemo(() => {
    let list = [];
    if (currentVariant && Array.isArray(currentVariant.images) && currentVariant.images.length > 0) {
      list = [...currentVariant.images];
    } else {
      if (product?.banner_image) list.push(product.banner_image);
      if (Array.isArray(product?.images)) {
        list = [...list, ...product.images.filter((img) => img !== product.banner_image)];
      }
    }
    return list.length > 0 ? list : [null];
  }, [product, currentVariant]);

  const price = currentVariant ? (currentVariant.price ?? product?.price ?? 0) : (product?.price ?? 0);
  const discountedPrice = currentVariant
    ? (currentVariant.discounted_price ?? currentVariant.price ?? price)
    : (product?.discounted_price ?? price);
  const hasDiscount = price > discountedPrice && price > 0;
  const discountPercent = hasDiscount
    ? Math.round(((price - discountedPrice) / price) * 100)
    : 0;

  const displayWeight = currentVariant && currentVariant.weight_in_grams !== undefined
    ? currentVariant.weight_in_grams
    : product?.weight_in_grams;

  const displaySku = currentVariant && currentVariant.sku
    ? currentVariant.sku
    : product?.sku;

  const maxStock = useMemo(() => {
    if (currentVariant) {
      if (typeof currentVariant.inventory === 'number') return currentVariant.inventory;
    }
    if (product && typeof product.available_inventory === 'number') {
      return product.available_inventory;
    }
    if (typeof product?.inventory === 'number') {
      return product.inventory;
    }
    return 10;
  }, [product, currentVariant]);

  // Parse bulk price tiers if available (main product only, not variants)
  const activePriceTiers = useMemo(() => {
    if (currentVariant) return []; // Tiers apply to main base product only
    let raw = product?.price_tiers || product?.priceTiers;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        raw = [];
      }
    }
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((t) => t && typeof t.quantity === 'number' && t.quantity >= 2)
      .sort((a, b) => a.quantity - b.quantity);
  }, [product?.price_tiers, product?.priceTiers, currentVariant]);

  // Generate quantity options for Modal (derived directly from price_tiers, not bound to inventory count)
  const quantityOptions = useMemo(() => {
    const options = [];

    if (activePriceTiers.length > 0) {
      // 1) Base unit option (Qty 1)
      const baseUnitPrice = discountedPrice;
      const baseTotalPrice = discountedPrice;
      const baseSavings = hasDiscount ? discountPercent : 0;

      options.push({
        qty: 1,
        unitPrice: baseUnitPrice,
        totalPrice: baseTotalPrice,
        badge: baseSavings > 0 ? `${baseSavings}% OFF` : null,
        isTier: false,
      });

      // 2) Tier options from price_tiers array
      activePriceTiers.forEach((tier) => {
        const q = tier.quantity;
        if (q <= 1) return;

        const rawPrice = tier.price && typeof tier.price === 'object' && '$numberDecimal' in tier.price
          ? parseFloat(tier.price.$numberDecimal) || 0
          : Number(tier.price) || 0;
        
        const unitP = rawPrice > 0 ? rawPrice : discountedPrice;
        const totalP = unitP * q;

        const baseTot = (price > 0 ? price : discountedPrice) * q;
        const savingsPercent = baseTot > totalP ? Math.round(((baseTot - totalP) / baseTot) * 100) : 0;

        options.push({
          qty: q,
          unitPrice: unitP,
          totalPrice: totalP,
          badge: savingsPercent > 0 ? `SAVE ${savingsPercent}%` : 'BULK TIER',
          isTier: true,
        });
      });
    } else {
      // Standard quantity options (1 to 5) when no price_tiers exist
      for (let q = 1; q <= 5; q++) {
        const uPrice = discountedPrice;
        const tPrice = discountedPrice * q;
        options.push({
          qty: q,
          unitPrice: uPrice,
          totalPrice: tPrice,
          badge: null,
          isTier: false,
        });
      }
    }

    return options;
  }, [activePriceTiers, discountedPrice, price, hasDiscount, discountPercent]);

  const currentQuantityPricing = useMemo(() => {
    const matchedOpt = quantityOptions.find((o) => o.qty === quantity);
    if (matchedOpt) {
      return {
        unitPrice: matchedOpt.unitPrice,
        totalPrice: matchedOpt.totalPrice,
      };
    }

    if (activePriceTiers.length > 0) {
      const matchedTiers = activePriceTiers.filter((t) => t.quantity <= quantity);
      if (matchedTiers.length > 0) {
        const latestTier = matchedTiers[matchedTiers.length - 1];
        const rawP = Number(latestTier.price) || discountedPrice;
        let tierUnitPrice = rawP;
        if (rawP > price) {
          tierUnitPrice = rawP / latestTier.quantity;
        }
        const unitP = Math.round(tierUnitPrice);
        return {
          unitPrice: unitP,
          totalPrice: unitP * quantity,
        };
      }
    }

    return {
      unitPrice: discountedPrice,
      totalPrice: discountedPrice * quantity,
    };
  }, [quantityOptions, quantity, activePriceTiers, discountedPrice, price]);

  // Brand Name resolution (converts Mongo ObjectId to Brand Name)
  const brandName = useMemo(() => {
    if (!product?.brand) return '';
    if (typeof product.brand === 'object' && product.brand?.name) {
      return product.brand.name;
    }
    if (product.brandName) return product.brandName;
    if (product.brand_name) return product.brand_name;
    if (typeof product.brand === 'string') {
      if (/^[0-9a-fA-F]{24}$/.test(product.brand)) {
        const found = brands.find((b) => b._id === product.brand);
        return found ? found.name : '';
      }
      return product.brand;
    }
    return '';
  }, [product, brands]);

  // Format expiry date cleanly if provided
  const formattedExpiryDate = useMemo(() => {
    if (!product?.expiry_date) return null;
    try {
      const dateObj = new Date(product.expiry_date);
      if (isNaN(dateObj.getTime())) return String(product.expiry_date);
      return dateObj.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return String(product.expiry_date);
    }
  }, [product?.expiry_date]);

  const [isAdding, setIsAdding] = useState(false);

  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);

  // Check if current product / variant is already in cart
  const isInCart = useMemo(() => {
    const pId = product._id || productId;
    const vSku = currentVariant?.sku;
    return cartItems.some((item) => {
      if (item.productId !== pId) return false;
      if (vSku) return item.variant?.sku === vSku;
      return !item.variant;
    });
  }, [cartItems, product._id, productId, currentVariant]);

  // Display Title: completely replaced by selected variant's name if selected
  const displayTitle = useMemo(() => {
    if (currentVariant?.name) {
      return currentVariant.name;
    }
    return product?.name || '';
  }, [product?.name, currentVariant]);

  // Handlers
  const handleAddToCart = async () => {
    if (isInCart && !isQtyChanged) {
      navigation.navigate('BottomTabs', { screen: 'Bag' });
      return;
    }

    const pId = product._id || productId;
    const itemToAdd = {
      productId: pId,
      name: displayTitle || product.name,
      brandName: brandName || '',
      image: images[0] || null,
      variant: currentVariant || null,
      variantName: currentVariant?.name || null,
      unitPrice: currentQuantityPricing.unitPrice,
      totalPrice: currentQuantityPricing.totalPrice,
      quantity: quantity,
      price: price,
      discountedPrice: discountedPrice,
    };

    try {
      setIsAdding(true);
      // Backend Cart API call
      await addToCartApi({
        type: 'product',
        productId: pId,
        quantity,
        variantSku: currentVariant?.sku,
      });
    } catch (err) {
      // Non-blocking fallback to local Redux state for guest/offline scenarios
    } finally {
      dispatch(addToCart(itemToAdd));
      setIsAdding(false);
      setIsQtyChanged(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  const selectQuantityOption = (selectedQty) => {
    if (selectedQty !== quantity) {
      setQuantity(selectedQty);
      setIsQtyChanged(true);
    }
    setShowQtyModal(false);
  };

  const handleOpenImageModal = (index) => {
    setActiveImageIndex(index);
    setIsImageModalOpen(true);
  };

  if (isLoading && !product?.name) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ProductDetailSkeleton navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>

        <View style={styles.headerRightGroup}>
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
              {cartTotalQuantity > 0 && (
                <View style={styles.cartHeaderBadge}>
                  <Text style={styles.cartHeaderBadgeText}>{cartTotalQuantity}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* ── Edge-to-Edge Full Width Image Gallery Carousel ── */}
        <View style={styles.fullWidthCarousel}>
          <ScrollView
            ref={mainCarouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(
                e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
              );
              if (slide !== activeImageIndex) setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}>
            {images.map((imgUri, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={() => handleOpenImageModal(index)}>
                <Image
                  source={imgUri ? { uri: imgUri, cache: 'force-cache' } : DUMMY_IMG}
                  defaultSource={DUMMY_IMG}
                  style={styles.fullWidthImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Optional Bestseller Badge (ONLY if is_best_seller is true) */}
          {(product?.is_best_seller || product?.isBestSeller || product?.is_bestseller || product?.tag === 'bestseller') ? (
            <LinearGradient
              colors={['#A78BFA', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBadge}>
              <Text style={styles.gradientBadgeText}>BESTSELLER</Text>
            </LinearGradient>
          ) : null}

          {/* Multi-Image Counter Indicator */}
          {images.length > 1 && (
            <View style={styles.imageIndicator}>
              <Text style={styles.imageIndicatorText}>
                {activeImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}

          {/* Dot Pagination Indicator */}
          {images.length > 1 && (
            <View style={styles.imageDotsRow} pointerEvents="none">
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageDot,
                    activeImageIndex === index && styles.imageDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Product Title & Price Info Section ── */}
        <View style={styles.mainInfoSection}>
          {brandName ? <Text style={styles.brandTitle}>{brandName}</Text> : null}
          {displayTitle ? <Text style={styles.productName}>{displayTitle}</Text> : null}

          {/* Optional Product Rating (Only if exists) */}
          {product.rating ? (
            <View style={styles.ratingRow}>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingNumber}>{product.rating}</Text>
                <Star size={12} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
            </View>
          ) : null}

          {/* Price Row */}
          <View style={styles.priceContainer}>
            <Text style={styles.discountedPrice}>₹{currentQuantityPricing.totalPrice}</Text>
            {quantity > 1 ? (
              <Text style={styles.unitPriceSubText}>(₹{currentQuantityPricing.unitPrice}/unit)</Text>
            ) : null}
            {hasDiscount ? (
              <>
                <Text style={styles.originalPrice}>MRP ₹{price * quantity}</Text>
                <Text style={styles.discountBadge}>({discountPercent}% OFF)</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Bulk Pricing Preview Banner (ONLY for main base product) ── */}
        {activePriceTiers.length > 0 && (
          <TouchableOpacity
            style={styles.bulkBanner}
            activeOpacity={0.85}
            onPress={() => setShowQtyModal(true)}>
            <View style={styles.bulkBannerLeft}>
              <Tag size={18} color={colors.primary} />
              <View>
                <Text style={styles.bulkBannerTitle}>Bulk Pricing Available</Text>
                {/* <Text style={styles.bulkBannerSub}>
                  {activePriceTiers.map((t) => {
                    const unitP = t.price && typeof t.price === 'object' && '$numberDecimal' in t.price
                      ? parseFloat(t.price.$numberDecimal) || 0
                      : Number(t.price) || 0;
                    return `Qty ${t.quantity} @ ₹${unitP}/unit`;
                  }).join('  •  ')}
                </Text> */}
              </View>
            </View>
            <ChevronDown size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* ── Product Variants / Sizes (ONLY if variants exist) ── */}
        {product?.variants && product.variants.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              Select Option
            </Text>
            <View style={styles.variantsRow}>
              {product.variants.map((v, idx) => {
                const isSelected = selectedVariantIndex === idx;
                return (
                  <TouchableOpacity
                    key={v.sku || idx}
                    style={[styles.variantCard, isSelected && styles.variantCardActive]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedVariantIndex(isSelected ? null : idx)}>
                    <Text style={[styles.variantName, isSelected && styles.variantNameActive]}>
                      {v.weight_in_grams ? `${v.weight_in_grams} g` : (v.name || `Option ${idx + 1}`)}
                    </Text>
                    <Text style={[styles.variantPrice, isSelected && styles.variantPriceActive]}>
                      ₹{v.discounted_price || v.price}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Product Color (ONLY if color exists) ── */}
        {product?.color && String(product.color).trim() !== '' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Select Shade / Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsColorSelected(!isColorSelected)}
                style={[
                  styles.colorSwatchContainer,
                  isColorSelected && styles.colorSwatchContainerActive
                ]}>
                <View style={[styles.colorSwatchCircle, { backgroundColor: product.color }]}>
                  {isColorSelected && (
                    <Check size={22} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Product Tags (ONLY if tags exist) ── */}
        {Array.isArray(product?.tags) && product.tags.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.tagsHeader}>
              <Tag size={16} color={colors.primary} />
              <Text style={styles.sectionTitleNoMargin}>Highlights & Features</Text>
            </View>
            <View style={styles.tagsWrapper}>
              {product.tags.map((tagItem, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>
                    {String(tagItem).replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Delivery & Assurance Services ── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Delivery & Services</Text>

          <View style={styles.serviceItemCard}>
            <Truck size={20} color={colors.primary} />
            <View style={styles.serviceItemRight}>
              <Text style={styles.deliveryTimeText}>Fast Home Delivery</Text>
              <Text style={styles.deliverySubText}>Standard shipping nationwide</Text>
            </View>
          </View>

          {/* New Trust Badge Row (Exact Image Clone) */}
          <View style={styles.trustBadgeRow}>
            <View style={styles.trustBadgeColumn}>
              <View style={styles.sealContainer}>
                <View style={[styles.starburstPart, { transform: [{ rotate: '0deg' }] }]} />
                <View style={[styles.starburstPart, { transform: [{ rotate: '30deg' }] }]} />
                <View style={[styles.starburstPart, { transform: [{ rotate: '60deg' }] }]} />
                <View style={styles.sealInnerCircle} />
                <View style={styles.stampPill}>
                  <Text style={styles.stampText}>ORIGINAL</Text>
                </View>
              </View>
              <Text style={styles.trustBadgeText}>Genuine{"\n"}Product</Text>
            </View>

            <View style={styles.trustBadgeColumn}>
              <View style={styles.sealContainer}>
                <View style={styles.ribbonTailLeft} />
                <View style={styles.ribbonTailRight} />
                <View style={[styles.starburstPart, { transform: [{ rotate: '0deg' }] }]} />
                <View style={[styles.starburstPart, { transform: [{ rotate: '30deg' }] }]} />
                <View style={[styles.starburstPart, { transform: [{ rotate: '60deg' }] }]} />
                <View style={styles.sealInnerCircle}>
                  <View style={styles.innerCircle}>
                    <Check size={17} color="#FFFFFF" strokeWidth={4} />
                  </View>
                </View>
              </View>
              <Text style={styles.trustBadgeText}>Quality{"\n"}Checked</Text>
            </View>
          </View>
        </View>

        {/* ── Product Specifications & Details (ONLY real fields) ── */}
        {(product.full_description ||
          product.small_description ||
          formattedExpiryDate ||
          product.manufacturer ||
          displayWeight ||
          product.consumed_type ||
          displaySku) && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.detailsAccordionHeader}
              activeOpacity={0.8}
              onPress={() => setShowFullSpecs(!showFullSpecs)}>
              <Text style={styles.accordionTitle}>Product Specifications</Text>
              {showFullSpecs ? (
                <ChevronUp size={20} color="#64748B" />
              ) : (
                <ChevronDown size={20} color="#64748B" />
              )}
            </TouchableOpacity>

            {showFullSpecs && (
              <View style={styles.specCard}>
                {formattedExpiryDate ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Expiry Date</Text>
                    <Text style={styles.specValue}>{formattedExpiryDate}</Text>
                  </View>
                ) : null}

                {brandName ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Brand</Text>
                    <Text style={styles.specValue}>{brandName}</Text>
                  </View>
                ) : null}

                {displaySku ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>SKU</Text>
                    <Text style={styles.specValue}>{displaySku}</Text>
                  </View>
                ) : null}

                {product.consumed_type ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Type</Text>
                    <Text style={styles.specValue}>{product.consumed_type}</Text>
                  </View>
                ) : null}

                {displayWeight ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Weight</Text>
                    <Text style={styles.specValue}>{displayWeight} g</Text>
                  </View>
                ) : null}

                {product.manufacturer ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Manufacturer</Text>
                    <Text style={styles.specValue}>{product.manufacturer}</Text>
                  </View>
                ) : null}

                {(product.full_description || product.small_description) ? (
                  <View style={styles.specGroup}>
                    <Text style={styles.specGroupTitle}>Description</Text>
                    <Text style={styles.specGroupContent}>
                      {product.full_description || product.small_description}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Added to Bag Toast ── */}
      {showToast && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>
            Added {quantity} unit{quantity > 1 ? 's' : ''} to Bag!
          </Text>
        </View>
      )}

      {/* ── Fullscreen Image Gallery Viewer Modal ── */}
      <Modal
        visible={isImageModalOpen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsImageModalOpen(false)}>
        <SafeAreaView style={styles.fullscreenModalContainer} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* Top Floating Circular Close Button */}
          <View style={styles.fullscreenModalHeader}>
            <TouchableOpacity
              style={styles.fullscreenCloseBtn}
              activeOpacity={0.8}
              onPress={() => setIsImageModalOpen(false)}>
              <X size={20} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Main Fullscreen Swipeable Image View */}
          <View style={styles.fullscreenImageFlexArea}>
            <ScrollView
              ref={modalScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: activeImageIndex * width, y: 0 }}
              onScroll={(e) => {
                const slide = Math.round(
                  e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
                );
                if (slide !== activeImageIndex) {
                  setActiveImageIndex(slide);
                  if (mainCarouselRef.current) {
                    mainCarouselRef.current.scrollTo({ x: slide * width, animated: false });
                  }
                }
              }}
              scrollEventThrottle={16}>
              {images.map((imgUri, index) => (
                <View key={index} style={styles.fullscreenImageSlide}>
                  <Image
                    source={imgUri ? { uri: imgUri, cache: 'force-cache' } : DUMMY_IMG}
                    defaultSource={DUMMY_IMG}
                    style={styles.fullscreenMainImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Thumbnail Strip (Matching user screenshot!) */}
          <View style={styles.thumbnailStripArea}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailListContainer}>
              {images.map((imgUri, index) => {
                const isSelected = activeImageIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    style={[
                      styles.thumbnailWrapper,
                      isSelected && styles.thumbnailWrapperActive,
                    ]}
                    onPress={() => {
                      setActiveImageIndex(index);
                      if (modalScrollRef.current) {
                        modalScrollRef.current.scrollTo({
                          x: index * width,
                          animated: true,
                        });
                      }
                      if (mainCarouselRef.current) {
                        mainCarouselRef.current.scrollTo({
                          x: index * width,
                          animated: false,
                        });
                      }
                    }}>
                    <Image
                      source={imgUri ? { uri: imgUri, cache: 'force-cache' } : DUMMY_IMG}
                      defaultSource={DUMMY_IMG}
                      style={styles.thumbnailImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Bottom Sheet Quantity & Bulk Pricing Selector (Matching Cart UI) ── */}
      <BottomSheetModal
        visible={showQtyModal}
        showHandle={true}
        onClose={() => setShowQtyModal(false)}>
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>
              {activePriceTiers.length > 0 ? 'Select Quantity / Pack' : 'Select Quantity'}
            </Text>
            {activePriceTiers.length > 0 && (
              <Text style={styles.sheetSubTitle}>
                Choose a bulk tier option for extra savings
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setShowQtyModal(false)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {activePriceTiers.length > 0 ? (
          <ScrollView style={styles.sheetOptionsList} showsVerticalScrollIndicator={false}>
            {quantityOptions.map((opt) => {
              const isSelected = selectedTierQty === opt.qty;
              const rowQty = isSelected ? tempQty : opt.qty;
              const rowTotalPrice = Math.round(rowQty * opt.unitPrice);

              return (
                <View
                  key={opt.qty}
                  style={[styles.sheetOptionRow, isSelected && styles.sheetOptionRowActive]}>
                  <TouchableOpacity
                    style={styles.optionClickArea}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedTierQty(opt.qty);
                      setTempQty(opt.qty);
                    }}>
                    <View style={styles.optionLeft}>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.optionTextColumn}>
                        <View style={styles.qtyTitleRow}>
                          <Text style={styles.optionQtyText}>Qty: {rowQty}</Text>
                          {opt.badge ? (
                            <View style={styles.tierBadge}>
                              <Text style={styles.tierBadgeText}>{opt.badge}</Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={styles.optionUnitPriceText}>
                          ₹{opt.unitPrice}/unit
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Stepper on the right side if the row is selected */}
                  {isSelected ? (
                    <View style={styles.rowStepperWrapper}>
                      <View style={styles.rowStepperContainer}>
                        <TouchableOpacity
                          style={styles.rowStepperBtn}
                          activeOpacity={0.7}
                          onPress={() => {
                            const next = tempQty - opt.qty;
                            if (next >= opt.qty) {
                              setTempQty(next);
                            }
                          }}>
                          <Minus size={12} color={colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>
                        
                        <View style={styles.rowStepperTextContainer}>
                          <Text style={styles.rowStepperText}>{tempQty}</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.rowStepperBtn}
                          activeOpacity={0.7}
                          onPress={() => {
                            const next = tempQty + opt.qty;
                            if (next <= maxStock) {
                              setTempQty(next);
                            } else {
                              Alert.alert('Stock Limit', `Only ${maxStock} items available in stock.`);
                            }
                          }}>
                          <Plus size={12} color={colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.rowTotalPriceText}>₹{rowTotalPrice}</Text>
                    </View>
                  ) : (
                    <View style={styles.optionRight}>
                      <Text style={styles.optionTotalPriceText}>₹{rowTotalPrice}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.qtyCircleContainer}>
            {[1, 2, 3, 4, 5].map((q) => {
              const isSelected = tempQty === q;
              return (
                <TouchableOpacity
                  key={q}
                  activeOpacity={0.85}
                  style={[
                    styles.qtyCirclePill,
                    isSelected && styles.qtyCirclePillActive,
                  ]}
                  onPress={() => setTempQty(q)}>
                  <Text
                    style={[
                      styles.qtyCircleText,
                      isSelected && styles.qtyCircleTextActive,
                    ]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Solid Primary Confirm Button */}
        <TouchableOpacity
          style={styles.confirmQtyBtn}
          activeOpacity={0.85}
          onPress={() => {
            selectQuantityOption(tempQty);
            setShowQtyModal(false);
          }}>
          <Text style={styles.confirmQtyBtnText}>Confirm</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ── Fixed Bottom Action Bar (Quantity Trigger + Add to Bag) ── */}
      <View style={styles.bottomBar}>
        {/* Quantity Selector Trigger - Opens Bottom Sheet */}
        <TouchableOpacity
          style={styles.quantityContainer}
          activeOpacity={0.8}
          onPress={() => {
            setTempQty(quantity);
            if (quantity % 6 === 0) {
              setSelectedTierQty(6);
            } else if (quantity % 3 === 0) {
              setSelectedTierQty(3);
            } else {
              setSelectedTierQty(1);
            }
            setShowQtyModal(true);
          }}>
          <Text style={styles.qtyBtnText}>Qty: {quantity}</Text>
          <ChevronDown size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* Primary Color Add to Bag / Go to Bag Button */}
        <TouchableOpacity
          style={[styles.addToBagBtn, maxStock === 0 && styles.addToBagBtnDisabled]}
          activeOpacity={0.85}
          disabled={maxStock === 0 || isAdding}
          onPress={handleAddToCart}>
          {isAdding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Handbag size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addToBagBtnText}>
                {maxStock === 0
                  ? 'OUT OF STOCK'
                  : (isInCart && !isQtyChanged)
                  ? 'Go to Bag'
                  : 'Add to Bag'}
              </Text>
            </>
          )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerIconButton: {
    padding: 6,
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
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 30,
  },

  /* Full width image carousel */
  fullWidthCarousel: {
    width: width,
    height: IMAGE_HEIGHT,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  fullWidthImage: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  gradientBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  gradientBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    letterSpacing: 0.5,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageIndicatorText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
  },
  imageDotsRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  imageDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  /* Fullscreen Modal Image Viewer */
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullscreenModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fullscreenCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImageFlexArea: {
    flex: 1,
    justifyContent: 'center',
  },
  fullscreenImageSlide: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMainImage: {
    width: width,
    height: height * 0.65,
  },
  thumbnailStripArea: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    backgroundColor: '#FFFFFF',
  },
  thumbnailListContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  thumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  thumbnailWrapperActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },

  mainInfoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  productName: {
    fontSize: moderateScale(16),
    fontFamily: fonts.medium,
    color: '#1A1C1E',
    marginTop: 4,
    lineHeight: moderateScale(22),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingNumber: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 14,
    gap: 8,
  },
  discountedPrice: {
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  unitPriceSubText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  originalPrice: {
    fontSize: moderateScale(16),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: colors.primary,
  },

  bulkBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bulkBannerTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  bulkBannerSub: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },

  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  variantCard: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  variantCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  variantName: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1E293B',
  },
  variantNameActive: {
    color: colors.primary,
  },
  variantPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  variantOriginalPrice: {
    fontSize: moderateScale(10),
    fontFamily: fonts.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  variantPrice: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  variantPriceActive: {
    color: colors.primary,
  },

  tagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagChipText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: colors.primary,
  },

  serviceItemCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  serviceItemRight: {
    flex: 1,
  },
  deliveryTimeText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  deliverySubText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  serviceFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  serviceFeatureTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#1A1C1E',
  },

  trustBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  trustBadgeColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '45%',
  },
  sealContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  starburstPart: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight ?? '#F5F3FF',
  },
  sealInnerCircle: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight ?? '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampPill: {
    position: 'absolute',
    transform: [{ rotate: '-12deg' }],
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1.5,
  },
  stampText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontFamily: fonts.big,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  innerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3B5998',
    backgroundColor: '#3B5998',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ribbonTailLeft: {
    position: 'absolute',
    bottom: 2,
    left: 15,
    width: 9,
    height: 16,
    backgroundColor: colors.primary,
    transform: [{ rotate: '25deg' }],
    zIndex: -1,
  },
  ribbonTailRight: {
    position: 'absolute',
    bottom: 2,
    right: 15,
    width: 9,
    height: 16,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-25deg' }],
    zIndex: -1,
  },
  trustBadgeText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },

  detailsAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  accordionTitle: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  specCard: {
    marginTop: 14,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  specLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
    flex: 1,
  },
  specValue: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    flex: 1,
    textAlign: 'right',
  },
  specGroup: {
    marginTop: 6,
  },
  specGroupTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginBottom: 4,
  },
  specGroupContent: {
    fontSize: moderateScale(13),
    fontFamily: fonts.small,
    color: '#475569',
    lineHeight: moderateScale(18),
  },

  toastBanner: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    zIndex: 100,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
  },

  /* Bottom sheet modal styling */
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 80,
  },
  qtyBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.65,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  sheetSubTitle: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  qtyCircleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 2,
    gap: 16,
  },
  qtyCirclePill: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyCirclePillActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
  },
  qtyCircleText: {
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  qtyCircleTextActive: {
    color: colors.primary,
  },
  confirmQtyBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  confirmQtyBtnText: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  pillRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 2,
    gap: 12,
  },
  qtyPillWrapper: {
    padding: 3,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  qtyPillWrapperActive: {
    borderColor: '#9333EA',
    backgroundColor: '#FAF5FF',
  },
  qtyPill: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyPillActive: {
    borderColor: '#0D0814',
    backgroundColor: '#0D0814',
  },
  qtyPillText: {
    fontSize: moderateScale(20),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  qtyPillTextActive: {
    color: '#FFFFFF',
  },
  sheetOptionsList: {
    marginVertical: 10,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  sheetOptionRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
  },
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTextColumn: {
    flex: 1,
    flexShrink: 1,
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
  qtyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionQtyText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    flexShrink: 1,
  },
  tierBadge: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
  },
  optionUnitPriceText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  optionTotalPriceText: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: colors.primary,
  },

  /* Fixed Bottom Action Bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  optionClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowStepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
    overflow: 'hidden',
  },
  rowStepperBtn: {
    width: 28,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
  },
  rowStepperTextContainer: {
    paddingHorizontal: 10,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#FFFFFF',
  },
  rowStepperText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
    minWidth: 16,
    textAlign: 'center',
  },
  rowTotalPriceText: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: colors.primary,
    minWidth: 52,
    textAlign: 'right',
  },
  quantityContainer: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    gap: 6,
  },
  qtyBtnText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  addToBagBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 6,
  },
  addToBagBtnDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  addToBagBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
  },
  colorSwatchContainer: {
    padding: 3,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchContainerActive: {
    borderColor: colors.primary,
  },
  colorSwatchCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 1,
  },
});
