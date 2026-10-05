import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  selectAddresses,
  selectSelectedAddress,
  selectAddressLoading,
  setSelectedAddress,
  fetchAddresses,
} from '../redux/addressSlice';
import {
  AlertCircle,
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
  useCartStore,
  parsePriceTiers,
  resolveItemPricing,
} from '../store/cartStore';

import { removeFromCartApi, getCart, addToCartApi } from '../api/cart';
import { getActiveCoupons } from '../api/coupon';
import { useQueryClient } from '@tanstack/react-query';
import BottomSheetModal from '../components/BottomSheetModal';
import { AddressCardSkeleton, Skeleton } from '../components/Skeleton';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getImageSource } from '../utils/imageOptimizer';
import { getProductById } from '../api/product';
import { getProductStock, isProductOutOfStock, getItemVariantSku } from '../utils/productUtils';

const { width, height } = Dimensions.get('window');
const DUMMY_IMG = require('../../assets/dummy_product.png');

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal) || 0;
  }
  return Number(value) || 0;
};

const isColorLight = (hexColor) => {
  if (!hexColor || typeof hexColor !== 'string') return false;
  const trimmed = hexColor.trim().toLowerCase();
  if (['white', '#fff', '#ffffff', 'ivory', 'cream', 'yellow', 'beige', 'lightgray', 'lightgrey'].includes(trimmed)) {
    return true;
  }
  const hex = trimmed.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 175;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 175;
  }
  return false;
};

const extractCleanShadeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  let clean = name.trim();
  clean = clean.replace(/\s*\(\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)?\s*\)\s*$/i, '').trim();

  if (/[\u2014\u2013]/.test(clean)) {
    const parts = clean.split(/[\u2014\u2013]/);
    const last = parts[parts.length - 1].trim().replace(/^-\s*/, '');
    if (last && last.length < 40 && !/^\d+\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i.test(last)) {
      const colorSub = last.match(/(?:COLOR|COLOUR|SHADE)\s*-\s*(.+)$/i);
      if (colorSub && colorSub[1]) return colorSub[1].trim();
      return last;
    }
  }

  if (/\s+-\s*/.test(clean)) {
    const parts = clean.split(/\s+-\s*/);
    const last = parts[parts.length - 1].trim();
    if (last && last.length < 40 && !/^\d+\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i.test(last)) {
      return last;
    }
  }

  if (/[:|]/.test(clean)) {
    const parts = clean.split(/[:|]/);
    const last = parts[parts.length - 1].trim();
    if (last && last.length < 40 && !/^\d+\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i.test(last)) {
      return last;
    }
  }

  const shadeMatch = clean.match(/(?:COLOR|COLOUR|SHADE)\s*[-:]?\s*([0-9A-Za-z\s/&.'#]+)$/i);
  if (shadeMatch && shadeMatch[1]) {
    const candidate = shadeMatch[1].trim();
    if (candidate.length > 0 && candidate.length < 40 && !/^\d+\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i.test(candidate)) {
      return candidate;
    }
  }

  return '';
};

const extractCartItemOption = (item) => {
  if (!item) return null;

  const v = item.variant || {};

  // 1. Color extraction
  let rawColor =
    item.color ||
    v.color ||
    v.color_code ||
    v.colorCode ||
    v.hex ||
    v.attributes?.color ||
    v.attributes?.shade ||
    v.attributes?.hex ||
    v.attributes?.['Color'] ||
    v.attributes?.['Colour'] ||
    v.attributes?.['Color Code'];

  if (rawColor && typeof rawColor === 'object') {
    rawColor = rawColor.hex || rawColor.code || rawColor.value || rawColor.color || rawColor.name;
  }

  let color = null;
  if (typeof rawColor === 'string' && rawColor.trim() !== '') {
    const trimmed = rawColor.trim();
    if (
      /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ||
      /^rgb/i.test(trimmed) ||
      /^hsl/i.test(trimmed) ||
      /^(red|blue|green|yellow|orange|purple|pink|brown|black|white|grey|gray|beige|gold|silver|maroon|navy|teal|coral|turquoise|lavender|magenta|cyan|olive|plum|peach|ivory|charcoal|burgundy|crimson|ruby|nude|bronze|copper|amber)$/i.test(trimmed)
    ) {
      color = trimmed;
    }
  }

  // 2. Shade Name extraction
  let rawShade =
    item.shadeName ||
    item.shade ||
    item.shade_name ||
    item.color_name ||
    item.colorName ||
    v.shade ||
    v.shade_name ||
    v.shadeName ||
    v.color_name ||
    v.colorName ||
    v.attributes?.shade ||
    v.attributes?.['Shade'] ||
    v.attributes?.color_name ||
    v.attributes?.['Color Name'];

  if (rawShade && typeof rawShade === 'object') {
    rawShade = rawShade.name || rawShade.label || rawShade.title || rawShade.shade;
  }

  let shadeName = '';
  if (typeof rawShade === 'string' && rawShade.trim() !== '' && !rawShade.trim().startsWith('#')) {
    shadeName = rawShade.trim();
  }

  // Check item.variantName if it's a clean shade name
  if (!shadeName && typeof item.variantName === 'string' && item.variantName.trim() !== '') {
    const cleanVar = item.variantName.replace(/^(?:Option|Size|Shade):\s*/i, '').trim();
    if (!cleanVar.startsWith('#') && !cleanVar.startsWith('SKU-') && !/^\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i.test(cleanVar)) {
      if (!item.name || !item.name.toLowerCase().includes(cleanVar.toLowerCase())) {
        shadeName = cleanVar;
      }
    }
  }

  // Extract from variant name only if variant exists and differs from product name
  if (!shadeName && v && typeof v.name === 'string' && v.name.trim() !== '' && v.name !== item.name) {
    shadeName = extractCleanShadeName(v.name);
  }

  // 3. Size / Weight / Volume extraction
  let sizeLabel = '';
  if (v.weight_in_grams !== undefined && v.weight_in_grams !== null && v.weight_in_grams !== '') {
    const isMl = (item.name && /ml/i.test(item.name)) || (v.name && /ml/i.test(v.name)) || (item.variantName && /ml/i.test(item.variantName));
    sizeLabel = `${v.weight_in_grams} ${isMl ? 'ml' : 'g'}`;
  } else if (v.weight !== undefined && v.weight !== null && v.weight !== '') {
    const isMl = (item.name && /ml/i.test(item.name)) || (v.name && /ml/i.test(v.name));
    sizeLabel = `${v.weight} ${isMl ? 'ml' : 'g'}`;
  } else if (item.weight_in_grams !== undefined && item.weight_in_grams !== null && item.weight_in_grams !== '') {
    const isMl = (item.name && /ml/i.test(item.name)) || (item.variantName && /ml/i.test(item.variantName));
    sizeLabel = `${item.weight_in_grams} ${isMl ? 'ml' : 'g'}`;
  } else if (item.product?.weight_in_grams !== undefined && item.product?.weight_in_grams !== null && item.product?.weight_in_grams !== '') {
    const isMl = (item.name && /ml/i.test(item.name)) || (item.variantName && /ml/i.test(item.variantName));
    sizeLabel = `${item.product.weight_in_grams} ${isMl ? 'ml' : 'g'}`;
  } else if (typeof item.variantName === 'string') {
    const cleanVarName = item.variantName.replace(/^Option:\s*/i, '').replace(/^Size:\s*/i, '').trim();
    const match = cleanVarName.match(/^\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i);
    if (match) {
      sizeLabel = match[0];
    }
  }

  if (!sizeLabel && typeof v.name === 'string') {
    const match = v.name.match(/\b\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)\b/i);
    if (match && (v.name.length < 20 || /^\d/.test(v.name))) {
      sizeLabel = match[0];
    }
  }

  if (!sizeLabel && typeof item.name === 'string') {
    const match = item.name.match(/\(\s*(\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs))\s*\)/i);
    if (match) {
      sizeLabel = match[1];
    }
  }

  // 4. Fallback option name if no color, no shade, no size
  let fallbackOption = '';
  if (!color && !sizeLabel && !shadeName) {
    if (item.variantName) {
      const clean = item.variantName.replace(/^(?:Option|Size|Net Vol|Net Wt):\s*/i, '').trim();
      if (!clean.startsWith('SKU-') && !clean.startsWith('#') && (!item.name || !item.name.toLowerCase().includes(clean.toLowerCase()))) {
        fallbackOption = clean;
      }
    }
    if (!fallbackOption && v.name && v.name !== item.name) {
      fallbackOption = v.name;
    }
  }

  // If no variant information at all, don't show pill
  if (!color && !sizeLabel && !shadeName && !fallbackOption) {
    return null;
  }

  // Formulate display info
  if (color) {
    let label = shadeName || '';
    if (label && label.startsWith('#')) {
      label = '';
    }
    if (label) {
      label = label
        .replace(/\s*•.*$/i, '')
        .replace(/\s*\(\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)\s*\)/i, '')
        .replace(/\s+\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i, '')
        .trim();
    }

    // Never show hex code as the text!
    if (!label || label.startsWith('#')) {
      label = (v.name && extractCleanShadeName(v.name)) || '';
    }
    if (!label || label.startsWith('#')) {
      label = !color.startsWith('#') ? color : 'Shade';
    }

    return {
      color,
      labelPrefix: '',
      displayText: label,
    };
  }

  if (sizeLabel) {
    const isVolume = /\b(?:ml|l|ltr|litre|liter)\b/i.test(sizeLabel) || (item.name && /ml/i.test(item.name)) || (v.name && /ml/i.test(v.name));
    const prefix = isVolume ? 'Net Vol' : 'Net Wt';
    return {
      color: null,
      labelPrefix: prefix,
      displayText: sizeLabel,
    };
  }

  if (shadeName) {
    return {
      color: null,
      labelPrefix: '',
      displayText: shadeName,
    };
  }

  return {
    color: null,
    labelPrefix: 'Option',
    displayText: fallbackOption,
  };
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
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const cartItems = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const totalQuantity = useCartStore((state) => state.totalQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const setCartData = useCartStore((state) => state.setCartData);

  const [backendCartData, setBackendCartData] = useState(null);
  const [loadingCart, setLoadingCart] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingCartItemId, setUpdatingCartItemId] = useState(null);
  const [showDeliveryInfoModal, setShowDeliveryInfoModal] = useState(false);
  const [itemsStockMap, setItemsStockMap] = useState({});

  const itemSeqRef = useRef({});

  const getItemStock = React.useCallback(
    (item) => {
      if (!item) return 0;
      const pId = item.productId || item.id;
      const targetSku = item.variant?.sku || item.variant_sku || item.sku;
      const targetId = item.variant?._id || item.variant?.id || item.variantId;

      // 1. Live fetched stock map from getProductById in CartScreen
      if (itemsStockMap && itemsStockMap[pId]) {
        const liveProd = itemsStockMap[pId];
        let matchingVariant = null;

        if (Array.isArray(liveProd.variants) && liveProd.variants.length > 0) {
          // Strict SKU match first
          if (targetSku) {
            matchingVariant = liveProd.variants.find((v) => v.sku === targetSku);
          }
          // Strict _id match
          if (!matchingVariant && targetId) {
            matchingVariant = liveProd.variants.find(
              (v) => v._id === targetId || v.id === targetId || String(v._id) === String(targetId)
            );
          }
          // Attribute match (unique name + color/shade/weight)
          if (!matchingVariant && item.variant) {
            matchingVariant = liveProd.variants.find(
              (v) =>
                (v.sku && v.sku === item.variant.sku) ||
                (v._id && (v._id === item.variant._id || String(v._id) === String(item.variant._id)))
            );
          }
        }
        return getProductStock(liveProd, matchingVariant || item.variant);
      }

      // 2. React Query cache
      const cached = queryClient?.getQueryData(['product', pId]);
      if (cached) {
        const prodData = cached.data || cached;
        let matchingVariant = null;
        if (Array.isArray(prodData.variants) && prodData.variants.length > 0) {
          if (targetSku) {
            matchingVariant = prodData.variants.find((v) => v.sku === targetSku);
          }
          if (!matchingVariant && targetId) {
            matchingVariant = prodData.variants.find(
              (v) => v._id === targetId || v.id === targetId || String(v._id) === String(targetId)
            );
          }
        }
        return getProductStock(prodData, matchingVariant || item.variant);
      }

      // 3. Direct item variant stock
      return getProductStock(item, item.variant);
    },
    [itemsStockMap, queryClient]
  );

  const checkIfOutOfStock = React.useCallback(
    (item) => {
      if (!item) return false;
      return getItemStock(item) <= 0;
    },
    [getItemStock]
  );

  // In-stock vs out-of-stock cart items
  const inStockCartItems = useMemo(() => {
    return cartItems.filter((item) => !checkIfOutOfStock(item));
  }, [cartItems, checkIfOutOfStock]);

  const hasOutOfStockItems = useMemo(() => {
    return cartItems.some((item) => checkIfOutOfStock(item));
  }, [cartItems, checkIfOutOfStock]);

  // Sort cart items so all in-stock items appear first, and out-of-stock items are pushed to the bottom
  const sortedCartItems = useMemo(() => {
    return [...cartItems].sort((a, b) => {
      const aOut = checkIfOutOfStock(a);
      const bOut = checkIfOutOfStock(b);
      if (aOut && !bOut) return 1;
      if (!aOut && bOut) return -1;
      return 0;
    });
  }, [cartItems, checkIfOutOfStock]);

  // Coupon state
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
  const appliedCouponRef = useRef(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [applyingCode, setApplyingCode] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [expandedCouponId, setExpandedCouponId] = useState(null);

  const refreshCart = React.useCallback(async (addressId, couponCode) => {
    const addrId = addressId !== undefined ? addressId : selectedAddress?.id;
    const cpCode = couponCode !== undefined ? couponCode : appliedCouponRef.current;
    try {
      setLoadingCart(true);
      const res = await getCart(addrId, cpCode || undefined);
      const data = res?.data?.data || res?.data || res || {};
      setBackendCartData(data);
      
      const returnedCoupon = data.coupon || data.applied_coupon || data.appliedCoupon;
      const returnedCouponCode = returnedCoupon?.code || returnedCoupon?.couponCode || data.coupon_code || data.couponCode;
      const returnedDiscount = Math.round(Number(
        returnedCoupon?.discount_amount ||
        returnedCoupon?.discountAmount ||
        data.coupon_discount_amount ||
        data.coupon_discount ||
        data.discount_amount ||
        0
      ));

      if (cpCode) {
        if (returnedCoupon && returnedCoupon.is_valid === false) {
          setAppliedCoupon(null);
          appliedCouponRef.current = null;
          setCouponDiscount(0);
        } else {
          const finalCode = returnedCouponCode || cpCode;
          setAppliedCoupon(finalCode);
          appliedCouponRef.current = finalCode;
          if (returnedDiscount > 0) {
            setCouponDiscount(returnedDiscount);
          }
        }
      } else if (returnedCoupon && returnedCoupon.is_valid !== false && returnedCouponCode) {
        setAppliedCoupon(returnedCouponCode);
        appliedCouponRef.current = returnedCouponCode;
        setCouponDiscount(returnedDiscount);
      } else {
        setAppliedCoupon(null);
        appliedCouponRef.current = null;
        setCouponDiscount(0);
      }

      setCartData(data);
    } catch (err) {
      console.log('Error refreshing cart from backend:', err);
    } finally {
      setLoadingCart(false);
    }
  }, [selectedAddress?.id, setCartData]);

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshCart(),
        dispatch(fetchAddresses()),
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['addresses'] }),
      ]);
    } catch (e) {
      console.log('Cart pull refresh error:', e);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [refreshCart, dispatch, queryClient]);

  // Quantity Modal state for cart item editing
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const qtyScrollRef = useRef(null);

  const editingVariantObj = editingCartItem?.variant?.sku && Array.isArray(itemsStockMap[editingCartItem.productId]?.variants)
    ? itemsStockMap[editingCartItem.productId].variants.find((v) => v.sku === editingCartItem.variant.sku || v._id === editingCartItem.variant.sku)
    : null;
  const editingItemTiers = editingCartItem
    ? (editingCartItem.price_tiers || parsePriceTiers(
        editingVariantObj?.price_tiers || editingVariantObj?.priceTiers ||
        itemsStockMap[editingCartItem.productId]?.price_tiers || itemsStockMap[editingCartItem.productId]?.priceTiers
      ))
    : null;
  const editingAvailableQtys = useMemo(() => {
    const itemStock = editingCartItem ? getItemStock(editingCartItem) : 999;
    let baseList = [];
    if (editingItemTiers && editingItemTiers.length > 0) {
      baseList = [1, ...editingItemTiers.map((t) => t.quantity)].sort((a, b) => a - b);
    } else {
      baseList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    if (itemStock > 0) {
      const filtered = baseList.filter((q) => q <= itemStock);
      return filtered.length > 0 ? filtered : [1];
    }
    return baseList;
  }, [editingItemTiers, editingCartItem, getItemStock]);

  useEffect(() => {
    if (editingCartItem) {
      const idx = editingAvailableQtys.indexOf(tempQuantity);
      const scrollIdx = idx !== -1 ? idx : Math.max(0, (tempQuantity || 1) - 1);
      const scrollX = Math.max(0, scrollIdx * 78 - 80);
      const timer = setTimeout(() => {
        qtyScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCartItem, editingAvailableQtys]);

  // Address Selection state from Redux (backed by AsyncStorage cache for 0ms delay)
  const selectedAddress = useSelector(selectSelectedAddress);
  const addressesList = useSelector(selectAddresses);
  const loadingAddresses = useSelector(selectAddressLoading);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Keep track of the last address ID refreshed with cart to avoid redundant duplicate calls
  const lastRefreshedAddressId = useRef('__INIT__');

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      // 1. Fetch full live cart from backend immediately whenever Cart Screen is focused
      refreshCart(selectedAddress?.id, appliedCouponRef.current);

      // 2. Fetch latest addresses in background into Redux (non-blocking)
      dispatch(fetchAddresses());

      // 3. Fetch live stock for all items currently in cart
      if (cartItems && cartItems.length > 0) {
        const uniqueProductIds = [...new Set(cartItems.map((ci) => ci.productId).filter(Boolean))];
        const map = {};
        Promise.all(
          uniqueProductIds.map(async (pId) => {
            try {
              const res = await getProductById(pId);
              const data = res?.data?.data || res?.data || res;
              if (data && isMounted) {
                map[pId] = data;
                queryClient.setQueryData(['product', pId], data);
              }
            } catch (e) {
              console.log('Error fetching stock for cart item:', pId, e);
            }
          })
        ).then(() => {
          if (isMounted) {
            setItemsStockMap((prev) => ({ ...prev, ...map }));
          }
        });
      }

      return () => {
        isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshCart, selectedAddress?.id, dispatch])
  );

  // Dedicated effect to keep itemsStockMap up to date whenever cartItems list changes and every 3 seconds live
  useEffect(() => {
    let isMounted = true;

    const fetchStock = async () => {
      if (cartItems && cartItems.length > 0) {
        const uniqueProductIds = [...new Set(cartItems.map((ci) => ci.productId).filter(Boolean))];
        const map = {};
        await Promise.all(
          uniqueProductIds.map(async (pId) => {
            try {
              const res = await getProductById(pId);
              const data = res?.data?.data || res?.data || res;
              if (data && isMounted) {
                map[pId] = data;
                queryClient.setQueryData(['product', pId], data);
              }
            } catch (e) {
              console.log('Error fetching stock for cart item:', pId, e);
            }
          })
        );
        if (isMounted) {
          setItemsStockMap((prev) => ({ ...prev, ...map }));
        }
      }
    };

    fetchStock();
    const interval = setInterval(fetchStock, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cartItems, queryClient]);

  // Refresh cart with selectedAddress on mount and whenever selectedAddress ID actually changes
  useEffect(() => {
    if (selectedAddress?.id !== lastRefreshedAddressId.current) {
      lastRefreshedAddressId.current = selectedAddress?.id;
      refreshCart(selectedAddress?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.id]);

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

  const openCouponSheet = () => {
    setCouponError(null);
    setShowCouponSheet(true);
    setLoadingCoupons(true);
    getActiveCoupons()
      .then((res) => {
        const list = extractCouponList(res);
        setAvailableCoupons(list);
      })
      .catch((err) => {
        console.error('getActiveCoupons error in CartScreen:', err);
      })
      .finally(() => {
        setLoadingCoupons(false);
      });
  };

  const applyCoupon = async (rawCode) => {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) return;
    try {
      setIsApplyingCoupon(true);
      setApplyingCode(code);
      setCouponError(null);
      const res = await getCart(selectedAddress?.id, code);
      const cartData = res?.data?.data || res?.data || res || {};
      const couponInfo = cartData.coupon || cartData.applied_coupon || {};
      if (couponInfo.is_valid === false) {
        throw new Error(couponInfo.message || 'This coupon is not valid.');
      }
      setBackendCartData(cartData);
      setAppliedCoupon(code);
      appliedCouponRef.current = code;
      let discount = Math.round(Number(
        cartData.coupon_discount_amount ||
        cartData.coupon_discount ||
        cartData.couponDiscount ||
        couponInfo.discount_amount ||
        couponInfo.discountAmount ||
        couponInfo.discount ||
        0
      ));

      if (discount <= 0 && availableCoupons && availableCoupons.length > 0) {
        const matched = availableCoupons.find(
          (c) => getCouponCode(c).toUpperCase() === code
        );
        if (matched) {
          const { estimatedSavings, eligible } = getCouponEligibility(matched, totalSellingPrice);
          if (eligible && estimatedSavings > 0) {
            discount = estimatedSavings;
          }
        }
      }

      setCouponDiscount(discount);
      setCouponInput('');
      setShowCouponSheet(false);
      setCartData(cartData);
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
      setAppliedCoupon(null);
      appliedCouponRef.current = null;
      setCouponDiscount(0);
      setCouponInput('');
      setCouponError(null);
      const res = await getCart(selectedAddress?.id, '');
      const cartData = res?.data?.data || res?.data || res || {};
      setBackendCartData(cartData);
      setCartData(cartData);
    } catch (err) {
      console.error('removeCoupon error in CartScreen:', err);
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
        variantSku: getItemVariantSku(item),
      });
      await refreshCart(selectedAddress?.id, appliedCoupon);
    } catch (err) {
      // Non-blocking fallback for offline/guest scenario
    } finally {
      removeFromCart(item.cartItemId);
      setIsRemoving(false);
      setRemovingCartItem(null);
      setUpdatingCartItemId(null);
    }
  };

  // All in-stock items are automatically the items to be ordered (no checkboxes)
  const selectedCartItems = inStockCartItems;
  const selectedItemIds = useMemo(() => {
    return inStockCartItems.map((item) => item.cartItemId);
  }, [inStockCartItems]);

  // Financial calculations - Calculated instantly and accurately from selected cart items
  const { totalMRP, totalSellingPrice, totalSavings, finalTotal, combinedSavings, shippingCharge } = useMemo(() => {
    let mrp = 0;
    let selling = 0;
    selectedCartItems.forEach((item) => {
      const basePrice = (typeof item.price === 'number' && item.price > 0) ? item.price : (item.unitPrice || 0);
      mrp += basePrice * (item.quantity || 1);
      const itemTotal = (typeof item.totalPrice === 'number' && item.totalPrice > 0)
        ? item.totalPrice
        : ((item.unitPrice || 0) * (item.quantity || 1));
      selling += itemTotal;
    });

    const savings = mrp > selling ? mrp - selling : 0;
    const backendDiscount = Math.round(Number(
      backendCartData?.coupon_discount_amount ||
      backendCartData?.coupon_discount ||
      backendCartData?.couponDiscount ||
      backendCartData?.coupon?.discount_amount ||
      0
    ));
    const cDiscount = appliedCoupon
      ? (backendDiscount > 0 ? backendDiscount : (couponDiscount || 0))
      : 0;
    
    // Delivery charge rule: sync with backend shipping charge if available, otherwise ₹50 below ₹2000
    const sCharge = (backendCartData && typeof backendCartData.shipping_charge === 'number')
      ? backendCartData.shipping_charge
      : ((selling > 0 && selling < 2000) ? 50 : 0);

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
  }, [selectedCartItems, backendCartData, appliedCoupon, couponDiscount]);

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
    const item = cartItems.find((i) => i.cartItemId === cartItemId);
    if (item && newQty > 0) {
      const itemStock = getItemStock(item);
      if (itemStock > 0 && newQty > itemStock) {
        Alert.alert('Stock Limit', `Only ${itemStock} items available in stock.`);
        return;
      }
    }

    // 1. Instant local optimistic update in Zustand (Instant 0ms UI & price update)
    updateQuantity({ cartItemId, quantity: newQty });
    setEditingCartItem(null);

    // 2. Instant API call with sequence guard to eliminate race conditions
    if (item) {
      const currentSeq = (itemSeqRef.current[cartItemId] || 0) + 1;
      itemSeqRef.current[cartItemId] = currentSeq;

      try {
        setUpdatingCartItemId(cartItemId);
        if (newQty <= 0) {
          await removeFromCartApi({
            productId: item.productId,
            variantSku: getItemVariantSku(item),
          });
        } else {
          await addToCartApi({
            productId: item.productId,
            quantity: newQty,
            variantSku: getItemVariantSku(item),
          });
        }

        // Refresh cart from backend only if this response is still the latest one for this item
        if (itemSeqRef.current[cartItemId] === currentSeq) {
          await refreshCart(selectedAddress?.id, appliedCoupon);
        }
      } catch (err) {
        console.error('Error updating cart quantity on backend:', err);
      } finally {
        if (itemSeqRef.current[cartItemId] === currentSeq) {
          setUpdatingCartItemId(null);
        }
      }
    }
  };

  // Automatically set cart item quantity to available in-stock units if stock is less than cart quantity
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;

    cartItems.forEach((item) => {
      const stock = getItemStock(item);
      if (typeof stock === 'number' && stock > 0 && item.quantity > stock) {
        handleUpdateQty(item.cartItemId, stock);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsStockMap, cartItems, getItemStock]);

  const handleRemove = (cartItemId) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item from your bag?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          delete itemSeqRef.current[cartItemId];
          const item = cartItems.find((i) => i.cartItemId === cartItemId);
          removeFromCart(cartItemId);
          if (item) {
            try {
              setUpdatingCartItemId(cartItemId);
              await removeFromCartApi({
                productId: item.productId,
                variantSku: getItemVariantSku(item),
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
    if (cartItems.length === 0) {
      Alert.alert('Empty Bag', 'Your bag is empty. Please add items to proceed.');
      return;
    }

    if (inStockCartItems.length === 0) {
      Alert.alert(
        'All Items Out of Stock',
        'All items in your bag are currently out of stock. Please remove them to proceed.'
      );
      return;
    }

    if (hasOutOfStockItems) {
      const outCount = cartItems.length - inStockCartItems.length;
      const inCount = inStockCartItems.length;

      Alert.alert(
        'Items Out of Stock',
        `${outCount} item${outCount > 1 ? 's in your bag are' : ' in your bag is'} currently unavailable. Would you like to proceed with the ${inCount} available item${inCount > 1 ? 's' : ''}?`,
        [
          {
            text: `Proceed with In-Stock (${inCount})`,
            onPress: () => {
              navigation.navigate('Checkout', {
                cartId: backendCartData?._id,
                selectedAddress,
                couponCode: appliedCoupon,
                totalAmount: finalTotal,
                selectedCartItems: inStockCartItems,
                selectedItemIds: inStockCartItems.map((item) => item.cartItemId),
              });
            },
          },
          {
            text: 'Review Bag',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    // Check if any selected item exceeds available inventory
    const overStockItem = inStockCartItems.find((item) => {
      const stock = getItemStock(item);
      return stock > 0 && item.quantity > stock;
    });
    if (overStockItem) {
      const stock = getItemStock(overStockItem);
      Alert.alert(
        'Stock Limit Exceeded',
        `Only ${stock} unit${stock > 1 ? 's' : ''} available for "${overStockItem.name || 'this product'}". Please adjust the quantity before placing your order.`
      );
      return;
    }

    navigation.navigate('Checkout', {
      cartId: backendCartData?._id,
      selectedAddress,
      couponCode: appliedCoupon,
      totalAmount: finalTotal,
      selectedCartItems: inStockCartItems,
      selectedItemIds,
    });
  };

  const renderFullScreenSkeleton = (withRefresh = true) => {
    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { gap: 16 }]}
        refreshControl={
          withRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          ) : undefined
        }
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

        {/* 2 Cart Item Skeletons with updated 115x150 dimensions */}
        {Array.from({ length: 2 }).map((_, index) => (
          <View key={`sk_item_${index}`} style={[styles.cartCard, { minHeight: 178, justifyContent: 'center' }]}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Skeleton width={115} height={150} radius={14} />
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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

      {(loadingCart && !backendCartData) || isRefreshing ? (
        renderFullScreenSkeleton(true)
      ) : cartItems.length === 0 ? (
        /* ── Empty Cart View ── */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }>
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
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }>



          {/* Out of stock alert banner if bag has any out of stock items */}
          {hasOutOfStockItems && (
            <View style={styles.cartOutOfStockBanner}>
              <AlertCircle size={15} color="#DC2626" />
              <Text style={styles.cartOutOfStockBannerText}>
                {cartItems.length - inStockCartItems.length} item{cartItems.length - inStockCartItems.length > 1 ? 's are' : ' is'} out of stock and won't be ordered
              </Text>
            </View>
          )}

          {/* ── Cart Item Cards ── */}
          {sortedCartItems.map((item) => {
            // Inline item loader is handled globally by the absolute overlay

            const isItemOutOfStock = checkIfOutOfStock(item);
            
            const cardVariantObj = item.variant?.sku && Array.isArray(itemsStockMap[item.productId]?.variants)
              ? itemsStockMap[item.productId].variants.find((v) => v.sku === item.variant.sku || v._id === item.variant.sku)
              : null;
            const itemTiers = item.price_tiers || parsePriceTiers(
              cardVariantObj?.price_tiers || cardVariantObj?.priceTiers ||
              itemsStockMap[item.productId]?.price_tiers || itemsStockMap[item.productId]?.priceTiers
            );

            const pricing = resolveItemPricing({
              priceTiers: itemTiers,
              quantity: item.quantity,
              baseMRP: item.price,
              baseDiscountedPrice: item.baseDiscountedPrice || item.discountedPrice || item.unitPrice,
              apiPrice: item.unitPrice,
              apiTotal: item.totalPrice,
              isVariant: !!(item.variant && item.variant.sku),
            });

            const displayPrice = (typeof item.totalPrice === 'number' && item.totalPrice > 0)
              ? item.totalPrice
              : pricing.totalPrice;

            const basePrice = (typeof item.price === 'number' && item.price > 0)
              ? item.price
              : (pricing.unitPrice || (displayPrice / (item.quantity || 1)));

            const discountAmount =
              basePrice * item.quantity > displayPrice
                ? Math.round(basePrice * item.quantity - displayPrice)
                : 0;

            const optionInfo = extractCartItemOption(item);
            const targetVariantSku = item.variant?.sku || item.variant?._id || item.variant_sku || null;
            const openProductDetail = () => {
              navigation.navigate('ProductDetail', {
                productId: item.productId,
                variantSku: targetVariantSku,
                quantity: item.quantity,
              });
            };

            return (
              <View key={item.cartItemId} style={[styles.cartCard, isItemOutOfStock && styles.cartCardOutOfStock]}>
                {/* Remove Trash Button */}
                <TouchableOpacity
                  style={[
                    styles.cardCloseBtn,
                    isItemOutOfStock && styles.cardCloseBtnOutOfStock,
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setRemovingCartItem(item)}>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </TouchableOpacity>

                <View style={styles.cartCardMain}>
                  {/* Product Image Thumbnail - Opens Product Detail */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={openProductDetail}>
                    <View style={styles.cartItemImgContainer}>
                      <Image
                        source={getImageSource(item.image, 'THUMBNAIL', DUMMY_IMG)}
                        style={[styles.cartItemImg, isItemOutOfStock && styles.cartItemImgOutOfStock]}
                        resizeMode="cover"
                      />
                      {isItemOutOfStock && (
                        <View style={styles.minimalSoldOutOverlay}>
                          <View style={styles.minimalSoldOutPill}>
                            <AlertCircle size={10} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 3 }} />
                            <Text style={styles.minimalSoldOutPillText}>OUT OF STOCK</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                      {/* Product Details Right */}
                      <View style={styles.cartItemRight}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={openProductDetail}>
                          {item.brandName ? (
                            <Text style={styles.itemBrandName}>{item.brandName}</Text>
                          ) : null}
                          <Text style={[styles.itemName, isItemOutOfStock && { color: '#64748B' }]} numberOfLines={2}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>


                        {/* Option / Variant Pill Row */}
                        {optionInfo ? (
                          <View style={styles.optionPillRow}>
                            <TouchableOpacity
                              style={styles.optionPill}
                              activeOpacity={0.75}
                              onPress={openProductDetail}>
                              {optionInfo.color ? (
                                <View
                                  style={[
                                    styles.optionColorDot,
                                    { backgroundColor: optionInfo.color },
                                    isColorLight(optionInfo.color) && styles.optionColorDotLight,
                                  ]}
                                />
                              ) : null}
                              {optionInfo.labelPrefix ? (
                                <Text style={styles.optionPillLabel} numberOfLines={1}>
                                  {optionInfo.labelPrefix}:{' '}
                                  <Text style={styles.optionPillValue}>
                                    {optionInfo.displayText}
                                  </Text>
                                </Text>
                              ) : (
                                <Text style={styles.optionPillValue} numberOfLines={1}>
                                  {optionInfo.displayText}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        {/* Quantity Stepper Row (Always below option on its own dedicated row) */}
                        <View style={styles.stepperRow}>
                          {isItemOutOfStock ? (
                            <View style={styles.minimalOutOfStockTag}>
                              <View style={styles.outOfStockDot} />
                              <Text style={styles.minimalOutOfStockTagText}>Out of stock</Text>
                            </View>
                          ) : (() => {
                            const itemStock = getItemStock(item);
                            const rawAvailableQtys = (itemTiers && itemTiers.length > 0)
                              ? [1, ...itemTiers.map((t) => t.quantity)].sort((a, b) => a - b)
                              : null;
                            const availableQtys = rawAvailableQtys && itemStock > 0
                              ? rawAvailableQtys.filter((q) => q <= itemStock)
                              : rawAvailableQtys;
                            const currentQtyIdx = availableQtys ? availableQtys.indexOf(item.quantity) : -1;
                            const isAtMaxTier = (availableQtys ? (currentQtyIdx === availableQtys.length - 1) : (item.quantity >= 10)) || (itemStock > 0 && item.quantity >= itemStock);

                            return (
                              <View style={styles.stepperContainer}>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  activeOpacity={0.7}
                                  onPress={() => {
                                    if (availableQtys && availableQtys.length > 1) {
                                      if (currentQtyIdx <= 0 || item.quantity <= 1) {
                                        setRemovingCartItem(item);
                                      } else {
                                        const prevQty = currentQtyIdx !== -1 ? availableQtys[currentQtyIdx - 1] : availableQtys[0];
                                        handleUpdateQty(item.cartItemId, prevQty);
                                      }
                                    } else {
                                      if (item.quantity <= 1) {
                                        setRemovingCartItem(item);
                                      } else {
                                        handleUpdateQty(item.cartItemId, item.quantity - 1);
                                      }
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
                                  style={[styles.stepperBtn, isAtMaxTier && { opacity: 0.4 }]}
                                  activeOpacity={0.7}
                                  disabled={isAtMaxTier}
                                  onPress={() => {
                                    if (availableQtys && availableQtys.length > 1) {
                                      if (currentQtyIdx !== -1 && currentQtyIdx < availableQtys.length - 1) {
                                        const nextQty = availableQtys[currentQtyIdx + 1];
                                        if (itemStock > 0 && nextQty > itemStock) {
                                          Alert.alert('Stock Limit', `Only ${itemStock} items available in stock.`);
                                          return;
                                        }
                                        handleUpdateQty(item.cartItemId, nextQty);
                                      }
                                    } else {
                                      if (itemStock > 0 && item.quantity >= itemStock) {
                                        Alert.alert('Stock Limit', `Only ${itemStock} items available in stock.`);
                                        return;
                                      }
                                      if (item.quantity < 10) {
                                        handleUpdateQty(item.cartItemId, item.quantity + 1);
                                      }
                                    }
                                  }}>
                                  <Plus
                                    size={13}
                                    color={isAtMaxTier ? '#CBD5E1' : colors.primary}
                                    strokeWidth={2.5}
                                  />
                                </TouchableOpacity>
                              </View>
                            );
                          })()}
                        </View>

                    {/* Price Row */}
                    <View style={styles.cardPriceRow}>
                      <Text style={[styles.itemFinalPrice, isItemOutOfStock && { color: '#94A3B8' }]}>₹{displayPrice}</Text>
                      {discountAmount > 0 ? (
                        <>
                          <Text style={[styles.itemMRPPrice, isItemOutOfStock && { color: '#CBD5E1' }]}>
                            ₹{basePrice * item.quantity}
                          </Text>
                          {!isItemOutOfStock && (
                            <Text style={styles.itemDiscountOff}>
                              ₹{discountAmount} Off
                            </Text>
                          )}
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

                {/* If Out of Stock: Bottom notice bar with action to remove */}
                {isItemOutOfStock && (
                  <View style={styles.cardOutOfStockFooter}>
                    <View style={styles.cardOutOfStockFooterLeft}>
                      <AlertCircle size={13} color="#DC2626" strokeWidth={2} />
                      <Text style={styles.cardOutOfStockFooterText}>
                        Item is currently out of stock
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      onPress={() => setRemovingCartItem(item)}
                      style={styles.cardOutOfStockRemoveBtn}>
                      <Trash2 size={12} color="#DC2626" strokeWidth={2} style={{ marginRight: 3 }} />
                      <Text style={styles.cardOutOfStockRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* If Quantity Exceeds Available Stock: Bottom notice bar with 1-tap fix */}
                {!isItemOutOfStock && getItemStock(item) > 0 && item.quantity > getItemStock(item) && (
                  <View style={[styles.cardOutOfStockFooter, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <View style={styles.cardOutOfStockFooterLeft}>
                      <AlertCircle size={13} color="#DC2626" strokeWidth={2} />
                      <Text style={[styles.cardOutOfStockFooterText, { color: '#B91C1C' }]}>
                        Only {getItemStock(item)} units available in stock
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      onPress={() => handleUpdateQty(item.cartItemId, getItemStock(item))}
                      style={[styles.cardOutOfStockRemoveBtn, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.cardOutOfStockRemoveText, { color: '#DC2626' }]}>Set to {getItemStock(item)}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* ── Coupon Card ── */}
          <TouchableOpacity
            style={[
              styles.ticketContainer,
              appliedCoupon ? styles.ticketContainerApplied : styles.ticketContainerIdle,
            ]}
            activeOpacity={appliedCoupon ? 1 : 0.8}
            onPress={() => {
              if (!appliedCoupon) {
                openCouponSheet();
              }
            }}>
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
                  <TouchableOpacity
                    style={styles.removeCouponBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      removeCoupon();
                    }}>
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
                  <View style={styles.viewCouponsBtn}>
                    <Text style={styles.applyCouponLink}>View</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>

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
          <View style={[
            styles.selectedCountBanner,
            inStockCartItems.length === 0 && { backgroundColor: '#FEF2F2' },
          ]}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={[
                styles.selectedCountText,
                inStockCartItems.length === 0 && { color: '#DC2626' },
              ]}>
              {inStockCartItems.length === 0
                ? 'All items in your bag are out of stock'
                : `${selectedCartItems.length} Item${selectedCartItems.length !== 1 ? 's' : ''} in your order${
                    hasOutOfStockItems ? ` • ${cartItems.length - inStockCartItems.length} out of stock` : ''
                  }`}
            </Text>
          </View>

          <View style={styles.bottomBarActionInner}>
            <TouchableOpacity
              style={[
                styles.placeOrderBtn,
                (selectedCartItems.length === 0 || inStockCartItems.length === 0) && styles.placeOrderBtnDisabled,
                !selectedAddress && inStockCartItems.length > 0 && styles.selectAddressBtnHighlight,
              ]}
              activeOpacity={0.85}
              disabled={selectedCartItems.length === 0 || inStockCartItems.length === 0}
              onPress={() => {
                if (inStockCartItems.length === 0) {
                  Alert.alert('Out of Stock', 'Items in your bag are currently out of stock and cannot be ordered. Please remove them to proceed.');
                  return;
                }
                if (!selectedAddress) {
                  setShowAddressModal(true);
                } else {
                  handlePlaceOrder();
                }
              }}>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={styles.placeOrderBtnText}>
                {inStockCartItems.length === 0
                  ? 'Items Out of Stock'
                  : !selectedAddress
                  ? 'Select / Add Address'
                  : 'Place Order'}
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

        {/* Circular Horizontal Number Pills */}
        <ScrollView
          ref={qtyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.qtyCircleContainer}>
          {editingAvailableQtys.map((q) => {
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
        {loadingAddresses && addressesList.length === 0 ? (
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
                const isSel = selectedAddress?.id === addr.id || selectedAddress?._id === addr.id;
                if (isSel) {
                  // Expanded Detailed Card for active/selected address
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.activeAddressContainer}
                      activeOpacity={0.9}
                      onPress={() => dispatch(setSelectedAddress(null))}>
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
                      onPress={() => {
                        dispatch(setSelectedAddress(addr));
                        setShowAddressModal(false);
                      }}>
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
              source={getImageSource(removingCartItem.image, 'THUMBNAIL', DUMMY_IMG)}
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
                const expiryDate = c.valid_until || c.expiresAt || c.expiry || c.endDate || c.expiryDate;
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
    borderRadius: 2,
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
    paddingBottom: 130,
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

  cartCardOutOfStock: {
    backgroundColor: '#FFF8F8',
    borderColor: '#FECACA',
    borderWidth: 1.5,
  },
  cardCloseBtnOutOfStock: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 20,
    padding: 5,
  },
  cartItemImgOutOfStock: {
    opacity: 0.6,
  },
  minimalSoldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  minimalSoldOutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  minimalSoldOutPillText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  minimalOutOfStockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 6,
  },
  outOfStockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  minimalOutOfStockTagText: {
    fontSize: moderateScale(11.5),
    fontFamily: fonts.semiBold,
    color: '#DC2626',
    fontWeight: '600',
  },
  cardOutOfStockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    marginTop: 10,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  cardOutOfStockFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  cardOutOfStockFooterText: {
    fontSize: moderateScale(11.5),
    fontFamily: fonts.medium,
    color: '#DC2626',
    flex: 1,
  },
  cardOutOfStockRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  cardOutOfStockRemoveText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.semiBold,
    color: '#DC2626',
    fontWeight: '600',
  },
  cartOutOfStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  cartOutOfStockBannerText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#DC2626',
    flex: 1,
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
    gap: 14,
  },
  cartItemImgContainer: {
    position: 'relative',
    width: 115,
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  cartItemImg: {
    width: '100%',
    height: '100%',
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
  optionPillRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  optionColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  optionColorDotLight: {
    borderColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1.5,
  },
  optionPillLabel: {
    fontSize: moderateScale(11.5),
    fontFamily: fonts.medium,
    color: '#64748B',
    flexShrink: 1,
  },
  optionPillValue: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  dropdownPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownPillTrigger: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownPillText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#0F172A',
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
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  selectedCountBanner: {
    backgroundColor: '#FAF5FF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCountText: {
    fontSize: moderateScale(11.5),
    fontFamily: fonts.big,
    color: colors.primary,
    textAlign: 'center',
  },
  bottomBarActionInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  placeOrderBtn: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  placeOrderBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    textAlign: 'center',
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
