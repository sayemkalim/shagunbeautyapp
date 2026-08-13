import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { getUser } from '../api/authStorage';
import { getUserAddresses } from '../api/address';
import {
  ChevronLeft,
  ChevronDown,
  X,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Handbag,
  Percent,
  Minus,
  Plus,
  Trash2,
  MapPin,
  CheckCircle2,
  PlusCircle,
  Tag,
  Info,
  ChevronRight,
  ChevronUp,
  HelpCircle,
} from 'lucide-react-native';

import {
  selectCartItems,
  selectCartTotalAmount,
  selectCartTotalQuantity,
  removeFromCart,
  updateQuantity,
  clearCart,
  setCartData,
} from '../redux/cartSlice';
import { removeFromCartApi, getCart, addToCartApi } from '../api/cart';
import { getActiveCoupons } from '../api/coupon';
import { useQueryClient } from '@tanstack/react-query';
import BottomSheetModal from '../components/BottomSheetModal';
import { AddressCardSkeleton, Skeleton } from '../components/Skeleton';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

const { width, height } = Dimensions.get('window');
const DUMMY_IMG = require('../../assets/dummy_product.png');

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal) || 0;
  }
  return Number(value) || 0;
};

const getCouponCode = (coupon) => coupon?.code || coupon?.couponCode || coupon?.name || '';

// Builds a short "FLAT ₹X OFF" / "X% OFF" label from whatever discount fields the API sends.
const getDiscountLabel = (coupon = {}) => {
  const discountType = coupon.discount_type || coupon.discountType;
  const discountValue = coupon.discount_value ?? coupon.discountValue;
  if (discountType === 'flat' && discountValue) return `FLAT ₹${discountValue} OFF`;
  if ((discountType === 'percentage' || discountType === 'percent') && discountValue) {
    return `${discountValue}% OFF`;
  }
  if (coupon.discount_amount) return `₹${coupon.discount_amount} OFF`;
  return null;
};

// Works out whether a coupon applies to the current order value, and how much it would save —
// this is what drives the "min order ₹X" / "add ₹X more" condition messaging in the coupon UI.
const getCouponEligibility = (coupon = {}, orderValue = 0) => {
  const minOrderValue = Number(
    coupon.min_order_value ?? coupon.minOrderValue ?? coupon.min_cart_value ?? coupon.minCartValue ?? 0
  );
  const discountType = coupon.discount_type || coupon.discountType;
  const discountValue = Number(coupon.discount_value ?? coupon.discountValue ?? 0);
  const maxDiscount = Number(
    coupon.max_discount_amount ?? coupon.maxDiscount ?? coupon.max_discount_value ?? 0
  );

  let estimatedSavings = 0;
  if (discountType === 'flat') {
    estimatedSavings = discountValue;
  } else if (discountType === 'percentage' || discountType === 'percent') {
    estimatedSavings = (orderValue * discountValue) / 100;
    if (maxDiscount > 0) estimatedSavings = Math.min(estimatedSavings, maxDiscount);
  } else {
    estimatedSavings = Number(coupon.discount_amount ?? 0);
  }
  estimatedSavings = Math.max(0, Math.round(Math.min(estimatedSavings, orderValue || estimatedSavings)));

  const eligible = orderValue >= minOrderValue;
  const shortfall = Math.max(0, Math.round(minOrderValue - orderValue));

  return { minOrderValue, estimatedSavings, eligible, shortfall };
};

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const cartItems = useSelector(selectCartItems);
  const totalAmount = useSelector(selectCartTotalAmount);
  const totalQuantity = useSelector(selectCartTotalQuantity);

  const [backendCartData, setBackendCartData] = useState(null);
  const [loadingCart, setLoadingCart] = useState(false);
  const [updatingCartItemId, setUpdatingCartItemId] = useState(null);
  const [showDeliveryInfoModal, setShowDeliveryInfoModal] = useState(false);

  const refreshCart = async (addressId, couponCode) => {
    const addrId = addressId !== undefined ? addressId : selectedAddress?.id;
    const cpCode = couponCode !== undefined ? couponCode : appliedCoupon;
    try {
      setLoadingCart(true);
      const res = await getCart(addrId, cpCode);
      const data = res?.data?.data || res?.data || res || {};
      setBackendCartData(data);
      if (data.coupon && data.coupon.is_valid !== false) {
        setAppliedCoupon(data.coupon.code || null);
        setCouponDiscount(Math.round(Number(data.coupon.discount_amount || data.coupon_discount_amount || 0)));
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
      }
      dispatch(setCartData(data));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err) {
      console.log('Error refreshing cart from backend:', err);
    } finally {
      setLoadingCart(false);
    }
  };

  // Checked item IDs for selection
  const [selectedItemIds, setSelectedItemIds] = useState(() =>
    cartItems.map((item) => item.cartItemId)
  );

  // Quantity Modal state for cart item editing
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const qtyScrollRef = useRef(null);

  useEffect(() => {
    if (editingCartItem) {
      const idx = (tempQuantity || 1) - 1;
      const scrollX = Math.max(0, idx * 78 - 80);
      const timer = setTimeout(() => {
        qtyScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCartItem]);

  // Address Selection state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressesList, setAddressesList] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadAddresses = async () => {
        try {
          setLoadingAddresses(true);
          const currentUser = await getUser();
          if (!currentUser) return;
          const data = await getUserAddresses(currentUser.id);
          if (isMounted) {
            const mapped = (data || []).map(addr => ({
              id: addr._id,
              _id: addr._id,
              name: addr.name,
              pincode: addr.pincode,
              addressText: `${addr.address}, ${addr.city}, ${addr.state}`,
              city: addr.city,
              state: addr.state,
              isPrimary: addr.isPrimary,
              mobile: addr.mobile,
            }));
            setAddressesList(mapped);
            // Default select primary or the first one if not set
            if (mapped.length > 0) {
              const primary = mapped.find(a => a.isPrimary) || mapped[0];
              setSelectedAddress(primary);
            } else {
              setSelectedAddress(null);
            }
          }
        } catch (error) {
          console.log('Error fetching addresses in Cart:', error);
          if (isMounted) {
            setAddressesList([]);
            setSelectedAddress(null);
          }
        } finally {
          if (isMounted) {
            setLoadingAddresses(false);
          }
        }
      };

      loadAddresses();
      refreshCart();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  useEffect(() => {
    refreshCart(selectedAddress?.id);
  }, [selectedAddress]);

  // Coupon state
  // The active-coupons endpoint has been seen returning either a bare array,
  // an object wrapping the array ({ data / coupons: [...] }), or a single
  // coupon object directly — normalize all shapes to an array here.
  const extractCouponList = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.coupons)) return res.coupons;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.coupons)) return res.data.coupons;
    if (res?.code || res?.couponCode) return [res];
    if (res?.data?.code || res?.data?.couponCode) return [res.data];
    return [];
  };

  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [applyingCode, setApplyingCode] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [expandedCouponId, setExpandedCouponId] = useState(null);

  // Fetched once on mount (not gated on the sheet being open) so the collapsed
  // coupon card can also show a "save ₹X" / "add ₹X more" teaser.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoadingCoupons(true);
        const res = await getActiveCoupons();
        const list = extractCouponList(res);
        if (isMounted) setAvailableCoupons(list);
      } catch (err) {
        console.error('getActiveCoupons error in CartScreen:', err);
        if (isMounted) setAvailableCoupons([]);
      } finally {
        if (isMounted) setLoadingCoupons(false);
      }
    })();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCoupon = async (rawCode) => {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) return;
    try {
      setIsApplyingCoupon(true);
      setApplyingCode(code);
      setCouponError(null);
      const res = await getCart(selectedAddress?.id, code);
      const cartData = res?.data?.data || res?.data || res || {};
      const couponInfo = cartData.coupon || {};
      if (couponInfo.is_valid === false) {
        throw new Error(couponInfo.message || 'This coupon is not valid.');
      }
      setBackendCartData(cartData);
      setAppliedCoupon(code);
      setCouponDiscount(Math.round(Number(cartData.coupon_discount_amount || couponInfo.discount_amount || 0)));
      setCouponInput('');
      setShowCouponSheet(false);
      dispatch(setCartData(cartData));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err) {
      console.error('applyCoupon error in CartScreen:', err);
      setCouponError(err?.message || 'Invalid or expired coupon code.');
    } finally {
      setIsApplyingCoupon(false);
      setApplyingCode(null);
    }
  };

  const removeCoupon = async () => {
    try {
      setLoadingCart(true);
      const res = await getCart(selectedAddress?.id, '');
      console.log('removeCoupon response in CartScreen:', JSON.stringify(res, null, 2));
      const cartData = res?.data?.data || res?.data || res || {};
      setBackendCartData(cartData);
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponInput('');
      setCouponError(null);
      dispatch(setCartData(cartData));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err) {
      console.error('removeCoupon error in CartScreen:', err);
    } finally {
      setLoadingCart(false);
    }
  };

  // Modal state for removing item ("Move from Bag")
  const [removingCartItem, setRemovingCartItem] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleConfirmRemove = async (item, moveToWishlist = false) => {
    if (!item) return;
    try {
      setIsRemoving(true);
      setUpdatingCartItemId(item.cartItemId);
      // Backend API call to remove item from user cart (quantity: 0)
      await removeFromCartApi({
        type: 'product',
        productId: item.productId,
        variantSku: item.variant?.sku,
      });
      await refreshCart(selectedAddress?.id, appliedCoupon);
    } catch (err) {
      // Non-blocking fallback for offline/guest scenario
    } finally {
      dispatch(removeFromCart(item.cartItemId));
      setIsRemoving(false);
      setRemovingCartItem(null);
      setUpdatingCartItemId(null);
    }
  };

  // Sync selected IDs if new item added
  useMemo(() => {
    setSelectedItemIds((prev) => {
      const allKeys = cartItems.map((item) => item.cartItemId);
      // Keep previous selected if still present, plus add new ones
      return allKeys;
    });
  }, [cartItems]);

  const toggleSelectItem = (cartItemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(cartItemId)
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === cartItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(cartItems.map((item) => item.cartItemId));
    }
  };

  // Filter selected items for checkout
  const selectedCartItems = useMemo(() => {
    return cartItems.filter((item) => selectedItemIds.includes(item.cartItemId));
  }, [cartItems, selectedItemIds]);

  // Financial calculations
  const { totalMRP, totalSellingPrice, totalSavings, finalTotal, combinedSavings, shippingCharge } = useMemo(() => {
    if (backendCartData && Array.isArray(backendCartData.items) && backendCartData.items.length > 0) {
      let mrp = 0;
      const items = backendCartData.items || [];
      items.forEach((item) => {
        const prod = item.product || {};
        const basePrice = toNumber(prod.price) || toNumber(item.price) || 0;
        mrp += basePrice * (item.quantity || 1);
      });

      const selling = backendCartData.total_price || 0;
      const savings = mrp > selling ? mrp - selling : 0;
      const cDiscount = backendCartData.coupon_discount_amount ?? backendCartData.coupon?.discount_amount ?? 0;
      
      // Override shipping charge: ₹50 for orders below ₹2000, else ₹0
      const sCharge = (selling > 0 && selling < 2000) ? 50 : 0;
      const fTotal = Math.max(0, selling - cDiscount) + sCharge;
      const combSavings = savings + cDiscount;

      return {
        totalMRP: Math.round(mrp),
        totalSellingPrice: Math.round(selling),
        totalSavings: Math.round(savings),
        finalTotal: Math.round(fTotal),
        combinedSavings: Math.round(combSavings),
        shippingCharge: sCharge,
      };
    }

    let mrp = 0;
    let selling = 0;
    selectedCartItems.forEach((item) => {
      const basePrice = item.price > 0 ? item.price : item.unitPrice;
      mrp += basePrice * item.quantity;
      selling += item.totalPrice;
    });
    const savings = mrp > selling ? mrp - selling : 0;
    const cDiscount = appliedCoupon ? (couponDiscount || 0) : 0;
    
    // Override shipping charge: ₹50 for orders below ₹2000, else ₹0
    const sCharge = (selling > 0 && selling < 2000) ? 50 : 0;
    const fTotal = Math.max(0, selling - cDiscount) + sCharge;
    const combSavings = savings + cDiscount;

    return {
      totalMRP: Math.round(mrp),
      totalSellingPrice: Math.round(selling),
      totalSavings: Math.round(savings),
      finalTotal: Math.round(fTotal),
      combinedSavings: Math.round(combSavings),
      shippingCharge: sCharge,
    };
  }, [backendCartData, selectedCartItems, appliedCoupon, couponDiscount]);

  // Best coupon teaser for the collapsed coupon card — prefers the biggest
  // already-eligible saving, falling back to whichever coupon is closest to unlocking.
  const bestCoupon = useMemo(() => {
    if (!availableCoupons.length) return null;
    const withEligibility = availableCoupons.map((coupon) => ({
      coupon,
      ...getCouponEligibility(coupon, totalSellingPrice),
    }));
    const eligible = withEligibility.filter((entry) => entry.eligible && entry.estimatedSavings > 0);
    if (eligible.length > 0) {
      return eligible.sort((a, b) => b.estimatedSavings - a.estimatedSavings)[0];
    }
    return [...withEligibility].sort((a, b) => a.shortfall - b.shortfall)[0];
  }, [availableCoupons, totalSellingPrice]);

  const handleUpdateQty = async (cartItemId, newQty) => {
    dispatch(updateQuantity({ cartItemId, quantity: newQty }));
    setEditingCartItem(null);

    const item = cartItems.find((i) => i.cartItemId === cartItemId);
    if (item) {
      try {
        setUpdatingCartItemId(cartItemId);
        if (newQty <= 0) {
          await removeFromCartApi({
            productId: item.productId,
            variantSku: item.variant?.sku,
          });
        } else {
          await addToCartApi({
            productId: item.productId,
            quantity: newQty,
            variantSku: item.variant?.sku,
          });
        }
        await refreshCart(selectedAddress?.id, appliedCoupon);
      } catch (err) {
        console.error('Error updating cart quantity on backend:', err);
      } finally {
        setUpdatingCartItemId(null);
      }
    }
  };

  const handleRemove = (cartItemId) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item from your bag?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const item = cartItems.find((i) => i.cartItemId === cartItemId);
          dispatch(removeFromCart(cartItemId));
          if (item) {
            try {
              setUpdatingCartItemId(cartItemId);
              await removeFromCartApi({
                productId: item.productId,
                variantSku: item.variant?.sku,
              });
              await refreshCart(selectedAddress?.id, appliedCoupon);
            } catch (err) {
              console.error('Error removing item on backend:', err);
            } finally {
              setUpdatingCartItemId(null);
            }
          }
        },
      },
    ]);
  };

  const handlePlaceOrder = () => {
    if (selectedCartItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to place an order.');
      return;
    }
    navigation.navigate('Checkout', {
      selectedAddress,
      couponCode: appliedCoupon,
      totalAmount: finalTotal,
    });
  };

  const renderFullScreenSkeleton = () => {
    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { gap: 16 }]}
      >
        {/* Address Bar Shimmer */}
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Skeleton width={20} height={20} radius={10} />
            <View style={{ gap: 6, flex: 1 }}>
              <Skeleton width="45%" height={12} radius={4} />
              <Skeleton width="75%" height={10} radius={4} />
            </View>
          </View>
        </View>

        {/* Select All Row Skeleton */}
        <View style={[styles.selectAllRow, { borderBottomWidth: 0, marginTop: 4 }]}>
          <Skeleton width={120} height={16} radius={4} />
        </View>

        {/* 3 Cart Item Skeletons */}
        {Array.from({ length: 1 }).map((_, index) => (
          <View key={`sk_item_${index}`} style={[styles.cartCard, { height: 153, justifyContent: 'center' }]}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 20, paddingTop: 4 }}>
                <Skeleton width={18} height={18} radius={4} />
              </View>
              <Skeleton width={105} height={125} radius={14} />
              <View style={{ flex: 1, gap: 8, paddingRight: 20 }}>
                <Skeleton width="40%" height={12} radius={4} />
                <Skeleton width="85%" height={12} radius={4} style={{ marginTop: 2 }} />
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Skeleton width={60} height={20} radius={6} />
                  <Skeleton width={80} height={20} radius={6} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, alignItems: 'center' }}>
                  <Skeleton width={50} height={18} radius={4} />
                  <Skeleton width={80} height={14} radius={4} />
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Coupon Card Skeleton */}
        <View style={[styles.ticketContainer, styles.ticketContainerIdle, { paddingHorizontal: 14, justifyContent: 'center' }]}>
          <View style={[styles.ticketNotchTop, styles.ticketNotchTopIdle]} />
          <View style={[styles.ticketNotchBottom, styles.ticketNotchBottomIdle]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingLeft: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Skeleton width={24} height={24} radius={12} />
              <Skeleton width={140} height={14} radius={4} />
            </View>
            <Skeleton width={35} height={14} radius={4} style={{ marginRight: 8 }} />
          </View>
        </View>

        {/* Price Details Card Skeleton */}
        <View style={styles.priceDetailsCard}>
          <Skeleton width={100} height={16} radius={4} style={{ marginBottom: 16 }} />
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={80} height={12} radius={4} />
              <Skeleton width={60} height={12} radius={4} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={120} height={12} radius={4} />
              <Skeleton width={60} height={12} radius={4} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={160} height={12} radius={4} />
              <Skeleton width={60} height={12} radius={4} />
            </View>
          </View>
          <View style={[styles.summaryDivider, { marginVertical: 14 }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Skeleton width={90} height={16} radius={4} />
            <Skeleton width={80} height={20} radius={6} />
          </View>
        </View>

        {/* Trust Badges Shimmer */}
        <View style={[styles.trustBadgesRow, { justifyContent: 'center', marginVertical: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Skeleton width={16} height={16} radius={8} />
            <Skeleton width={80} height={12} radius={4} />
          </View>
          <Text style={[styles.trustDot, { color: '#E2E8F0' }]}>•</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Skeleton width={16} height={16} radius={8} />
            <Skeleton width={100} height={12} radius={4} />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Address Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => navigation?.goBack?.()}>
            <ChevronLeft size={24} color="#1A1C1E" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addressContainer}
            activeOpacity={0.8}
            onPress={() => setShowAddressModal(true)}>
            {selectedAddress ? (
              <>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.deliverToLabel}>Deliver to:</Text>
                  <Text style={styles.userNameText}>
                    {selectedAddress.name} ({selectedAddress.pincode})
                  </Text>
                  <ChevronDown size={14} color="#1A1C1E" />
                </View>
                <Text style={styles.addressSubText} numberOfLines={1}>
                  {selectedAddress.addressText}
                </Text>
              </>
            ) : (
              <View style={styles.addressTitleRow}>
                <Text style={[styles.deliverToLabel, { color: '#EF4444' }]}>
                  Select Delivery Address
                </Text>
                <ChevronDown size={14} color="#EF4444" style={{ marginLeft: 4 }} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* ── Top Nav Tab ── */}
      <View style={styles.navTabsRow}>
        <View style={[styles.navTabPill, styles.navTabPillActive]}>
          <Text style={[styles.navTabText, styles.navTabTextActive]}>
            Items
          </Text>
        </View>
      </View>

      {loadingCart && !backendCartData ? (
        renderFullScreenSkeleton()
      ) : cartItems.length === 0 ? (
        /* ── Empty Cart View ── */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyRingOuter}>
            <View style={styles.emptyIconCircle}>
              <Handbag size={40} color={colors.primary} strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Your Bag is Empty</Text>
          <Text style={styles.emptySubText}>
            Looks like you haven't added any products to your bag yet. Add products to get started!
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopNowBtnText}>Start Shopping</Text>
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>

          {/* ── Select All Row ── */}
          <View style={styles.selectAllRow}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              activeOpacity={0.8}
              onPress={toggleSelectAll}>
              <View
                style={[
                  styles.checkbox,
                  selectedItemIds.length === cartItems.length && styles.checkboxActive,
                ]}>
                {selectedItemIds.length === cartItems.length && (
                  <Check size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.selectAllText}>
                Select All ({selectedItemIds.length}/{cartItems.length})
              </Text>
            </TouchableOpacity>

            {/* <TouchableOpacity activeOpacity={0.7} onPress={() => dispatch(clearCart())}>
              <Text style={styles.clearAllText}>Clear Bag</Text>
            </TouchableOpacity> */}
          </View>

          {/* ── Cart Item Cards ── */}
          {cartItems.map((item) => {
            // Inline item loader is handled globally by the absolute overlay

            const isChecked = selectedItemIds.includes(item.cartItemId);
            
            const displayPrice = (typeof item.totalPrice === 'number' && item.totalPrice > 0)
              ? item.totalPrice
              : Math.round(((item.discountedPrice || item.price || item.unitPrice || 0) * (item.quantity || 1)));

            const basePrice = (typeof item.price === 'number' && item.price > 0)
              ? item.price
              : (item.unitPrice || (displayPrice / (item.quantity || 1)));

            const discountAmount =
              basePrice * item.quantity > displayPrice
                ? Math.round(basePrice * item.quantity - displayPrice)
                : 0;

            return (
              <View key={item.cartItemId} style={styles.cartCard}>
                {/* Remove Trash Button */}
                <TouchableOpacity
                  style={styles.cardCloseBtn}
                  activeOpacity={0.7}
                  onPress={() => setRemovingCartItem(item)}>
                  <Trash2 size={18} color="#64748B" />
                </TouchableOpacity>

                <View style={styles.cartCardMain}>
                  {/* Item Selection Checkbox */}
                  <TouchableOpacity
                    style={styles.itemCheckboxTouch}
                    activeOpacity={0.8}
                    onPress={() => toggleSelectItem(item.cartItemId)}>
                    <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                      {isChecked && <Check size={12} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>

                  {/* Product Image Thumbnail - Opens Product Detail */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('ProductDetail', { productId: item.productId })
                    }>
                    <Image
                      source={item.image ? { uri: item.image, cache: 'force-cache' } : DUMMY_IMG}
                      style={styles.cartItemImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>

                  {/* Product Details Right */}
                  <View style={styles.cartItemRight}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate('ProductDetail', { productId: item.productId })
                      }>
                      {item.brandName ? (
                        <Text style={styles.itemBrandName}>{item.brandName}</Text>
                      ) : null}
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>

                    {/* Option / Variant & Quantity Dropdown Pills */}
                    <View style={styles.pillsRow}>
                      {item.variantName ? (
                        <View style={styles.dropdownPill}>
                          <Text style={styles.dropdownPillText}>
                            Option: {item.variantName}
                          </Text>
                        </View>
                      ) : null}

                      {/* Beautiful Quantity Stepper (+ / -) */}
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.quantity <= 1) {
                              setRemovingCartItem(item);
                            } else {
                              handleUpdateQty(item.cartItemId, item.quantity - 1);
                            }
                          }}>
                          <Minus size={13} color={colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.stepperValueBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            setEditingCartItem(item);
                            setTempQuantity(item.quantity);
                          }}>
                          <Text style={styles.stepperValueText}>Qty: {item.quantity}</Text>
                          <ChevronDown size={11} color={colors.primary} style={{ marginLeft: 2 }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.quantity < 10) {
                              handleUpdateQty(item.cartItemId, item.quantity + 1);
                            }
                          }}>
                          <Plus
                            size={13}
                            color={item.quantity >= 10 ? '#CBD5E1' : colors.primary}
                            strokeWidth={2.5}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Price Row */}
                    <View style={styles.cardPriceRow}>
                      <Text style={styles.itemFinalPrice}>₹{displayPrice}</Text>
                      {discountAmount > 0 ? (
                        <>
                          <Text style={styles.itemMRPPrice}>
                            ₹{basePrice * item.quantity}
                          </Text>
                          <Text style={styles.itemDiscountOff}>
                            ₹{discountAmount} Off
                          </Text>
                        </>
                      ) : null}
                    </View>

                    {/* Delivery Service Line */}
                    {/* <View style={styles.itemDeliveryLine}>
                      <Truck size={14} color="#2d6a4f" />
                      <Text style={styles.itemDeliveryText}>
                        Fast Delivery Nationwide
                      </Text>
                    </View> */}
                  </View>
                </View>
              </View>
            );
          })}

          {/* ── Coupon Card ── */}
          <View style={[
            styles.ticketContainer,
            appliedCoupon ? styles.ticketContainerApplied : styles.ticketContainerIdle
          ]}>
            {/* Notches centered on the perforation line */}
            <View style={[
              styles.ticketNotchTop,
              appliedCoupon ? styles.ticketNotchTopApplied : styles.ticketNotchTopIdle
            ]} />
            <View style={[
              styles.ticketNotchBottom,
              appliedCoupon ? styles.ticketNotchBottomApplied : styles.ticketNotchBottomIdle
            ]} />

            {/* Left Stub */}
            <View style={styles.ticketStub}>
              {appliedCoupon ? (
                <View style={styles.couponAppliedIconCircle}>
                  <Check size={14} color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.couponIdleIconCircle}>
                  <Percent size={15} color={colors.primary} />
                </View>
              )}
            </View>

            {/* Perforation Line */}
            <View style={styles.ticketPerforation} />

            {/* Right Body */}
            <View style={styles.ticketBody}>
              {appliedCoupon ? (
                <>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <View style={styles.couponTitleRow}>
                      <Text style={[styles.couponTitle, { color: '#166534' }]}>{appliedCoupon}</Text>
                      {getDiscountLabel(backendCartData?.coupon) ? (
                        <View style={styles.couponAppliedBadgePill}>
                          <Text style={styles.couponAppliedBadgeText}>
                            {getDiscountLabel(backendCartData?.coupon)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.couponAppliedSubText, { color: '#2F855A', marginTop: 2 }]} numberOfLines={1}>
                      {couponDiscount > 0 ? `You saved ₹${couponDiscount} on this order` : 'Coupon applied'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.removeCouponBtn} activeOpacity={0.7} onPress={removeCoupon}>
                    <Text style={styles.removeCouponText}>Remove</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={[styles.couponTitle, { color: '#5B21B6' }]}>Apply Coupon</Text>
                    <Text style={styles.couponIdleSubText} numberOfLines={1}>
                      {bestCoupon
                        ? bestCoupon.eligible
                          ? `Use ${getCouponCode(bestCoupon.coupon)} & save ₹${bestCoupon.estimatedSavings}`
                          : `Add ₹${bestCoupon.shortfall} more to save with ${getCouponCode(bestCoupon.coupon)}`
                        : 'Unlock instant discounts'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewCouponsBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCouponError(null);
                      setShowCouponSheet(true);
                    }}>
                    <Text style={styles.applyCouponLink}>View</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* ── Delivery Info Banner ── */}
          {totalSellingPrice > 0 && (
            <View style={styles.deliveryInfoBanner}>
              {totalSellingPrice < 2000 ? (
                <>
                  <Truck size={18} color="#EA580C" style={styles.deliveryIcon} />
                  <Text style={styles.deliveryInfoText}>
                    Add <Text style={styles.deliveryBoldText}>₹{(2000 - totalSellingPrice).toLocaleString('en-IN')}</Text> more for <Text style={styles.deliveryBoldText}>FREE Delivery</Text> (₹50 delivery charge applies below ₹2,000)
                  </Text>
                </>
              ) : (
                <>
                  <Truck size={18} color="#16A34A" style={styles.deliveryIcon} />
                  <Text style={styles.deliveryInfoText}>
                    Your order qualifies for <Text style={styles.deliverySuccessText}>FREE Delivery!</Text>
                  </Text>
                </>
              )}
            </View>
          )}

          {/* ── Price Details Summary Card (Matching User Screenshot 2) ── */}
          <View style={styles.priceDetailsCard}>
            <Text style={styles.priceDetailsHeaderTitle}>Price Details</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelText}>Total MRP</Text>
              <Text style={styles.summaryValueText}>₹{totalMRP}</Text>
            </View>

            {totalSavings > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>Discount on MRP</Text>
                <Text style={styles.summaryDiscountText}>- ₹{totalSavings}</Text>
              </View>
            )}

            {appliedCoupon && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>Coupon ({appliedCoupon})</Text>
                <Text style={styles.summaryDiscountText}>
                  {couponDiscount > 0 ? `- ₹${couponDiscount}` : 'Applied'}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <Text style={styles.summaryLabelText}>Delivery Charges</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowDeliveryInfoModal(true)}
                  style={styles.infoIconTouch}>
                  <HelpCircle size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={shippingCharge > 0 ? styles.summaryValueText : styles.summaryFreeText}>
                {shippingCharge > 0 ? `₹${shippingCharge}` : 'FREE'}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total Amount</Text>
              <Text style={styles.summaryTotalValue}>₹{finalTotal}</Text>
            </View>

            {combinedSavings > 0 && (
              <View style={styles.savingsBannerPill}>
                <View style={styles.savingsIconCircle}>
                  <Percent size={13} color="#FFFFFF" strokeWidth={3} />
                </View>
                <Text style={styles.savingsBannerText}>
                  You're saving{' '}
                  <Text style={styles.savingsUnderlineAmount}>
                    ₹{combinedSavings.toLocaleString('en-IN')}
                  </Text>{' '}
                  on this order
                </Text>
              </View>
            )}
          </View>

          {/* ── Trust Badges Row ── */}
          <View style={styles.trustBadgesRow}>
            <View style={styles.trustBadgeItem}>
              <ShieldCheck size={16} color="#64748B" />
              <Text style={styles.trustBadgeText}>100% Authentic</Text>
            </View>
            <Text style={styles.trustDot}>•</Text>
            <View style={styles.trustBadgeItem}>
              <Truck size={16} color="#64748B" />
              <Text style={styles.trustBadgeText}>Contactless Delivery</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Fixed Bottom Sticky Action Bar (Matching User Screenshots) ── */}
      {cartItems.length > 0 && (
        <View style={styles.fixedBottomContainer}>
          <View style={styles.selectedCountBanner}>
            <Text style={styles.selectedCountText}>
              {selectedCartItems.length} Item{selectedCartItems.length !== 1 ? 's' : ''} selected for order
            </Text>
          </View>

          <View style={styles.bottomBarActionInner}>
            <TouchableOpacity
              style={[
                styles.placeOrderBtn,
                selectedCartItems.length === 0 && styles.placeOrderBtnDisabled,
                !selectedAddress && styles.selectAddressBtnHighlight,
              ]}
              activeOpacity={0.85}
              disabled={selectedCartItems.length === 0}
              onPress={() => {
                if (!selectedAddress) {
                  setShowAddressModal(true);
                } else {
                  handlePlaceOrder();
                }
              }}>
              <Text style={styles.placeOrderBtnText}>
                {!selectedAddress ? 'Select / Add Address' : 'Place Order'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Quantity Picker Modal for Cart Item (Matching Screenshot) ── */}
      <BottomSheetModal
        visible={!!editingCartItem}
        showHandle={true}
        onClose={() => setEditingCartItem(null)}>
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Change Quantity</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setEditingCartItem(null)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {/* Circular Horizontal Number Pills (1 to 10) */}
        <ScrollView
          ref={qtyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.qtyCircleContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => {
            const isSelected = tempQuantity === q;
            return (
              <TouchableOpacity
                key={q}
                activeOpacity={0.85}
                style={[
                  styles.qtyCirclePill,
                  isSelected && styles.qtyCirclePillActive,
                ]}
                onPress={() => setTempQuantity(q)}>
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

        {/* Confirm Solid Button */}
        <TouchableOpacity
          style={styles.confirmQtyBtn}
          activeOpacity={0.85}
          onPress={() => {
            handleUpdateQty(editingCartItem.cartItemId, tempQuantity);
            setEditingCartItem(null);
          }}>
          <Text style={styles.confirmQtyBtnText}>Confirm</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ── Address Selector / Add Address Modal ── */}
      <BottomSheetModal
        visible={showAddressModal}
        showHandle={true}
        onClose={() => setShowAddressModal(false)}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select Delivery Location</Text>
          <TouchableOpacity onPress={() => setShowAddressModal(false)}>
            <X size={22} color="#1E1B4B" />
          </TouchableOpacity>
        </View>

        {/* Saved Addresses List */}
        {loadingAddresses ? (
          <View>
            <AddressCardSkeleton />
            <AddressCardSkeleton />
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {addressesList.length === 0 ? (
              <View style={styles.noAddressItem}>
                <Text style={styles.noAddressItemText}>No addresses saved yet.</Text>
              </View>
            ) : (
              addressesList.map((addr) => {
                const isSel = selectedAddress?.id === addr.id;
                if (isSel) {
                  // Expanded Detailed Card for active/selected address
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.activeAddressContainer}
                      activeOpacity={0.9}
                      onPress={() => setSelectedAddress(null)}>
                      <View style={styles.activeAddressHeader}>
                        <View style={styles.activeAddressTitleRow}>
                          <MapPin size={16} color="#0F172A" style={{ marginRight: 6 }} />
                          <Text style={styles.activeAddressTitleText}>
                            {addr.name}, {addr.pincode}
                          </Text>
                        </View>
                        <View style={styles.redCheckCircle}>
                          <CheckCircle2 size={18} color="#FFFFFF" fill={colors.primary} />
                        </View>
                      </View>
                      
                      <Text style={styles.activeAddressDetailText}>
                        {addr.addressText}
                      </Text>
                      
                      <Text style={styles.activeAddressMobText}>
                        Mob: {addr.mobile || 'N/A'}
                      </Text>

                      <View style={styles.activeAddressButtonsRow}>
                        <TouchableOpacity
                          style={styles.editAddressTextBtn}
                          onPress={() => {
                            setShowAddressModal(false);
                            navigation.navigate('Address', { editAddress: addr });
                          }}
                          activeOpacity={0.7}>
                          <Text style={styles.editAddressTextBtnText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  // Simplified Row for non-selected addresses
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.simplifiedAddressCard}
                      activeOpacity={0.8}
                      onPress={() => setSelectedAddress(addr)}>
                      <View style={styles.simplifiedAddressRow}>
                        <Text style={styles.simplifiedAddressText} numberOfLines={2}>
                          {addr.name} ({addr.pincode}) - {addr.addressText}
                        </Text>
                        <View style={styles.simplifiedRadioCircle}>
                          {/* Circle check outline */}
                          <View style={styles.simplifiedRadioInnerCircle} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }
              })
            )}
          </ScrollView>
        )}

        {/* Bottom Add Address Button */}
        <TouchableOpacity
          style={styles.addNewAddressOutlineBtn}
          onPress={() => {
            setShowAddressModal(false);
            navigation.navigate('Address', { openAdd: true });
          }}
          activeOpacity={0.8}>
          <PlusCircle size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.addNewAddressOutlineBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ── Move from Bag Bottom Sheet Modal (Matching User Screenshot) ── */}
      <BottomSheetModal
        visible={!!removingCartItem}
        showHandle={true}
        onClose={() => setRemovingCartItem(null)}>
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Move from Bag</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setRemovingCartItem(null)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {/* Product Card Preview */}
        {removingCartItem && (
          <View style={styles.moveItemCard}>
            <Image
              source={removingCartItem.image ? { uri: removingCartItem.image, cache: 'force-cache' } : DUMMY_IMG}
              style={styles.moveItemImg}
              resizeMode="cover"
            />
            <View style={styles.moveItemRight}>
              {removingCartItem.brandName ? (
                <Text style={styles.moveItemBrand}>{removingCartItem.brandName}</Text>
              ) : null}
              <Text style={styles.moveItemName} numberOfLines={2}>
                {removingCartItem.name}
              </Text>
            </View>
          </View>
        )}

        {/* Confirmation Question */}
        <Text style={styles.moveConfirmText}>
          Are you sure you want to remove this item from bag?
        </Text>

        {/* Outline Action Button: Remove */}
        <View style={styles.moveActionButtonsRow}>
          <TouchableOpacity
            style={styles.removeOutlineBtn}
            activeOpacity={0.8}
            disabled={isRemoving}
            onPress={() => handleConfirmRemove(removingCartItem, false)}>
            {isRemoving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.removeOutlineBtnText}>Remove</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* ── Delivery Info Bottom Sheet Modal ── */}
      <BottomSheetModal
        visible={showDeliveryInfoModal}
        showHandle={true}
        onClose={() => setShowDeliveryInfoModal(false)}>
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Delivery Policy</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setShowDeliveryInfoModal(false)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {/* Info Content Container */}
        <View style={styles.deliveryModalContent}>
          <View style={styles.deliveryModalIconContainer}>
            <Truck size={36} color={colors.primary} />
          </View>
          <Text style={styles.deliveryModalHeading}>Delivery Fees Breakdown</Text>
          
          <View style={styles.deliveryPolicyRow}>
            <View style={[styles.deliveryStatusDot, { backgroundColor: '#EA580C' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryPolicyTitle}>Orders below ₹2,000</Text>
              <Text style={styles.deliveryPolicyDesc}>A flat shipping charge of ₹50 will be applied to your order total.</Text>
            </View>
          </View>

          <View style={styles.deliveryPolicyRow}>
            <View style={[styles.deliveryStatusDot, { backgroundColor: '#16A34A' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryPolicyTitle}>Orders ₹2,000 or above</Text>
              <Text style={styles.deliveryPolicyDesc}>Enjoy completely FREE delivery nationwide on all orders.</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deliveryModalGotItBtn}
            activeOpacity={0.8}
            onPress={() => setShowDeliveryInfoModal(false)}>
            <Text style={styles.deliveryModalGotItText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* ── Apply Coupon Bottom Sheet ── */}
      <BottomSheetModal
        visible={showCouponSheet}
        showHandle={true}
        onClose={() => {
          setShowCouponSheet(false);
          setCouponError(null);
        }}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Apply Coupon</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => {
              setShowCouponSheet(false);
              setCouponError(null);
            }}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        <View style={styles.couponInputRow}>
          <TextInput
            style={styles.couponInputField}
            placeholder="Enter coupon code"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            value={couponInput}
            onChangeText={(t) => {
              setCouponInput(t);
              setCouponError(null);
            }}
          />
          <TouchableOpacity
            style={[
              styles.couponApplyBtn,
              (!couponInput.trim() || isApplyingCoupon) && styles.couponApplyBtnDisabled,
            ]}
            activeOpacity={0.85}
            disabled={!couponInput.trim() || isApplyingCoupon}
            onPress={() => applyCoupon(couponInput)}>
            {isApplyingCoupon ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.couponApplyBtnText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>

        {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}

        <Text style={styles.couponListHeader}>Available Coupons</Text>

        {loadingCoupons ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
        ) : availableCoupons.length === 0 ? (
          <Text style={styles.noCouponsText}>No coupons available right now.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {availableCoupons.map((c) => {
              const code = getCouponCode(c);
              const discountLabel = getDiscountLabel(c);
              const { minOrderValue, estimatedSavings, eligible, shortfall } = getCouponEligibility(
                c,
                totalSellingPrice
              );
              const isCurrentlyApplied = appliedCoupon === code;
              const isApplyingThis = isApplyingCoupon && applyingCode === code;
              const disableApply = !eligible || isCurrentlyApplied || isApplyingCoupon;
              const isExpanded = expandedCouponId === code;

              const formattedExpiry = (() => {
                const expiryDate = c.expiresAt || c.expiry || c.endDate || c.expiryDate;
                if (expiryDate) {
                  try {
                    const dateObj = new Date(expiryDate);
                    const day = dateObj.getDate();
                    const getDaySuffix = (d) => {
                      if (d > 3 && d < 21) return 'th';
                      switch (d % 10) {
                        case 1:  return "st";
                        case 2:  return "nd";
                        case 3:  return "rd";
                        default: return "th";
                      }
                    };
                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    const monthStr = months[dateObj.getMonth()];
                    const year = dateObj.getFullYear();
                    let hours = dateObj.getHours();
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    return `${day}${getDaySuffix(day)} ${monthStr} ${year} | ${hours}:${minutes} ${ampm}`;
                  } catch (e) {
                    // Fallback
                  }
                }
                return '09th August 2026 | 11:59 PM';
              })();

              return (
                <View
                  key={c._id || code}
                  style={[styles.premiumCouponCard, !eligible && styles.premiumCouponCardDisabled]}>
                  {/* Top Row: Save Badge + Coupon Code + Action button */}
                  <View style={styles.premiumCouponTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={[styles.premiumSavePill, !eligible && styles.premiumSavePillDisabled]}>
                        <Text style={styles.premiumSaveText}>Save ₹{estimatedSavings}</Text>
                      </View>
                      <Text style={[styles.premiumCodeText, !eligible && styles.premiumCodeTextDisabled]}>{code}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.premiumApplyBtn, disableApply && styles.premiumApplyBtnDisabled]}
                      activeOpacity={0.8}
                      disabled={disableApply}
                      onPress={() => applyCoupon(code)}>
                      {isApplyingThis ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text
                          style={[
                            styles.premiumApplyBtnText,
                            disableApply && styles.premiumApplyBtnTextDisabled,
                          ]}>
                          {isCurrentlyApplied ? 'Applied' : 'Apply'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Second Row: Condition descriptions */}
                  <Text style={styles.premiumDescText}>
                    {c.description || `${discountLabel} on minimum purchase of Rs. ${minOrderValue || 0}.`}
                  </Text>

                  {/* Third Row: Details Toggle */}
                  <TouchableOpacity
                    style={styles.premiumDetailsToggle}
                    activeOpacity={0.7}
                    onPress={() => setExpandedCouponId(isExpanded ? null : code)}>
                    <Text style={styles.premiumDetailsToggleText}>Details</Text>
                    {isExpanded ? (
                      <ChevronUp size={14} color={colors.primary} />
                    ) : (
                      <ChevronDown size={14} color={colors.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Expandable details list section */}
                  {isExpanded && (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.premiumDashedDivider} />
                      <View style={{ gap: 6, marginTop: 10 }}>
                        <Text style={styles.premiumBulletItem}>
                          •  {c.description || `${discountLabel} on minimum purchase of Rs. ${minOrderValue || 0}`}
                        </Text>
                        <Text style={styles.premiumBulletItem}>
                          •  Expires on: {formattedExpiry}
                        </Text>
                        {!eligible && (
                          <Text style={[styles.premiumBulletItem, { color: '#EF4444' }]}>
                            •  Add ₹{shortfall} more to unlock this coupon
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </BottomSheetModal>
      <Modal transparent visible={updatingCartItemId !== null} animationType="none">
        <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.65)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Modal>
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
    backgroundColor: '#FFFFFF',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backBtn: {
    padding: 4,
  },
  addressContainer: {
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliverToLabel: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  userNameText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  addressSubText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 1,
  },
  headerIconButton: {
    padding: 6,
  },

  /* Jump Nav Tabs */
  navTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  navTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navTabPillActive: {
    backgroundColor: '#FAF5FF',
    borderColor: colors.primary,
  },
  navTabText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  navTabTextActive: {
    color: colors.primary,
    fontFamily: fonts.big,
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },

  /* Select All Row */
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectAllText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  clearAllText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },

  /* Cart Item Card */
  cartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    zIndex: 10,
  },
  cartCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemCheckboxTouch: {
    paddingTop: 4,
  },
  cartItemImg: {
    width: 105,
    height: 125,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  cartItemRight: {
    flex: 1,
    paddingRight: 20,
  },
  itemBrandName: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
    marginTop: 2,
    lineHeight: moderateScale(18),
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  dropdownPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownPillTrigger: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownPillText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 30,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
  },
  stepperValueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#FFFFFF',
  },
  stepperValueText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
    gap: 8,
  },
  itemFinalPrice: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  itemMRPPrice: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  itemDiscountOff: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  itemDeliveryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  itemDeliveryText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#2d6a4f',
  },

  /* Coupon Ticket Card */
  ticketContainer: {
    height: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ticketContainerIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D5F8',
  },
  ticketContainerApplied: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C6F6D5',
  },
  ticketNotchTop: {
    position: 'absolute',
    top: -8,
    left: 46,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    zIndex: 10,
  },
  ticketNotchTopIdle: {
    borderColor: '#E2D5F8',
  },
  ticketNotchTopApplied: {
    borderColor: '#C6F6D5',
  },
  ticketNotchBottom: {
    position: 'absolute',
    bottom: -8,
    left: 46,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    zIndex: 10,
  },
  ticketNotchBottomIdle: {
    borderColor: '#E2D5F8',
  },
  ticketNotchBottomApplied: {
    borderColor: '#C6F6D5',
  },
  ticketStub: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  ticketPerforation: {
    width: 0,
    height: '100%',
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderLeftColor: '#E2D5F8',
  },
  ticketBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
  },
  couponTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  couponTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  applyCouponBtnText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  couponIdleIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponIdleSubText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  couponAppliedIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2d6a4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponAppliedBadgePill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  couponAppliedBadgeText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#166534',
  },
  couponAppliedSubText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#2d6a4f',
    marginTop: 2,
  },
  removeCouponBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  removeCouponText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#EF4444',
  },
  viewCouponsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  couponInputField: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: moderateScale(14),
    color: '#0F172A',
  },
  couponApplyBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  couponApplyBtnText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  couponErrorText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#EF4444',
    marginBottom: 8,
  },
  couponListHeader: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 10,
  },
  noCouponsText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 24,
  },
  couponListItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  couponListItemDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  couponListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponListIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponListIconCircleDisabled: {
    backgroundColor: '#F1F5F9',
  },
  couponListCode: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    letterSpacing: 0.5,
  },
  couponListBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 3,
  },
  couponListBadgePillDisabled: {
    backgroundColor: '#F1F5F9',
  },
  couponListBadge: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  couponListBadgeDisabled: {
    color: '#94A3B8',
  },
  couponListConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  couponListDesc: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    flexShrink: 1,
  },
  couponListSavings: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#059669',
    marginTop: 6,
  },
  couponListShortfall: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#D97706',
    marginTop: 6,
  },
  couponListApplyBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponListApplyBtnDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  couponListApplyBtnText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  couponListApplyBtnTextDisabled: {
    color: '#94A3B8',
  },

  /* Price Details Card */
  priceDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  priceDetailsHeaderTitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  summaryValueText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  summaryDiscountText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#2d6a4f',
  },
  applyCouponLink: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  summaryFreeText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#2d6a4f',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  summaryTotalValue: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  savingsBannerPill: {
    backgroundColor: '#ECFCCB',
    borderWidth: 1,
    borderColor: '#D9F99D',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  savingsIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2d6a4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsBannerText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#2d6a4f',
    textAlign: 'center',
  },
  savingsUnderlineAmount: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#2d6a4f',
    textDecorationLine: 'underline',
    textDecorationColor: '#2d6a4f',
  },

  /* Trust Badges Row */
  trustBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    rowGap: 6,
    gap: 8,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  trustDot: {
    fontSize: moderateScale(12),
    color: '#CBD5E1',
  },

  /* Fixed Bottom Bar */
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  selectedCountBanner: {
    backgroundColor: '#FAF5FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  bottomBarActionInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placeOrderBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  placeOrderBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
  },
  emptyRingOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight ?? '#E8F0FE',
    backgroundColor: '#FDFEFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryLight ?? '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: moderateScale(20),
    maxWidth: 270,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  shopNowBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    fontWeight: '700',
  },

  /* Quantity Modal Sheet (Matching Screenshot) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  qtyPickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  sheetTopCloseRow: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  closeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySheetTitle: {
    fontSize: moderateScale(20),
    fontFamily: fonts.big,
    color: '#1E1B4B',
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

  /* Address Selector Modal Styles */
  addressSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  closeBtn: {
    padding: 4,
  },
  addressItemCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  addressItemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
  },
  addressRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  addrNameText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  addrDetailText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  clearAddressBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearAddressBtnText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#EF4444',
  },
  selectAddressBtnHighlight: {
    backgroundColor: colors.primary,
  },

  /* Move from Bag Modal Styles */
  removeFromBagSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  moveSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  moveSheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  moveSheetCloseBtn: {
    padding: 4,
  },
  moveItemCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  moveItemImg: {
    width: 64,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  moveItemRight: {
    flex: 1,
  },
  moveItemBrand: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    letterSpacing: 0.5,
  },
  moveItemName: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 3,
    lineHeight: moderateScale(18),
  },
  moveConfirmText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#334155',
    marginVertical: 18,
  },
  moveActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeOutlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  removeOutlineBtnText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  moveToWishlistBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveToWishlistBtnText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  pincodeSection: {
    marginBottom: 16,
  },
  pincodeInputContainer: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  pincodeInput: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.medium,
    fontSize: moderateScale(14),
    color: '#0F172A',
  },
  pincodeCheckText: {
    fontFamily: fonts.big,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  pincodeStatusMessage: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  pincodeStatusSuccess: {
    color: '#10B981',
  },
  pincodeStatusError: {
    color: '#EF4444',
  },
  quickActionsContainer: {
    marginBottom: 16,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  quickActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#EF4444',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#64748B',
  },
  activeAddressContainer: {
    backgroundColor: '#F5EEFD',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  activeAddressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeAddressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  activeAddressTitleText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  homeBadgeContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  homeBadgeText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    color: '#64748B',
  },
  redCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAddressDetailText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#1E293B',
    lineHeight: moderateScale(18),
    marginBottom: 4,
  },
  activeAddressMobText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 12,
  },
  activeAddressButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliverHereBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primary,
  },
  deliverHereBtnText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  editAddressTextBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  editAddressTextBtnText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  simplifiedAddressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  simplifiedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  simplifiedAddressText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#1E293B',
    flex: 1,
    lineHeight: moderateScale(18),
  },
  simplifiedRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simplifiedRadioInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  addNewAddressOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  addNewAddressOutlineBtnText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  noAddressItem: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noAddressItemText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
  },

  /* Premium Available Coupon list item styles */
  premiumCouponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  premiumCouponCardDisabled: {
    opacity: 0.8,
  },
  premiumCouponTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  premiumSavePill: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumSavePillDisabled: {
    backgroundColor: '#94A3B8',
  },
  premiumSaveText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
  },
  premiumCodeText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  premiumCodeTextDisabled: {
    color: '#94A3B8',
  },
  premiumApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  premiumApplyBtnDisabled: {
    opacity: 0.5,
  },
  premiumApplyBtnText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: colors.primary, // Primary action text color
  },
  premiumApplyBtnTextDisabled: {
    color: '#94A3B8',
  },
  premiumDescText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  premiumDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumDetailsToggleText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  premiumDashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 1,
    marginTop: 6,
  },
  premiumBulletItem: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 18,
  },
  deliveryInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  deliveryInfoText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#7C2D12',
    flex: 1,
    lineHeight: 16,
  },
  deliveryBoldText: {
    fontFamily: fonts.big,
    color: '#EA580C',
  },
  deliverySuccessText: {
    fontFamily: fonts.big,
    color: '#16A34A',
  },
  deliveryIcon: {
    marginRight: 6,
  },
  summaryLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoIconTouch: {
    padding: 2,
  },
  deliveryModalContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: 'center',
  },
  deliveryModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryModalHeading: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 20,
  },
  deliveryPolicyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  deliveryStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  deliveryPolicyTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1E293B',
    marginBottom: 2,
  },
  deliveryPolicyDesc: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    lineHeight: 16,
  },
  deliveryModalGotItBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  deliveryModalGotItText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
});
