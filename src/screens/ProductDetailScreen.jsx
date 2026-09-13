import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
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
  Calendar,
  Share2,
} from 'lucide-react-native';

import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { addToCart, selectCartItems, selectCartTotalQuantity } from '../redux/cartSlice';
import { addToCartApi } from '../api/cart';

import { useProductDetail, useProducts } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { useCategories } from '../hooks/useCategories';
import { useSubCategories } from '../hooks/useSubCategories';
import BottomSheetModal from '../components/BottomSheetModal';
import { Skeleton } from '../components/Skeleton';
import { resolveImageUrl, getImageSource } from '../utils/imageOptimizer';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 1.05;
const DUMMY_IMG = require('../../assets/dummy_product.png');
const SIMILAR_CARD_GAP = 12;
const SIMILAR_CARD_WIDTH = (width - 16 * 2 - SIMILAR_CARD_GAP) / 2;

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

function formatProductWeightOrVolume(weightVal, product, variant) {
  if (weightVal === undefined || weightVal === null || weightVal === '') {
    return null;
  }

  const rawStr = String(weightVal).trim();
  if (!rawStr) return null;

  // 1. If weight value already contains a unit (e.g. "100ml", "50g", "200 gm", "1 L")
  const matchUnitInVal = rawStr.match(/^([\d.]+)\s*(ml|l|ltr|litre|liter|g|gm|gram|grams|kg|pcs|piece|pieces|oz)$/i);
  if (matchUnitInVal) {
    const num = matchUnitInVal[1];
    let unit = matchUnitInVal[2].toLowerCase();
    if (unit === 'gm' || unit === 'gram' || unit === 'grams') unit = 'g';
    if (unit === 'ltr' || unit === 'litre' || unit === 'liter') unit = 'L';
    return {
      value: num,
      unit: unit,
      formatted: `${num} ${unit}`,
      label: (unit === 'ml' || unit === 'l' || unit === 'L') ? 'Volume' : 'Weight',
    };
  }

  // 2. Check explicit unit property on variant or product
  const explicitUnit = (
    variant?.unit ||
    variant?.weight_unit ||
    variant?.size_unit ||
    variant?.measurement_unit ||
    variant?.quantity_unit ||
    product?.unit ||
    product?.weight_unit ||
    product?.size_unit ||
    product?.measurement_unit ||
    product?.quantity_unit
  );

  if (explicitUnit && typeof explicitUnit === 'string') {
    let u = explicitUnit.trim().toLowerCase();
    if (u === 'gm' || u === 'gram' || u === 'grams') u = 'g';
    if (u === 'ltr' || u === 'litre' || u === 'liter') u = 'L';
    if (u === 'ml' || u === 'g' || u === 'kg' || u === 'l' || u === 'L' || u === 'pcs') {
      return {
        value: rawStr,
        unit: u,
        formatted: `${rawStr} ${u}`,
        label: (u === 'ml' || u === 'l' || u === 'L') ? 'Volume' : 'Weight',
      };
    }
  }

  // 3. Check variant name (e.g., variant.name = "100ml", "200 ml", "50g")
  if (variant?.name && typeof variant.name === 'string') {
    const matchVar = variant.name.match(/(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|liter|g|gm|gram|grams|kg)\b/i);
    if (matchVar) {
      let u = matchVar[2].toLowerCase();
      if (u === 'gm' || u === 'gram' || u === 'grams') u = 'g';
      if (u === 'ltr' || u === 'litre' || u === 'liter') u = 'L';
      return {
        value: rawStr,
        unit: u,
        formatted: `${rawStr} ${u}`,
        label: (u === 'ml' || u === 'l' || u === 'L') ? 'Volume' : 'Weight',
      };
    }
  }

  // 4. Check product name & description for unit patterns (e.g. "Face Wash 100ml", "Serum 30 ml")
  const prodName = product?.name || '';
  const matchName = prodName.match(/(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|liter|g|gm|gram|grams|kg)\b/i);
  if (matchName) {
    let u = matchName[2].toLowerCase();
    if (u === 'gm' || u === 'gram' || u === 'grams') u = 'g';
    if (u === 'ltr' || u === 'litre' || u === 'liter') u = 'L';
    return {
      value: rawStr,
      unit: u,
      formatted: `${rawStr} ${u}`,
      label: (u === 'ml' || u === 'l' || u === 'L') ? 'Volume' : 'Weight',
    };
  }

  // 5. Check product type/name keywords for liquid cosmetics (ml) vs solids (g)
  const nameLower = prodName.toLowerCase();
  const typeLower = String(product?.consumed_type || '').toLowerCase();
  const descLower = String(product?.small_description || '').toLowerCase();
  const fullText = `${nameLower} ${typeLower} ${descLower}`;

  const liquidKeywords = [
    'ml', 'liquid', 'shampoo', 'conditioner', 'serum', 'oil', 'wash', 'facewash',
    'face wash', 'cleanser', 'lotion', 'toner', 'spray', 'mist', 'perfume',
    'deodorant', 'deo', 'sanitizer', 'syrup', 'solution', 'fluid', 'drops',
    'nail polish', 'remover', 'micellar', 'gel', 'shower gel', 'rose water',
    'gulabari', 'mouthwash', 'moisturizer', 'sunscreen'
  ];

  const isLiquid = liquidKeywords.some((kw) => fullText.includes(kw));
  const detectedUnit = isLiquid ? 'ml' : 'g';

  return {
    value: rawStr,
    unit: detectedUnit,
    formatted: `${rawStr} ${detectedUnit}`,
    label: isLiquid ? 'Volume' : 'Weight',
  };
}

function extractCleanShadeName(v, product, idx = 0) {
  if (!v) return '';

  // 1. Direct shade / color name attribute if provided
  const directShade =
    v.shade ||
    v.shade_name ||
    v.shadeName ||
    v.color_name ||
    v.colorName ||
    v.attributes?.shade ||
    v.attributes?.['Shade'] ||
    v.attributes?.color_name ||
    v.attributes?.['Color Name'];

  if (typeof directShade === 'string' && directShade.trim() !== '') {
    return directShade.trim();
  }

  // 2. Parse clean shade name from variant.name
  if (typeof v.name === 'string' && v.name.trim() !== '') {
    const vName = v.name.trim();

    // Check if separated by " - " or "-" or ":"
    if (vName.includes(' - ')) {
      const parts = vName.split(' - ');
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart.length < 35) {
        return lastPart;
      }
    } else if (vName.includes('-')) {
      const parts = vName.split('-');
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart.length < 35 && !/^\d+g$/i.test(lastPart)) {
        return lastPart;
      }
    } else if (vName.includes(':')) {
      const parts = vName.split(':');
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart.length < 35) {
        return lastPart;
      }
    }

    // If variant.name itself is short and distinct from product.name
    if (vName.length <= 25 && vName.toLowerCase() !== String(product?.name || '').trim().toLowerCase()) {
      return vName;
    }
  }

  return `Shade ${idx + 1}`;
}

function getVariantCardDetails(v, product, idx = 0) {
  if (!v) return { weightLabel: '', color: null, shadeName: '' };

  // 1. Color extraction (from v.color, v.attributes, v.hex, v.color_code, etc.)
  let colorValue = null;
  const rawColor =
    v.color ||
    v.color_code ||
    v.colorCode ||
    v.hex ||
    v.attributes?.color ||
    v.attributes?.shade ||
    v.attributes?.hex ||
    v.attributes?.['Color'] ||
    v.attributes?.['Colour'] ||
    v.attributes?.['shade'] ||
    v.attributes?.['Shade'] ||
    v.attributes?.['Color Code'];

  if (typeof rawColor === 'string' && rawColor.trim() !== '') {
    const trimmedColor = rawColor.trim();
    if (
      /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmedColor) ||
      /^rgb/i.test(trimmedColor) ||
      /^hsl/i.test(trimmedColor) ||
      /^(red|blue|green|yellow|orange|purple|pink|brown|black|white|grey|gray|beige|gold|silver|maroon|navy|teal|coral|turquoise|lavender|magenta|cyan|olive|plum|peach|ivory|charcoal|burgundy|crimson|ruby|nude|bronze|copper|amber)$/i.test(trimmedColor)
    ) {
      colorValue = trimmedColor;
    }
  }

  // 2. Weight / Volume extraction (gram, ml, etc.)
  let weightLabel = '';
  const rawWeight =
    v.weight_in_grams !== undefined && v.weight_in_grams !== null && v.weight_in_grams !== ''
      ? v.weight_in_grams
      : v.weight !== undefined && v.weight !== null && v.weight !== ''
      ? v.weight
      : v.attributes?.size || v.attributes?.weight || v.attributes?.Size || v.attributes?.Weight;

  if (rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== '') {
    const info = formatProductWeightOrVolume(rawWeight, product, v);
    if (info) {
      weightLabel = info.formatted;
    }
  } else if (v.name && typeof v.name === 'string') {
    const matchNum = v.name.match(/\b\d+(?:\.\d+)?\s*(?:g|gm|gram|grams|ml|l|ltr|kg|pcs)?\b/i);
    if (matchNum) {
      const info = formatProductWeightOrVolume(matchNum[0], product, v);
      if (info) {
        weightLabel = info.formatted;
      }
    }
  }

  // If no variant weight found, fallback to product weight
  if (!weightLabel && product?.weight_in_grams) {
    const info = formatProductWeightOrVolume(product.weight_in_grams, product, v);
    if (info) {
      weightLabel = info.formatted;
    }
  }

  const cleanShade = extractCleanShadeName(v, product, idx);

  return {
    weightLabel,
    color: colorValue,
    shadeName: cleanShade,
  };
}

function isColorLight(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return false;
  const hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }
  const low = hexColor.toLowerCase();
  if (low === 'white' || low === 'ivory' || low === 'yellow' || low === 'beige' || low === 'gold') {
    return true;
  }
  return false;
}

function RemoteImage({ source, defaultSource, style, resizeMode = 'cover', radius = 0, preset = 'PRODUCT_CARD' }) {
  const [loaded, setLoaded] = useState(false);
  const isLocalSource = typeof source === 'number';

  const resolvedSource = useMemo(() => {
    return getImageSource(source, preset, defaultSource);
  }, [source, preset, defaultSource]);

  return (
    <View style={[style, styles.remoteImageWrapper, radius > 0 ? { borderRadius: radius } : null]}>
      {!loaded && !isLocalSource && (
        <Skeleton style={StyleSheet.absoluteFill} radius={radius} fillParent />
      )}
      <Image
        source={resolvedSource}
        defaultSource={defaultSource}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onLoadEnd={() => setLoaded(true)}
      />
    </View>
  );
}

const parsePrice = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal) || 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

export default function ProductDetailScreen({ route, navigation }) {
  const queryClient = useQueryClient();
  const { productId, id, _id, product: initialProduct, variantSku, variant_sku, sku, variantId, quantity: initialQty } = route.params || {};
  const resolvedProductId = productId || id || _id || initialProduct?._id;
  const targetVariantSku = variantSku || variant_sku || sku || variantId;

  const {
    data: fetchedProduct,
    isLoading,
    isFetching,
    refetch,
  } = useProductDetail(resolvedProductId, initialProduct);

  // Always refetch latest live product data & prices from API on focus
  useFocusEffect(
    React.useCallback(() => {
      refetch?.();
    }, [refetch])
  );

  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const { data: subCategories = [] } = useSubCategories();

  const product = useMemo(() => {
    const raw = fetchedProduct || initialProduct || {};
    if (!raw || Object.keys(raw).length === 0) return {};
    return {
      ...raw,
      price: parsePrice(raw.price),
      discounted_price: parsePrice(raw.discounted_price || raw.price),
    };
  }, [fetchedProduct, initialProduct]);

  // Active UI States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null); // null = base product selected by default
  const [quantity, setQuantity] = useState(1);
  const [tempQty, setTempQty] = useState(1);
  const [selectedTierQty, setSelectedTierQty] = useState(1);
  const [showFullSpecs, setShowFullSpecs] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isQtyChanged, setIsQtyChanged] = useState(false);

  // Automatically pre-select variant if passed via navigation params (e.g. from Cart)
  useEffect(() => {
    if (targetVariantSku && Array.isArray(product?.variants) && product.variants.length > 0) {
      const idx = product.variants.findIndex(
        (v) =>
          v.sku === targetVariantSku ||
          v._id === targetVariantSku ||
          String(v._id) === String(targetVariantSku) ||
          (v.name && v.name === targetVariantSku)
      );
      if (idx !== -1) {
        setSelectedVariantIndex(idx);
      }
    }
  }, [product?.variants, targetVariantSku]);

  // Automatically sync initial quantity if passed
  useEffect(() => {
    if (initialQty && typeof initialQty === 'number' && initialQty > 0) {
      setQuantity(initialQty);
      setTempQty(initialQty);
    }
  }, [initialQty]);

  // Scroll View Refs
  const mainCarouselRef = useRef(null);
  const modalScrollRef = useRef(null);

  // Selected Variant & Pricing
  const currentVariant = selectedVariantIndex !== null ? product?.variants?.[selectedVariantIndex] : null;

  // Extract images edge-to-edge (with full variant image support)
  const images = useMemo(() => {
    let list = [];

    const appendImg = (val) => {
      if (!val) return;
      if (typeof val === 'string' && val.trim() !== '') {
        const resolved = resolveImageUrl(val);
        if (resolved && !list.includes(resolved)) list.push(resolved);
      } else if (typeof val === 'object' && val !== null) {
        const url = val.url || val.secure_url || val.uri || val.path || val.image || val.src;
        if (typeof url === 'string' && url.trim() !== '') {
          const resolved = resolveImageUrl(url);
          if (resolved && !list.includes(resolved)) list.push(resolved);
        }
      }
    };

    // 1. If a variant is selected, extract ONLY variant-specific images
    if (currentVariant) {
      appendImg(currentVariant.banner_image);
      appendImg(currentVariant.image);
      appendImg(currentVariant.color_image);
      appendImg(currentVariant.shade_image);
      appendImg(currentVariant.swatch_image);
      appendImg(currentVariant.photo);
      appendImg(currentVariant.thumbnail);
      appendImg(currentVariant.avatar);
      appendImg(currentVariant.img);
      appendImg(currentVariant.picture);
      appendImg(currentVariant.url);
      appendImg(currentVariant.src);

      // Array of images on variant
      if (Array.isArray(currentVariant.images) && currentVariant.images.length > 0) {
        currentVariant.images.forEach(appendImg);
      } else if (typeof currentVariant.images === 'string' && currentVariant.images.trim() !== '') {
        try {
          const parsed = JSON.parse(currentVariant.images);
          if (Array.isArray(parsed)) parsed.forEach(appendImg);
          else appendImg(parsed);
        } catch (e) {
          appendImg(currentVariant.images);
        }
      }

      // Attributes on variant
      if (currentVariant.attributes && typeof currentVariant.attributes === 'object') {
        appendImg(currentVariant.attributes.image);
        appendImg(currentVariant.attributes.images);
        appendImg(currentVariant.attributes.photo);
        appendImg(currentVariant.attributes.color_image);
        appendImg(currentVariant.attributes.shade_image);
        appendImg(currentVariant.attributes.Image);
        appendImg(currentVariant.attributes.image);
        appendImg(currentVariant.attributes['Image URL']);
        appendImg(currentVariant.attributes['Shade Image']);
        appendImg(currentVariant.attributes['Color Image']);
      }

      // If variant has images of its own, return ONLY variant images!
      if (list.length > 0) {
        return list;
      }

      // Fallback ONLY if variant has absolutely no images of its own:
      // Show ONLY the primary base product image as a single fallback so the screen is not blank
      appendImg(product?.banner_image || product?.image || (Array.isArray(product?.images) ? product.images[0] : null));
      return list.length > 0 ? list : [null];
    }

    // 2. Base product images (used when no variant is selected, or variant has no images)
    appendImg(product?.banner_image);
    if (Array.isArray(product?.images)) {
      product.images.forEach(appendImg);
    } else if (typeof product?.images === 'string' && product.images.trim() !== '') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) parsed.forEach(appendImg);
        else appendImg(parsed);
      } catch (e) {
        appendImg(product.images);
      }
    }
    appendImg(product?.image);

    return list.length > 0 ? list : [null];
  }, [product, currentVariant]);

  // Reset carousel index and scroll when variant changes
  useEffect(() => {
    setActiveImageIndex(0);
    if (mainCarouselRef.current && mainCarouselRef.current.scrollTo) {
      try {
        mainCarouselRef.current.scrollTo({ x: 0, animated: false });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [selectedVariantIndex]);

  const price = parsePrice(
    currentVariant ? (currentVariant.price ?? product?.price ?? 0) : (product?.price ?? 0)
  );
  const discountedPrice = parsePrice(
    currentVariant
      ? (currentVariant.discounted_price ?? currentVariant.price ?? price)
      : (product?.discounted_price ?? price)
  );
  const hasDiscount = price > discountedPrice && price > 0;
  const discountPercent = hasDiscount
    ? Math.round(((price - discountedPrice) / price) * 100)
    : 0;

  const rawWeight = currentVariant && currentVariant.weight_in_grams !== undefined
    ? currentVariant.weight_in_grams
    : product?.weight_in_grams;

  const displayWeightInfo = useMemo(
    () => formatProductWeightOrVolume(rawWeight, product, currentVariant),
    [rawWeight, product, currentVariant]
  );

  // Group all shades (Main product base color + Variant colors)
  const allShadeItems = useMemo(() => {
    const list = [];

    // 1. If base product has a color, add it as Main Shade (index: null)
    if (product?.color && String(product.color).trim() !== '') {
      const baseShadeName = extractCleanShadeName(
        {
          name: product.name,
          shade: product.shade || product.shade_name || product.shadeName,
          color: product.color,
          attributes: product.attributes,
        },
        product,
        0
      ) || 'Main Shade';

      list.push({
        id: 'main-base-shade',
        index: null, // null means base product
        variant: null,
        color: String(product.color).trim(),
        shadeName: baseShadeName,
        price: product.discounted_price || product.price,
      });
    }

    // 2. Add all variant shades (index: idx)
    if (Array.isArray(product?.variants)) {
      product.variants.forEach((v, idx) => {
        const details = getVariantCardDetails(v, product, idx);
        if (details.color) {
          list.push({
            id: v.sku || `variant-shade-${idx}`,
            index: idx,
            variant: v,
            color: details.color,
            shadeName: details.shadeName || `Shade ${idx + 1}`,
            price: v.discounted_price || v.price,
          });
        }
      });
    }

    return list;
  }, [product]);

  const variantWeightItems = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];
    const hasAnyColor = product.variants.some((v, idx) => !!getVariantCardDetails(v, product, idx).color);
    if (hasAnyColor) {
      // If product has color variants, non-color variants go to Select Option
      return product.variants
        .map((v, idx) => ({
          variant: v,
          index: idx,
          details: getVariantCardDetails(v, product, idx),
        }))
        .filter((item) => !item.details.color);
    }
    return product.variants.map((v, idx) => ({
      variant: v,
      index: idx,
      details: getVariantCardDetails(v, product, idx),
    }));
  }, [product]);

  const activeShadeLabel = useMemo(() => {
    if (selectedVariantIndex !== null) {
      const activeShade = allShadeItems.find((s) => s.index === selectedVariantIndex);
      if (activeShade) return activeShade.shadeName;
      if (currentVariant) {
        const details = getVariantCardDetails(currentVariant, product, selectedVariantIndex);
        return details.shadeName || '';
      }
    }
    // If base product is selected (selectedVariantIndex === null)
    const baseShade = allShadeItems.find((s) => s.index === null);
    if (baseShade) return baseShade.shadeName;

    if (allShadeItems.length > 0) {
      return allShadeItems[0].shadeName;
    }
    return '';
  }, [selectedVariantIndex, allShadeItems, currentVariant, product]);

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

        const rawPrice = parsePrice(tier.price);
        
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
        const rawP = parsePrice(latestTier.price) || discountedPrice;
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

  // Subcategory / Type resolution (converts Mongo ObjectId or Subcategory ID to Name)
  const displayType = useMemo(() => {
    const rawSubcat =
      product?.sub_category ||
      product?.subcategory ||
      product?.subCategory ||
      product?.subcategoryId ||
      product?.sub_category_id ||
      product?.subCategoryId ||
      product?.consumed_type ||
      product?.type;

    if (!rawSubcat) return '';

    // Direct object with name/title
    if (typeof rawSubcat === 'object' && rawSubcat !== null) {
      if (rawSubcat.name) return rawSubcat.name;
      if (rawSubcat.title) return rawSubcat.title;
    }

    if (product?.subcategory_name) return product.subcategory_name;
    if (product?.subcategoryName) return product.subcategoryName;
    if (product?.sub_category_name) return product.sub_category_name;
    if (product?.subCategoryName) return product.subCategoryName;

    if (typeof rawSubcat === 'string') {
      const trimmed = rawSubcat.trim();
      // If it looks like a Mongo ObjectId or numeric ID
      if (/^[0-9a-fA-F]{24}$/.test(trimmed) || /^[0-9]+$/.test(trimmed)) {
        // Search in subCategories list
        const foundSub = subCategories.find((s) => (s._id || s.id) === trimmed);
        if (foundSub) {
          return foundSub.name || foundSub.title || '';
        }
        // Search in categories list fallback
        const foundCat = categories.find((c) => (c._id || c.id) === trimmed);
        if (foundCat) {
          return foundCat.name || foundCat.title || '';
        }
      } else {
        // Already a descriptive text name (e.g. "Hair Oil", "Serum", "Cream")
        return trimmed;
      }
    }

    if (typeof product?.consumed_type === 'string' && !/^[0-9a-fA-F]{24}$/.test(product.consumed_type.trim())) {
      return product.consumed_type.trim();
    }

    return '';
  }, [product, subCategories, categories]);

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
    const resolvedColor =
      currentVariant?.color ||
      currentVariant?.color_code ||
      currentVariant?.colorCode ||
      currentVariant?.hex ||
      currentVariant?.attributes?.color ||
      currentVariant?.attributes?.shade ||
      currentVariant?.attributes?.['Color'] ||
      product?.color ||
      null;

    const itemToAdd = {
      productId: pId,
      name: displayTitle || product.name,
      brandName: brandName || '',
      image: images[0] || null,
      variant: currentVariant ? { ...currentVariant, color: resolvedColor || currentVariant.color } : null,
      variantName: displayWeightInfo?.formatted || currentVariant?.color || currentVariant?.name || null,
      color: resolvedColor,
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
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err) {
      // Non-blocking fallback to local Redux state for guest/offline scenarios
    } finally {
      dispatch(addToCart(itemToAdd));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
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

  const handleShareProduct = async () => {
    try {
      const prodId = product?._id || productId || id || _id;
      const prodName = product?.name || 'Product';

      // Firebase Hosting App Link / Web URL
      const productUrl = `https://shagunbeauty-f00bd.web.app/product/${encodeURIComponent(prodId)}`;
      const shareMessage = `Check out ${prodName} on Shagun Beauty! ${productUrl}`;

      await Share.share(
        Platform.OS === 'ios'
          ? {
              message: shareMessage,
              url: productUrl,
              title: prodName,
            }
          : {
              message: shareMessage,
              title: prodName,
            },
        {
          dialogTitle: `Share ${prodName}`,
        }
      );
    } catch (error) {
      console.log('Error sharing product:', error);
    }
  };

  // Similar products subcategory ID resolution for strict type-matching
  const similarSubCatId = useMemo(() => {
    const rawSub =
      product?.sub_category ||
      product?.subcategory ||
      product?.subCategory ||
      product?.subcategoryId ||
      product?.sub_category_id ||
      product?.subCategoryId;

    if (!rawSub) return '';
    if (typeof rawSub === 'object') return rawSub._id || rawSub.id || '';
    if (typeof rawSub === 'string') {
      const trimmed = rawSub.trim();
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) return trimmed;
      const match = subCategories.find(
        (s) => (s._id || s.id) === trimmed || s.name?.toLowerCase() === trimmed.toLowerCase()
      );
      if (match) return match._id || match.id || '';
    }
    return '';
  }, [product, subCategories]);

  const currentTypeString = useMemo(() => {
    const t = displayType || product?.consumed_type || product?.type || '';
    return String(t).trim().toLowerCase();
  }, [displayType, product?.consumed_type, product?.type]);

  // Similar products category resolution
  const similarCategoryId = useMemo(() => {
    const cat = product?.category;
    if (cat) {
      if (typeof cat === 'object') return cat._id || cat.id || '';
      if (/^[0-9a-fA-F]{24}$/.test(String(cat).trim())) return String(cat).trim();
    }
    const rawSub =
      product?.sub_category ||
      product?.subcategory ||
      product?.subCategory ||
      product?.subcategoryId ||
      product?.sub_category_id ||
      product?.subCategoryId;

    let subId = '';
    if (rawSub) {
      if (typeof rawSub === 'object') {
        subId = rawSub._id || rawSub.id || '';
        if (rawSub.category) {
          return typeof rawSub.category === 'object'
            ? (rawSub.category._id || rawSub.category.id || '')
            : String(rawSub.category);
        }
      } else if (typeof rawSub === 'string') {
        subId = rawSub.trim();
      }
    }

    if (subId && Array.isArray(subCategories) && subCategories.length > 0) {
      const foundSub = subCategories.find(
        (s) => (s._id || s.id) === subId || s.name?.toLowerCase() === subId.toLowerCase()
      );
      if (foundSub?.category) {
        return typeof foundSub.category === 'object'
          ? (foundSub.category._id || foundSub.category.id || '')
          : String(foundSub.category);
      }
    }

    return '';
  }, [product, subCategories]);

  // Query similar products by sub_category (exact type)
  const { data: subCatProducts = [], isLoading: isSubCatLoading } = useProducts({
    sub_category: similarSubCatId,
    per_page: 30,
  });

  // Query similar products by category & fallback general catalog
  const { data: categoryProducts = [], isLoading: isCatProductsLoading } = useProducts({
    category: similarCategoryId,
    per_page: 30,
  });

  const { data: fallbackProducts = [], isLoading: isFallbackProductsLoading } = useProducts({
    per_page: 40,
  });

  const [addingSimilarId, setAddingSimilarId] = useState(null);

  const similarProductCards = useMemo(() => {
    const currentId = String(resolvedProductId || product?._id || product?.id || '');
    const combinedList = [...subCatProducts, ...categoryProducts, ...fallbackProducts];
    const seen = new Set();
    const candidateList = [];

    // Extract significant keywords from current product's type (e.g. "Hair Oil" -> ["hair", "oil"])
    const typeWords = currentTypeString
      ? currentTypeString.split(/\s+/).filter((w) => w.length > 2)
      : [];

    for (const item of combinedList) {
      const itemId = String(item._id || item.id || '');
      if (!itemId || itemId === currentId || seen.has(itemId)) continue;
      seen.add(itemId);

      // Extract item's subcategory ID
      const rawItemSub = item.sub_category || item.subcategory || item.subCategory;
      let itemSubId = '';
      if (rawItemSub) {
        if (typeof rawItemSub === 'object') itemSubId = rawItemSub._id || rawItemSub.id || '';
        else if (typeof rawItemSub === 'string') itemSubId = rawItemSub.trim();
      }

      let itemSubCatName = '';
      if (itemSubId && Array.isArray(subCategories)) {
        const found = subCategories.find((s) => (s._id || s.id) === itemSubId);
        if (found) itemSubCatName = (found.name || found.title || '').toLowerCase();
      }

      const itemConsumedType = String(item.consumed_type || item.type || '').trim().toLowerCase();
      const itemName = String(item.name || '').toLowerCase();

      // Calculate Type Similarity Score
      let typeScore = 0;

      // 1. Direct subcategory ID match (Highest priority)
      if (similarSubCatId && itemSubId && itemSubId === similarSubCatId) {
        typeScore += 100;
      }

      // 2. Consumed type matches
      if (currentTypeString && itemConsumedType) {
        if (itemConsumedType === currentTypeString) {
          typeScore += 90;
        } else if (itemConsumedType.includes(currentTypeString) || currentTypeString.includes(itemConsumedType)) {
          typeScore += 80;
        }
      }

      // 3. SubCategory name matches current type
      if (currentTypeString && itemSubCatName) {
        if (itemSubCatName === currentTypeString) {
          typeScore += 85;
        } else if (itemSubCatName.includes(currentTypeString) || currentTypeString.includes(itemSubCatName)) {
          typeScore += 75;
        }
      }

      // 4. Product title contains the type name (e.g. "serum", "lipstick", "cleanser")
      if (currentTypeString && currentTypeString.length > 2 && itemName.includes(currentTypeString)) {
        typeScore += 70;
      }

      // 5. Product title contains any significant word from the type (e.g. "oil", "cream", "shampoo")
      if (typeWords.length > 0) {
        const matchesWord = typeWords.some(
          (w) => itemName.includes(w) || itemConsumedType.includes(w) || itemSubCatName.includes(w)
        );
        if (matchesWord) {
          typeScore += 50;
        }
      }

      // 6. Same category bonus
      const itemCatId = typeof item.category === 'object' ? (item.category?._id || item.category?.id) : item.category;
      if (similarCategoryId && itemCatId && String(itemCatId) === String(similarCategoryId)) {
        typeScore += 15;
      }

      const originalPrice = parsePrice(item.price);
      const finalPrice = parsePrice(item.discounted_price) || originalPrice || 0;
      const discount =
        originalPrice > finalPrice && originalPrice > 0
          ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
          : 0;

      const rawImg = item.images?.[0] || item.image || item.banner_image;
      const imageUri = resolveImageUrl(rawImg);
      const imageSource = imageUri
        ? { uri: imageUri, cache: 'force-cache' }
        : require('../../assets/dummy_product.png');

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
        ? item.name?.toLowerCase().startsWith(brandNameStr.toLowerCase())
          ? item.name.slice(brandNameStr.length).trim()
          : item.name
        : item.name;

      const isBestseller = Boolean(
        item.is_best_seller === true ||
        item.is_best_seller === 'true' ||
        item.isBestSeller === true ||
        item.isBestSeller === 'true' ||
        item.is_bestseller === true ||
        item.is_bestseller === 'true' ||
        item.isbestseller === true ||
        item.isbestseller === 'true' ||
        item.tag === 'bestseller' ||
        (Array.isArray(item.tags) && item.tags.some((t) => String(t).toLowerCase() === 'bestseller'))
      );

      candidateList.push({
        item,
        itemId,
        typeScore,
        originalPrice,
        finalPrice,
        discount,
        imageSource,
        brandNameStr,
        titleText,
        isBestseller,
      });
    }

    // Sort strictly by typeScore descending so highest type matches appear first!
    candidateList.sort((a, b) => b.typeScore - a.typeScore);

    // If we have items with good type match (score >= 50), prioritize them!
    const strongMatches = candidateList.filter((c) => c.typeScore >= 50);
    if (strongMatches.length >= 4) {
      return strongMatches.slice(0, 15);
    }

    return candidateList.slice(0, 15);
  }, [
    subCatProducts,
    categoryProducts,
    fallbackProducts,
    resolvedProductId,
    product,
    similarSubCatId,
    similarCategoryId,
    currentTypeString,
    subCategories,
    brands,
  ]);

  const handleOpenSimilarProduct = (item) => {
    const targetId = item._id || item.id;
    if (navigation.push) {
      navigation.push('ProductDetail', {
        productId: targetId,
        product: item,
      });
    } else {
      navigation.navigate('ProductDetail', {
        productId: targetId,
        product: item,
      });
    }
  };

  const handleAddSimilarToBag = async (item) => {
    const pId = item._id || item.id;
    const isItemInCart = cartItems.some((ci) => (ci.productId || ci.id) === pId);

    if (isItemInCart) {
      navigation.navigate('BottomTabs', { screen: 'Bag' });
      return;
    }

    setAddingSimilarId(pId);

    const originalPrice = parsePrice(item.price);
    const finalPrice = parsePrice(item.discounted_price) || originalPrice || 0;

    let bName = '';
    if (typeof item.brand === 'object' && item.brand?.name) {
      bName = item.brand.name;
    } else if (item.brandName) {
      bName = item.brandName;
    } else if (typeof item.brand === 'string') {
      if (/^[0-9a-fA-F]{24}$/.test(item.brand)) {
        const found = brands.find((b) => b._id === item.brand);
        bName = found ? found.name : '';
      } else {
        bName = item.brand;
      }
    }

    const rawImg = item.images?.[0] || item.image || item.banner_image;
    const imageUri = resolveImageUrl(rawImg);

    const itemToAdd = {
      productId: pId,
      name: item.name,
      brandName: bName,
      price: originalPrice > 0 ? originalPrice : finalPrice,
      discountedPrice: finalPrice,
      image: imageUri,
      quantity: 1,
    };

    try {
      await addToCartApi({
        type: 'product',
        productId: pId,
        quantity: 1,
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (e) {
      // Offline / guest fallback
    } finally {
      dispatch(addToCart(itemToAdd));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setAddingSimilarId(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
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
            key={`carousel-${selectedVariantIndex ?? 'base'}`}
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
            {images.map((imgUri, index) => {
              const fullSource = getImageSource(imgUri, 'DETAIL_MAIN', DUMMY_IMG);
              return (
                <TouchableOpacity
                  key={`img-${selectedVariantIndex ?? 'base'}-${index}`}
                  activeOpacity={0.9}
                  onPress={() => handleOpenImageModal(index)}>
                  <Image
                    source={fullSource}
                    defaultSource={DUMMY_IMG}
                    style={styles.fullWidthImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Floating Share Button on Image Carousel */}
          <TouchableOpacity
            style={styles.floatingShareBtn}
            activeOpacity={0.8}
            onPress={handleShareProduct}>
            <Share2 size={19} color="#1A1C1E" />
          </TouchableOpacity>

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

          {/* Expiry Date Info */}
          {/* {formattedExpiryDate ? (
            <View style={styles.expiryRow}>
              <Calendar size={14} color="#6D7277" />
              <Text style={styles.expiryText}>Expiry Date: {formattedExpiryDate}</Text>
            </View>
          ) : null} */}

          {/* Price Row */}
          <View style={styles.priceContainer}>
            <Text style={styles.discountedPrice}>₹{currentQuantityPricing.totalPrice || discountedPrice || 0}</Text>
            {quantity > 1 ? (
              <Text style={styles.unitPriceSubText}>(₹{currentQuantityPricing.unitPrice || discountedPrice || 0}/unit)</Text>
            ) : null}
            {hasDiscount ? (
              <>
                <Text style={styles.originalPrice}>MRP ₹{(price || 0) * (quantity || 1)}</Text>
                <Text style={styles.discountBadge}>({discountPercent}% OFF)</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Bulk Pricing Preview Banner ── */}
        {isFetching && (!activePriceTiers || activePriceTiers.length === 0) ? (
          <View style={skeletonStyles.bulkBanner}>
            <Skeleton width={18} height={18} radius={4} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Skeleton width="55%" height={13} radius={5} />
            </View>
          </View>
        ) : activePriceTiers.length > 0 ? (
          <TouchableOpacity
            style={styles.bulkBanner}
            activeOpacity={0.85}
            onPress={() => setShowQtyModal(true)}>
            <View style={styles.bulkBannerLeft}>
              <Tag size={18} color={colors.primary} />
              <View>
                <Text style={styles.bulkBannerTitle}>Bulk Pricing Available</Text>
              </View>
            </View>
            <ChevronDown size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        {/* ── Product Variants / Sizes ── */}
        {isFetching && (!product?.variants || product.variants.length === 0) ? (
          <View style={styles.sectionContainer}>
            <Skeleton width="40%" height={15} radius={5} style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Skeleton width={72} height={46} radius={12} />
              <Skeleton width={72} height={46} radius={12} />
              <Skeleton width={72} height={46} radius={12} />
            </View>
          </View>
        ) : null}

        {/* ── Select Option (Weight / Size Pills) ── */}
        {variantWeightItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              Select Option
            </Text>
            <View style={styles.variantsRow}>
              {variantWeightItems.map(({ variant: v, index: idx, details }) => {
                const isSelected = selectedVariantIndex === idx;
                const { weightLabel, shadeName } = details;

                return (
                  <TouchableOpacity
                    key={v.sku || idx}
                    style={styles.variantItemWrapper}
                    activeOpacity={0.8}
                    onPress={() => setSelectedVariantIndex(isSelected ? null : idx)}>
                    
                    {/* The Option Box / Pill */}
                    <View style={[styles.variantCard, isSelected && styles.variantCardActive]}>
                      <View style={styles.variantInfoRow}>
                        {weightLabel ? (
                          <Text style={[styles.variantName, isSelected && styles.variantNameActive]}>
                            {weightLabel}
                          </Text>
                        ) : shadeName ? (
                          <Text style={[styles.variantName, isSelected && styles.variantNameActive]}>
                            {shadeName}
                          </Text>
                        ) : (
                          <Text style={[styles.variantName, isSelected && styles.variantNameActive]}>
                            {v.weight_in_grams ? `${v.weight_in_grams} g` : `#${idx + 1}`}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Price Shown Below the Box */}
                    <Text style={styles.variantPriceBelow}>
                      ₹{v.discounted_price || v.price}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Product Shades & Colors (Main Shade + Variant Shades) ── */}
        {allShadeItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.shadeHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Select Shade / Color</Text>
              {activeShadeLabel ? (
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.activeShadeLabel}>
                  {activeShadeLabel}
                </Text>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorSwatchesScrollContent}>
              {allShadeItems.map((item) => {
                const isSelected = item.index === null
                  ? selectedVariantIndex === null
                  : selectedVariantIndex === item.index;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (item.index === null) {
                        setSelectedVariantIndex(null);
                      } else {
                        setSelectedVariantIndex(isSelected ? null : item.index);
                      }
                    }}
                    style={styles.colorSwatchItemWrapper}>
                    <View
                      style={[
                        styles.colorSwatchContainer,
                        isSelected && styles.colorSwatchContainerActive,
                      ]}>
                      <View style={[styles.colorSwatchSquare, { backgroundColor: item.color }]} />
                    </View>

                    {item.price ? (
                      <Text style={styles.shadeItemPrice}>
                        ₹{item.price}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
          displayWeightInfo ||
          displayType ||
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

                {displayType ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Type</Text>
                    <Text style={styles.specValue}>{displayType}</Text>
                  </View>
                ) : null}

                {displayWeightInfo ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>{displayWeightInfo.label}</Text>
                    <Text style={styles.specValue}>{displayWeightInfo.formatted}</Text>
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

        {/* ── Similar Products Horizontal Slider (HomeScreen Product Card Style) ── */}
        {(isSubCatLoading && isCatProductsLoading && isFallbackProductsLoading && similarProductCards.length === 0) ? (
          <View style={styles.similarSection}>
            <View style={styles.similarHeader}>
              <Text style={styles.similarTitle}>Similar Products</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarScrollContent}>
              {[1, 2, 3, 4].map((k) => (
                <View key={k} style={styles.similarCard}>
                  <Skeleton width="100%" height={150} radius={12} />
                  <Skeleton width="90%" height={11} radius={5} style={styles.skeletonMargin10} />
                  <Skeleton width="60%" height={11} radius={5} style={styles.skeletonMargin6} />
                  <Skeleton width="50%" height={14} radius={5} style={styles.skeletonMargin8} />
                  <Skeleton width="100%" height={36} radius={10} style={styles.skeletonMargin12} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : similarProductCards.length > 0 ? (
          <View style={styles.similarSection}>
            <View style={styles.similarHeader}>
              <Text style={styles.similarTitle}>Similar Products</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarScrollContent}>
              {similarProductCards.map(
                ({ item, itemId, originalPrice, finalPrice, discount, imageSource, brandNameStr, titleText, isBestseller }) => {
                  const isItemInCart = cartItems.some((ci) => (ci.productId || ci.id) === itemId);
                  const isAddingThis = addingSimilarId === itemId;

                  return (
                    <TouchableOpacity
                      key={itemId}
                      style={styles.similarCard}
                      activeOpacity={0.85}
                      onPress={() => handleOpenSimilarProduct(item)}>
                      {/* Image Box */}
                      <View style={styles.similarImageContainer}>
                        {isBestseller ? (
                          <LinearGradient
                            colors={['#A78BFA', colors.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.similarGradientBadge}>
                            <Text style={styles.similarGradientBadgeText}>BESTSELLER</Text>
                          </LinearGradient>
                        ) : null}
                        <RemoteImage
                          source={imageSource}
                          defaultSource={DUMMY_IMG}
                          style={styles.similarProductImage}
                          resizeMode="cover"
                        />
                      </View>

                      {/* Details Container */}
                      <View style={styles.similarDetailsContainer}>
                        <View>
                          <Text numberOfLines={2} style={styles.similarProductTitle}>
                            {brandNameStr ? <Text style={styles.similarBrandText}>{brandNameStr} </Text> : null}
                            {titleText}
                          </Text>

                          {/* Price Row */}
                          <View style={styles.similarPriceRow}>
                            {discount > 0 ? (
                              <>
                                <Text style={styles.similarOriginalPrice}>₹{originalPrice}</Text>
                                <Text style={styles.similarFinalPrice}>₹{finalPrice}</Text>
                                <Text style={styles.similarDiscountText}>{discount}% OFF</Text>
                              </>
                            ) : (
                              <Text style={styles.similarFinalPrice}>₹{finalPrice}</Text>
                            )}
                          </View>
                        </View>

                        {/* ADD TO BAG / GO TO BAG Button with Spinner */}
                        <TouchableOpacity
                          style={[styles.similarAddToBagButton, isItemInCart && styles.similarGoToBagButton]}
                          activeOpacity={0.85}
                          disabled={isAddingThis}
                          onPress={() => handleAddSimilarToBag(item)}>
                          {isAddingThis ? (
                            <ActivityIndicator size="small" color={isItemInCart ? '#FFFFFF' : colors.primary} />
                          ) : (
                            <Text style={[styles.similarAddToBagText, isItemInCart && styles.similarGoToBagText]}>
                              {isItemInCart ? 'GO TO BAG' : 'ADD TO BAG'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>
          </View>
        ) : null}
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
              {images.map((imgUri, index) => {
                const fullSource = getImageSource(imgUri, 'DETAIL_MAIN', DUMMY_IMG);
                return (
                  <View key={`modal-img-${selectedVariantIndex ?? 'base'}-${index}`} style={styles.fullscreenImageSlide}>
                    <Image
                      source={fullSource}
                      defaultSource={DUMMY_IMG}
                      style={styles.fullscreenMainImage}
                      resizeMode="contain"
                    />
                  </View>
                );
              })}
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
                      source={getImageSource(imgUri, 'DETAIL_THUMB', DUMMY_IMG)}
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
    left: 16,
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
  floatingShareBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
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
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  expiryText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#6D7277',
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
  variantItemWrapper: {
    alignItems: 'center',
  },
  variantCard: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  variantCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  variantInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  variantColorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  variantName: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1E293B',
  },
  variantNameActive: {
    color: colors.primary,
  },
  variantPriceBelow: {
    fontSize: moderateScale(12.5),
    fontFamily: fonts.big,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
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
    padding: 3.5,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchContainerActive: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  colorSwatchSquare: {
    width: 62,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1.5,
  },
  shadeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  activeShadeLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  colorSwatchesScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  colorSwatchItemWrapper: {
    alignItems: 'center',
  },
  shadeItemPrice: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
  },

  /* ── Similar Products Slider (Matching HomeScreen Card Style) ── */
  similarSection: {
    marginTop: 24,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 8,
    borderTopColor: '#F8FAFC',
  },
  similarHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  similarTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#000000',
  },
  similarScrollContent: {
    paddingHorizontal: 16,
    gap: SIMILAR_CARD_GAP,
    paddingBottom: 4,
  },
  similarCard: {
    width: SIMILAR_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
  },
  similarImageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  similarGradientBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 6,
    paddingVertical: 2.5,
    paddingHorizontal: 5.5,
    zIndex: 10,
  },
  similarGradientBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    letterSpacing: 0.5,
  },
  similarProductImage: {
    width: '100%',
    height: '100%',
  },
  similarDetailsContainer: {
    flex: 1,
    paddingHorizontal: 4,
    marginTop: 4,
    justifyContent: 'space-between',
  },
  similarProductTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.small,
    color: '#475569',
    lineHeight: moderateScale(18),
    minHeight: moderateScale(36),
  },
  similarBrandText: {
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  similarPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'nowrap',
  },
  similarFinalPrice: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  similarOriginalPrice: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  similarDiscountText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#FD3A2D',
    marginLeft: 4,
  },
  similarAddToBagButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  similarGoToBagButton: {
    backgroundColor: colors.primary,
  },
  similarAddToBagText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
    letterSpacing: 0.4,
  },
  similarGoToBagText: {
    color: '#FFFFFF',
  },
  skeletonMargin10: {
    marginTop: 10,
  },
  skeletonMargin6: {
    marginTop: 6,
  },
  skeletonMargin8: {
    marginTop: 8,
  },
  skeletonMargin12: {
    marginTop: 12,
  },
  remoteImageWrapper: {
    overflow: 'hidden',
  },
});
