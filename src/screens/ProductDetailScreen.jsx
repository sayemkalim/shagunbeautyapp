import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
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
  ChevronRight,
} from 'lucide-react-native';

import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { useCartStore } from '../store/cartStore';
import { addToCartApi } from '../api/cart';

import { useProductDetail, useProducts } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { useCategories } from '../hooks/useCategories';
import { useSubCategories } from '../hooks/useSubCategories';
import BottomSheetModal from '../components/BottomSheetModal';
import { Skeleton } from '../components/Skeleton';
import ProductCard from '../components/ProductCard';
import { resolveImageUrl, getImageSource } from '../utils/imageOptimizer';
import { getProductStock, isProductOutOfStock } from '../utils/productUtils';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 1.05;
const DUMMY_IMG = require('../../assets/dummy_product.png');
const SIMILAR_CARD_GAP = 12;
const SIMILAR_CARD_WIDTH = (width - 16 * 2 - SIMILAR_CARD_GAP) / 2;

const COSMETIC_SHADE_PALETTE = [
  '#F3B285', // 220 Natural Beige
  '#FDE2BC', // 120 Classic Ivory
  '#DDA477', // Shade 329
  '#D6976A', // 326 Warm Tan
  '#D3996E', // 137 Golden Tan
  '#F7BA87', // 230 Natural Buff
  '#C68A57', // Shade 339
  '#E8A97A', // 126 Light Pecan
  '#E7AD7E', // 127 Golden Honey
  '#E29D6E', // Warm Caramel
  '#CE8B5B', // Toffee
  '#BA7847', // Mocha
];

function ProductDetailSkeleton({ navigation, refreshControl }) {
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

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}>
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
  if (!v && !product) return '';

  const target = v || product;

  // 1. Direct color_name / shade / color name attribute if provided
  const directShade =
    target.color_name ||
    target.colorName ||
    target.shade_name ||
    target.shadeName ||
    target.shade ||
    target.attributes?.color_name ||
    target.attributes?.['Color Name'] ||
    target.attributes?.shade ||
    target.attributes?.['Shade'] ||
    target.attributes?.['Color'] ||
    target.attributes?.['Colour'] ||
    target.attributes?.['Option'] ||
    target.attributes?.['option'] ||
    product?.color_name ||
    product?.colorName;

  if (typeof directShade === 'string' && directShade.trim() !== '') {
    const trimmed = directShade.trim();
    if (!trimmed.startsWith('#') && !/^sku-/i.test(trimmed)) {
      return trimmed;
    }
  }

  // 2. Parse clean shade name from variant.name or object name
  const rawName = typeof target.name === 'string' && target.name.trim() !== '' ? target.name.trim() : (typeof target === 'string' ? target.trim() : '');
  if (rawName) {
    // Strip trailing weight in brackets e.g. (20g), (30ml)
    const clean = rawName.replace(/\s*\(\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)?\s*\)\s*$/i, '').trim();

    // Check delimiter: em dash " — " or "—" or en dash " – " or "–"
    if (/[\u2014\u2013]/.test(clean)) {
      const parts = clean.split(/[\u2014\u2013]/);
      const last = parts[parts.length - 1].trim().replace(/^-\s*/, '');
      if (last && last.length < 35 && !/^\d+\s*(?:g|gm|gram|grams|ml|l|ltr|kg|pcs)$/i.test(last)) {
        const colorSub = last.match(/(?:COLOR|COLOUR|SHADE)\s*-\s*(.+)$/i);
        if (colorSub && colorSub[1]) return colorSub[1].trim();
        return last;
      }
    }

    // Check delimiter: " - " or space before hyphen
    if (/\s+-\s*/.test(clean)) {
      const parts = clean.split(/\s+-\s*/);
      const last = parts[parts.length - 1].trim();
      if (last && last.length < 35 && !/^\d+\s*(?:g|gm|gram|grams|ml|l|ltr|kg|pcs)$/i.test(last)) {
        return last;
      }
    }

    // Check delimiter: ":" or "|"
    if (/[:|]/.test(clean)) {
      const parts = clean.split(/[:|]/);
      const last = parts[parts.length - 1].trim();
      if (last && last.length < 35 && !/^\d+\s*(?:g|gm|gram|grams|ml|l|ltr|kg|pcs)$/i.test(last)) {
        return last;
      }
    }

    // Check pattern like "COLOR -200 EBONY BLACK" or "SHADE 02 RED"
    const shadeMatch = clean.match(/(?:COLOR|COLOUR|SHADE)\s*[-:]?\s*([0-9A-Za-z\s/&.'#]+)$/i);
    if (shadeMatch && shadeMatch[1]) {
      const candidate = shadeMatch[1].trim();
      if (candidate.length > 0 && candidate.length < 35 && !/^\d+\s*(?:g|gm|gram|grams|ml|l|ltr|kg|pcs)$/i.test(candidate)) {
        return candidate;
      }
    }

    // If variant.name itself is short (e.g. "200 Ebony Black", "Dark Brown", "Ruby Red")
    if (clean.length <= 28 && clean.toLowerCase() !== String(product?.name || '').trim().toLowerCase() && !/^\d+\s*(?:g|gm|gram|grams|ml|l|ltr|kg|pcs)$/i.test(clean)) {
      return clean;
    }
  }

  return `Shade ${idx + 1}`;
}

function getVariantCardDetails(v, product, idx = 0) {
  if (!v) return { weightLabel: '', color: null, color_name: '', shadeName: '' };

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
      : v.size !== undefined && v.size !== null && v.size !== ''
      ? v.size
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

  const directColorName = v.color_name || v.colorName || v.attributes?.color_name || v.attributes?.['Color Name'] || '';
  const cleanShade = directColorName || extractCleanShadeName(v, product, idx);

  return {
    weightLabel,
    color: colorValue,
    color_name: directColorName,
    shadeName: cleanShade,
  };
}

function getBaseProductWeightDetails(product) {
  if (!product) return { weightLabel: '', sizeLabel: '' };

  const rawWeight =
    product.weight_in_grams !== undefined && product.weight_in_grams !== null && product.weight_in_grams !== ''
      ? product.weight_in_grams
      : product.weight !== undefined && product.weight !== null && product.weight !== ''
      ? product.weight
      : product.attributes?.weight || product.attributes?.Weight;

  let weightLabel = '';
  if (rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== '') {
    const info = formatProductWeightOrVolume(rawWeight, product, null);
    if (info) {
      weightLabel = info.formatted;
    }
  }

  const rawSize =
    product.size !== undefined && product.size !== null && product.size !== ''
      ? product.size
      : product.attributes?.size || product.attributes?.Size;

  let sizeLabel = '';
  if (rawSize !== undefined && rawSize !== null && String(rawSize).trim() !== '') {
    const info = formatProductWeightOrVolume(rawSize, product, null);
    if (info) {
      if (!weightLabel) weightLabel = info.formatted;
      sizeLabel = info.formatted;
    } else {
      sizeLabel = String(rawSize).trim();
    }
  }

  if (!weightLabel && product.name && typeof product.name === 'string') {
    const matchNum = product.name.match(/\b\d+(?:\.\d+)?\s*(?:g|gm|gram|grams|ml|l|ltr|kg|pcs)?\b/i);
    if (matchNum) {
      const info = formatProductWeightOrVolume(matchNum[0], product, null);
      if (info) {
        weightLabel = info.formatted;
      }
    }
  }

  return {
    weightLabel,
    sizeLabel,
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

function isCartItemMatchingSelection(cartItem, product, selectedVariantIndex) {
  if (!cartItem || !product) return false;

  const pId = String(product._id || product.id || '');
  const itemPId = String(cartItem.productId || cartItem.id || '');
  if (pId !== itemPId) return false;

  const isBaseSelected = selectedVariantIndex === null;
  const activeVar = !isBaseSelected && Array.isArray(product.variants) ? product.variants[selectedVariantIndex] : null;

  const itemVar = cartItem.variant || null;
  const itemSku = cartItem.variant_sku || cartItem.variantSku || itemVar?.sku;
  const itemVarId = itemVar?._id || itemVar?.id;

  if (isBaseSelected) {
    // User selected the Base Product (Option 1, e.g. 25g)
    if (!itemVar && !itemSku && !itemVarId) return true;
    if (itemSku && product.sku && String(itemSku) === String(product.sku)) return true;
    if (product.weight_in_grams && itemVar?.weight_in_grams && String(product.weight_in_grams) === String(itemVar.weight_in_grams)) return true;
    return false;
  }

  // User selected a specific Variant (e.g. 50g, 80g, 15g)
  if (!activeVar) return false;

  const varSku = activeVar.sku;
  const varId = activeVar._id || activeVar.id;
  const varWeight = activeVar.weight_in_grams || activeVar.weight;
  const varColor = activeVar.color || activeVar.hex || activeVar.color_code;
  const varShade = activeVar.shade || activeVar.shade_name;

  // 1. Match by SKU
  if (varSku && itemSku && String(varSku) === String(itemSku)) {
    return true;
  }

  // 2. Match by _id / id
  if (varId && itemVarId && String(varId) === String(itemVarId)) {
    return true;
  }

  // 3. Match by weight / volume (e.g. 25g vs 50g vs 80g vs 15g)
  if (varWeight !== undefined && varWeight !== null && String(varWeight).trim() !== '') {
    const itemWeight = itemVar?.weight_in_grams || itemVar?.weight;
    if (itemWeight !== undefined && itemWeight !== null && String(itemWeight).trim() !== '') {
      return String(varWeight) === String(itemWeight);
    }
  }

  // 4. Match by color / shade / color_name
  const varColorName = activeVar.color_name || activeVar.colorName;
  const itemColorName = itemVar?.color_name || itemVar?.colorName || cartItem.color_name || cartItem.shadeName;
  if (varColorName && itemColorName && String(varColorName).toLowerCase() === String(itemColorName).toLowerCase()) {
    return true;
  }
  if (varColor && itemVar?.color && String(varColor).toLowerCase() === String(itemVar.color).toLowerCase()) {
    return true;
  }
  if (varShade && itemVar?.shade && String(varShade).toLowerCase() === String(itemVar.shade).toLowerCase()) {
    return true;
  }

  // 5. Match by distinct variant name if different from general product title
  if (activeVar.name && itemVar?.name && activeVar.name !== product.name && activeVar.name === itemVar.name) {
    return true;
  }

  return false;
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

  const cartItems = useCartStore((state) => state.items);
  const cartTotalQuantity = useCartStore((state) => state.totalQuantity);
  const addToCart = useCartStore((state) => state.addToCart);
  const setCartData = useCartStore((state) => state.setCartData);

  // Active UI States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null); // null = base product selected by default
  const [quantity, setQuantity] = useState(1);
  const [tempQty, setTempQty] = useState(1);
  const [selectedTierQty, setSelectedTierQty] = useState(1);
  const [showFullSpecs, setShowFullSpecs] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [showShadeModal, setShowShadeModal] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isQtyChanged, setIsQtyChanged] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetch?.(),
        queryClient.invalidateQueries({ queryKey: ['product', resolvedProductId] }),
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
      ]);
    } catch (e) {
      console.log('Product detail refresh error:', e);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [refetch, queryClient, resolvedProductId]);

  // Track previous selection to detect product/variant switches
  const previousSelectionRef = useRef({ productId: null, variantIndex: null });

  // Automatically pre-select variant if passed via navigation params (e.g. from Cart)
  // OR if base product is out of stock and variants are in stock!
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
        return;
      }
    }

    // If base product is out of stock and variants are in stock, auto-select the first in-stock variant!
    if (product && Array.isArray(product.variants) && product.variants.length > 0) {
      const baseStock = getProductStock(product, null);
      if (baseStock <= 0) {
        const firstInStockIdx = product.variants.findIndex((v) => getProductStock(product, v) > 0);
        if (firstInStockIdx !== -1) {
          setSelectedVariantIndex(firstInStockIdx);
        }
      }
    }
  }, [product, targetVariantSku]);

  // Synchronize quantity independently for each product and variant (resets on variant / product change)
  useEffect(() => {
    const pId = product?._id || resolvedProductId;
    if (!pId) return;

    const prev = previousSelectionRef.current;
    const isNewProduct = prev.productId !== pId;
    const isNewVariant = prev.variantIndex !== selectedVariantIndex;

    if (isNewProduct || isNewVariant) {
      previousSelectionRef.current = { productId: pId, variantIndex: selectedVariantIndex };

      const cartMatch = cartItems.find((item) =>
        isCartItemMatchingSelection(item, product, selectedVariantIndex)
      );

      let targetQty = 1;
      if (cartMatch && typeof cartMatch.quantity === 'number' && cartMatch.quantity > 0) {
        targetQty = cartMatch.quantity;
      } else if (isNewProduct && initialQty && typeof initialQty === 'number' && initialQty > 0) {
        targetQty = initialQty;
      }

      setQuantity(targetQty);
      setTempQty(targetQty);
      setIsQtyChanged(false);
    }
  }, [selectedVariantIndex, resolvedProductId, product, cartItems, initialQty]);

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

    // 1. If base product has a color or color_name, add it as Main Shade (index: null)
    const baseColor = product?.color && String(product.color).trim() !== '' ? String(product.color).trim() : null;
    const baseColorName = product?.color_name || product?.colorName || '';
    const baseShadeName = baseColorName || extractCleanShadeName(product, product, 0) || 'Main Shade';

    const hasVariantShades = Array.isArray(product?.variants) && product.variants.some((v, idx) => {
      const d = getVariantCardDetails(v, product, idx);
      return !!d.color || !!v.color_name || !!v.colorName || (!!d.shadeName && !d.weightLabel);
    });

    if (baseColor || baseColorName || (hasVariantShades && baseShadeName && baseShadeName !== 'Standard' && baseShadeName !== 'Default')) {
      const baseImg =
        (Array.isArray(product?.images) && product?.images[0]) ||
        product?.image ||
        product?.banner_image ||
        null;

      list.push({
        id: 'main-base-shade',
        index: null, // null means base product
        variant: null,
        color: baseColor || COSMETIC_SHADE_PALETTE[0],
        color_name: baseColorName || baseShadeName,
        shadeName: baseColorName || baseShadeName || 'Main Shade',
        price: parsePrice(product?.discounted_price || product?.price),
        originalPrice: parsePrice(product?.price),
        image: baseImg,
      });
    }

    // 2. Add all variant shades (index: idx)
    if (Array.isArray(product?.variants)) {
      product.variants.forEach((v, idx) => {
        const details = getVariantCardDetails(v, product, idx);
        const variantColorName = v.color_name || v.colorName || details.color_name || '';
        const isShade = !!variantColorName || !!v.color || !!details.color || (!!details.shadeName && !details.weightLabel);
        if (isShade) {
          const vImg =
            (Array.isArray(v.images) && v.images[0]) ||
            v.image ||
            v.banner_image ||
            (Array.isArray(product?.images) && product?.images[0]) ||
            product?.image ||
            null;

          const swatchColor = details.color || v.color || COSMETIC_SHADE_PALETTE[(idx + 1) % COSMETIC_SHADE_PALETTE.length];
          const shadeName = variantColorName || details.shadeName || `Shade ${idx + 1}`;

          list.push({
            id: v.sku || `variant-shade-${idx}`,
            index: idx,
            variant: v,
            color: swatchColor,
            color_name: variantColorName,
            shadeName: shadeName,
            price: parsePrice(v.discounted_price || v.price),
            originalPrice: parsePrice(v.price || product?.price),
            image: vImg,
          });
        }
      });
    }

    return list;
  }, [product]);

  const variantWeightItems = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];
    const hasAnyColor = product.variants.some((v, idx) => {
      const d = getVariantCardDetails(v, product, idx);
      return !!d.color || !!v.color_name || !!v.colorName || (!!d.shadeName && !d.weightLabel);
    });
    let nonColorVariants = [];
    if (hasAnyColor) {
      // If product has color variants, non-color variants go to Select Option
      nonColorVariants = product.variants
        .map((v, idx) => ({
          variant: v,
          index: idx,
          details: getVariantCardDetails(v, product, idx),
        }))
        .filter((item) => !item.details.color && !item.variant?.color_name && !item.variant?.colorName && (!item.details.shadeName || item.details.weightLabel));
    } else {
      nonColorVariants = product.variants.map((v, idx) => ({
        variant: v,
        index: idx,
        details: getVariantCardDetails(v, product, idx),
      }));
    }

    if (nonColorVariants.length === 0) return [];

    // Check if base product is already present in nonColorVariants
    const baseAlreadyInVariants = nonColorVariants.some((item) => {
      const v = item.variant;
      if (!v) return false;
      if (product?.sku && v?.sku && v.sku === product.sku) return true;
      return false;
    });

    const list = [];
    if (!baseAlreadyInVariants) {
      const baseDetails = getBaseProductWeightDetails(product);
      const baseLabel = baseDetails.weightLabel || baseDetails.sizeLabel || 'Standard';
      list.push({
        id: 'main-base-weight-option',
        index: null, // null represents the base product
        variant: null,
        details: {
          weightLabel: baseLabel,
          shadeName: baseDetails.sizeLabel || '',
        },
        price: product?.discounted_price || product?.price,
      });
    }

    list.push(...nonColorVariants);
    return list;
  }, [product]);

  const activeOptionLabel = useMemo(() => {
    if (variantWeightItems.length === 0) return '';
    const activeItem = variantWeightItems.find((item) =>
      item.index === null ? selectedVariantIndex === null : item.index === selectedVariantIndex
    );
    if (activeItem) {
      return activeItem.details?.weightLabel || activeItem.details?.shadeName || '';
    }
    return '';
  }, [selectedVariantIndex, variantWeightItems]);

  const activeShadeLabel = useMemo(() => {
    if (selectedVariantIndex !== null) {
      const activeShade = allShadeItems.find((s) => s.index === selectedVariantIndex);
      if (activeShade) return activeShade.color_name || activeShade.shadeName;
      if (currentVariant) {
        if (currentVariant.color_name || currentVariant.colorName) {
          return currentVariant.color_name || currentVariant.colorName;
        }
        const details = getVariantCardDetails(currentVariant, product, selectedVariantIndex);
        return details.color_name || details.shadeName || '';
      }
    }
    // If base product is selected (selectedVariantIndex === null)
    if (product?.color_name || product?.colorName) {
      return product.color_name || product.colorName;
    }
    const baseShade = allShadeItems.find((s) => s.index === null);
    if (baseShade) return baseShade.color_name || baseShade.shadeName;

    if (allShadeItems.length > 0) {
      return allShadeItems[0].color_name || allShadeItems[0].shadeName;
    }
    return '';
  }, [selectedVariantIndex, allShadeItems, currentVariant, product]);

  const displaySku = currentVariant && currentVariant.sku
    ? currentVariant.sku
    : product?.sku;

  const maxStock = useMemo(() => {
    return getProductStock(product, currentVariant);
  }, [product, currentVariant]);

  // Parse bulk price tiers if available (for variant if variant selected, or main product if base)
  const activePriceTiers = useMemo(() => {
    let raw = null;
    if (currentVariant) {
      raw = currentVariant.price_tiers || currentVariant.priceTiers;
    } else {
      raw = product?.price_tiers || product?.priceTiers;
    }
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

  // Generate quantity options for Modal (derived directly from price_tiers, respecting available stock)
  const quantityOptions = useMemo(() => {
    const options = [];

    if (activePriceTiers.length > 0) {
      // 1) Base unit option (Qty 1)
      const baseUnitPrice = discountedPrice;
      const baseTotalPrice = discountedPrice;
      const baseSavings = hasDiscount ? discountPercent : 0;
      const isBaseOutOfStock = maxStock > 0 ? maxStock < 1 : false;

      options.push({
        qty: 1,
        unitPrice: baseUnitPrice,
        totalPrice: baseTotalPrice,
        badge: isBaseOutOfStock ? 'OUT OF STOCK' : (baseSavings > 0 ? `${baseSavings}% OFF` : null),
        isTier: false,
        isOutOfStock: isBaseOutOfStock,
      });

      // 2) Tier options from price_tiers array
      activePriceTiers.forEach((tier) => {
        const q = tier.quantity;
        if (q <= 1) return;

        const rawPrice = parsePrice(tier.price);
        let unitP = rawPrice > 0 ? rawPrice : discountedPrice;
        let totalP = rawPrice;

        if (price > 0 && rawPrice > price) {
          totalP = rawPrice;
          unitP = rawPrice / q;
        } else {
          totalP = Math.round(rawPrice * q);
          unitP = rawPrice;
        }

        const baseTot = (price > 0 ? price : discountedPrice) * q;
        const savingsPercent = baseTot > totalP ? Math.round(((baseTot - totalP) / baseTot) * 100) : 0;
        const isTierOutOfStock = maxStock > 0 ? q > maxStock : false;

        options.push({
          qty: q,
          unitPrice: Math.round(unitP),
          exactUnitPrice: unitP,
          totalPrice: totalP,
          badge: isTierOutOfStock
            ? 'OUT OF STOCK'
            : savingsPercent > 0
            ? `SAVE ${savingsPercent}%`
            : 'BULK TIER',
          isTier: true,
          isOutOfStock: isTierOutOfStock,
        });
      });
    } else {
      // Standard quantity options (1 to 10) when no price_tiers exist
      for (let q = 1; q <= 10; q++) {
        const uPrice = discountedPrice;
        const tPrice = discountedPrice * q;
        const isOutOfStock = maxStock > 0 ? q > maxStock : false;
        options.push({
          qty: q,
          unitPrice: uPrice,
          totalPrice: tPrice,
          badge: isOutOfStock ? 'OUT OF STOCK' : null,
          isTier: false,
          isOutOfStock,
        });
      }
    }

    return options;
  }, [activePriceTiers, discountedPrice, price, hasDiscount, discountPercent, maxStock]);

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
        let totalP = rawP;
        let tierUnitPrice = rawP;
        if (price > 0 && rawP > price) {
          if (quantity === latestTier.quantity) {
            totalP = rawP;
            tierUnitPrice = rawP / quantity;
          } else {
            tierUnitPrice = rawP / latestTier.quantity;
            totalP = Math.round(tierUnitPrice * quantity);
          }
        } else {
          totalP = Math.round(rawP * quantity);
        }
        return {
          unitPrice: Math.round(tierUnitPrice),
          totalPrice: totalP,
        };
      }
    }

    return {
      unitPrice: discountedPrice,
      totalPrice: discountedPrice * quantity,
    };
  }, [quantityOptions, quantity, activePriceTiers, discountedPrice, price]);

  // Resolve matching tier for any given quantity
  const resolveMatchingTierQty = useCallback((qty) => {
    if (!qty || qty <= 1) return 1;
    if (activePriceTiers.length === 0) return qty;

    // Filter tiers that are within stock limit
    const validTiers = maxStock > 0
      ? activePriceTiers.filter((t) => t.quantity <= maxStock)
      : activePriceTiers;

    if (validTiers.length === 0) return 1;

    // 1. Exact tier match (not out of stock)
    const exactOpt = quantityOptions.find((o) => o.qty === qty && o.isTier && !o.isOutOfStock);
    if (exactOpt) return exactOpt.qty;

    // 2. Nearest tier <= qty (from highest to lowest)
    const sortedTiers = [...validTiers].sort((a, b) => b.quantity - a.quantity);
    const lowerTier = sortedTiers.find((t) => qty >= t.quantity);
    if (lowerTier) return lowerTier.quantity;

    return 1;
  }, [activePriceTiers, quantityOptions, maxStock]);

  // Handle variant selection with instant reset and proper cart synchronization
  const handleSelectVariant = useCallback((newIdx) => {
    setSelectedVariantIndex(newIdx);

    const pId = product?._id || resolvedProductId;
    previousSelectionRef.current = { productId: pId, variantIndex: newIdx };

    const matched = cartItems.find((ci) => isCartItemMatchingSelection(ci, product, newIdx));
    const targetVariant = newIdx !== null && Array.isArray(product?.variants) ? product.variants[newIdx] : null;
    const targetStock = getProductStock(product, targetVariant);

    let initialSelectedQty = 1;
    if (matched && typeof matched.quantity === 'number' && matched.quantity > 0) {
      initialSelectedQty = matched.quantity;
    }
    if (targetStock > 0 && initialSelectedQty > targetStock) {
      initialSelectedQty = Math.max(1, targetStock);
    }

    setQuantity(initialSelectedQty);
    setTempQty(initialSelectedQty);
    const matchedTier = resolveMatchingTierQty(initialSelectedQty);
    setSelectedTierQty(matchedTier);
    setIsQtyChanged(false);
  }, [cartItems, product, resolvedProductId, resolveMatchingTierQty]);

  // Automatically clamp quantity if it exceeds available stock for the current selection
  useEffect(() => {
    const pId = product?._id || resolvedProductId;
    const prev = previousSelectionRef.current;
    if (prev.productId === pId && prev.variantIndex === selectedVariantIndex) {
      if (maxStock > 0 && quantity > maxStock) {
        const validQty = Math.max(1, maxStock);
        setQuantity(validQty);
        setTempQty(validQty);
        const matched = resolveMatchingTierQty(validQty);
        setSelectedTierQty(matched);
      }
    }
  }, [maxStock, quantity, resolveMatchingTierQty, selectedVariantIndex, product?._id, resolvedProductId]);

  // Keep selectedTierQty and tempQty always in sync with quantity
  useEffect(() => {
    const matchedTierQty = resolveMatchingTierQty(quantity);
    setSelectedTierQty(matchedTierQty);
    setTempQty(quantity);
  }, [quantity, resolveMatchingTierQty]);

  // Open quantity / bulk tier modal with properly synchronized tier selection
  const openQuantityModal = useCallback(() => {
    const safeQty = maxStock > 0 && quantity > maxStock ? Math.max(1, maxStock) : quantity;
    if (activePriceTiers.length > 0) {
      const exactOption = quantityOptions.find((o) => o.qty === safeQty);
      const chosenQty = exactOption ? exactOption.qty : resolveMatchingTierQty(safeQty);
      setSelectedTierQty(chosenQty);
      setTempQty(chosenQty);
    } else {
      setSelectedTierQty(safeQty);
      setTempQty(safeQty);
    }
    setShowQtyModal(true);
  }, [quantity, maxStock, activePriceTiers.length, quantityOptions, resolveMatchingTierQty]);

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

  // Check if current product / variant is already in cart
  const isInCart = useMemo(() => {
    const pId = product._id || resolvedProductId;
    const vSku = currentVariant?.sku || currentVariant?._id;
    return cartItems.some((item) => {
      if (item.productId !== pId && item.id !== pId) return false;
      if (vSku) return item.variant?.sku === vSku || item.variant?._id === vSku || item.variantSku === vSku;
      return !item.variant;
    });
  }, [cartItems, product._id, resolvedProductId, currentVariant]);

  // Display Title: completely replaced by selected variant's name if selected
  const displayTitle = useMemo(() => {
    if (currentVariant?.name) {
      return currentVariant.name;
    }
    return product?.name || '';
  }, [product?.name, currentVariant]);

  // Handlers
  const handleAddToCart = async () => {
    if (isAdding) return; // Strict lock: wait until current add finishes
    if (isInCart && !isQtyChanged) {
      navigation.navigate('BottomTabs', { screen: 'Bag' });
      return;
    }

    if (maxStock > 0 && quantity > maxStock) {
      Alert.alert('Stock Limit', `Only ${maxStock} items available in stock.`);
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

    const resolvedColorName =
      currentVariant?.color_name ||
      currentVariant?.colorName ||
      (selectedVariantIndex === null ? (product?.color_name || product?.colorName) : null) ||
      (activeShadeLabel && !activeShadeLabel.startsWith('#') ? activeShadeLabel : '') ||
      '';

    const resolvedShadeName =
      resolvedColorName ||
      (resolvedColor ? extractCleanShadeName(currentVariant || product, product, selectedVariantIndex) : '') ||
      '';

    const itemToAdd = {
      productId: pId,
      name: displayTitle || product.name,
      brandName: brandName || '',
      image: images[0] || null,
      variant: currentVariant
        ? {
            ...currentVariant,
            color: resolvedColor || currentVariant.color,
            color_name: resolvedColorName || currentVariant.color_name || currentVariant.colorName || '',
          }
        : null,
      color_name: resolvedColorName,
      variantName: resolvedShadeName || displayWeightInfo?.formatted || currentVariant?.name || null,
      shadeName: resolvedShadeName,
      color: resolvedColor,
      unitPrice: currentQuantityPricing.unitPrice,
      totalPrice: currentQuantityPricing.totalPrice,
      quantity: quantity,
      price: price,
      discountedPrice: currentQuantityPricing.unitPrice || discountedPrice,
      baseDiscountedPrice: discountedPrice,
      price_tiers: activePriceTiers.length > 0 ? activePriceTiers : (currentVariant?.price_tiers || currentVariant?.priceTiers || product?.price_tiers || product?.priceTiers || null),
      isSetQuantity: true,
      available_inventory: currentVariant ? (currentVariant.available_inventory ?? null) : product.available_inventory,
      base_available_inventory: product.base_available_inventory,
    };

    // Optimistic instant Redux update so image & cart badge update at 0ms
    console.log('🛒 [ADD_TO_CART] Product added to cart:', {
      productId: itemToAdd.productId,
      name: itemToAdd.name,
      brand: itemToAdd.brandName,
      variant: itemToAdd.variantName || itemToAdd.variant?.name || 'Base',
      variantSku: currentVariant?.sku || null,
      quantity: itemToAdd.quantity,
      unitPrice: itemToAdd.unitPrice,
      totalPrice: itemToAdd.totalPrice,
      fullItem: itemToAdd,
    });
    addToCart(itemToAdd);

    try {
      setIsAdding(true);
      // Backend Cart API call
      const res = await addToCartApi({
        type: 'product',
        productId: pId,
        quantity,
        variantSku: currentVariant?.sku,
      });
      const cartData = res?.data?.data || res?.data;
      if (cartData && Array.isArray(cartData.items)) {
        setCartData(cartData);
      }
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err) {
      // Offline / guest fallback already handled optimistically
      console.log('Backend add to cart error:', err);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setIsAdding(false);
      setIsQtyChanged(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  const selectQuantityOption = (selectedQty) => {
    if (maxStock > 0 && selectedQty > maxStock) {
      Alert.alert('Stock Limit', `Only ${maxStock} items available in stock.`);
      return;
    }
    if (selectedQty !== quantity) {
      setQuantity(selectedQty);
      setIsQtyChanged(true);
    }
    const matchedTierQty = resolveMatchingTierQty(selectedQty);
    setSelectedTierQty(matchedTierQty);
    setTempQty(selectedQty);
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
    if (addingSimilarId || isAdding) return; // Strict lock: wait until current add finishes
    if (isProductOutOfStock(item)) {
      return;
    }

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

    // Instant optimistic update for 0ms UI and image display
    addToCart(itemToAdd);

    try {
      const res = await addToCartApi({
        type: 'product',
        productId: pId,
        quantity: 1,
      });
      const cartData = res?.data?.data || res?.data;
      if (cartData && Array.isArray(cartData.items)) {
        setCartData(cartData);
      }
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (e) {
      console.log('Similar product add to cart error:', e);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setAddingSimilarId(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  if ((isLoading && !product?.name) || isRefreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ProductDetailSkeleton
          navigation={navigation}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const activeShadeImage = (() => {
    if (selectedVariantIndex !== null) {
      const v = product?.variants?.[selectedVariantIndex];
      if (v?.images?.[0]) return v.images[0];
      if (v?.image) return v.image;
      if (v?.banner_image) return v.banner_image;
    }
    return images[0] || product?.image || product?.banner_image || DUMMY_IMG;
  })();

  const activeShadeTitle = displayTitle || product?.name || '';
  const activeItemPrice = currentQuantityPricing.totalPrice || discountedPrice || price || 0;
  const activeItemOrigPrice = (price || 0) * (quantity || 1);
  const activeItemDiscount = hasDiscount ? discountPercent : 0;
  const activeRating = product?.rating;
  const activeRatingCount = product?.reviews_count || product?.ratings_count ;
  const activeVolume =
    displayWeightInfo?.formatted ||
    (product?.name || '').match(/\b\d+(?:\.\d+)?\s*(?:ml|g|gm|gram|grams|kg|l|ltr|pcs)\b/i)?.[0] ||
    (product?.variants?.[0]?.weight_in_grams ? `${product.variants[0].weight_in_grams} g` : null);

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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>

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

          {/* Optional Bestseller or Out of Stock Badge */}
          {maxStock <= 0 ? (
            <View style={styles.detailOutOfStockBadge}>
              <Text style={styles.detailOutOfStockBadgeText}>OUT OF STOCK</Text>
            </View>
          ) : (product?.is_best_seller || product?.isBestSeller || product?.is_bestseller || product?.tag === 'bestseller') ? (
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

          {/* Optional Product Rating & Weight Pill Row */}
          {(product.rating || displayWeightInfo?.formatted) ? (
            <View style={styles.ratingRow}>
              {product.rating ? (
                <View style={styles.ratingPill}>
                  <Text style={styles.ratingNumber}>{product.rating}</Text>
                  <Star size={12} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
                </View>
              ) : null}
      
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
            {hasDiscount ? (() => {
              const totalMRP = (price || 0) * (quantity || 1);
              const currentTotal = currentQuantityPricing.totalPrice || (discountedPrice * (quantity || 1));
              const effectiveDiscount = totalMRP > currentTotal
                ? Math.round(((totalMRP - currentTotal) / totalMRP) * 100)
                : discountPercent;

              return (
                <>
                  <Text style={styles.originalPrice}>MRP ₹{totalMRP}</Text>
                  {effectiveDiscount > 0 ? (
                    <Text style={styles.discountBadge}>({effectiveDiscount}% OFF)</Text>
                  ) : null}
                </>
              );
            })() : null}
          </View>
        </View>

        {/* ── Bulk Pricing Preview Banner ── */}
        {activePriceTiers.length > 0 ? (
          <TouchableOpacity
            style={styles.bulkBanner}
            activeOpacity={0.85}
            onPress={openQuantityModal}>
            <View style={styles.bulkBannerLeft}>
              <Tag size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bulkBannerTitle}>Bulk Pricing Available</Text>
                <Text style={styles.bulkBannerSub} numberOfLines={2}>
                  {activePriceTiers
                    .map((t, idx, arr) => {
                      const rawP = parsePrice(t.price);
                      const uP = rawP > 0 ? (price > 0 && rawP > price && t.quantity > 0 ? Math.round(rawP / t.quantity) : rawP) : (discountedPrice || 0);
                      const nextTier = arr[idx + 1];
                      if (nextTier) {
                        return `Buy ${t.quantity}-${nextTier.quantity - 1} @ ₹${uP} each`;
                      }
                      return `Buy ${t.quantity}+ @ ₹${uP} each`;
                    })
                    .join('  •  ')}
                </Text>
              </View>
            </View>
            <ChevronDown size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        {/* ── Select Option (Weight / Size Pills) ── */}
        {variantWeightItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.shadeHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>
                Select Size / Option
              </Text>
              {/* {activeOptionLabel ? (
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.activeShadeLabel}>
                  {activeOptionLabel}
                </Text>
              ) : null} */}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.variantsScrollContent}>
              {variantWeightItems.map((item) => {
                const { variant: v, index: idx, details, price: itemPrice } = item;
                const isSelected = idx === null
                  ? selectedVariantIndex === null
                  : selectedVariantIndex === idx;
                const { weightLabel, shadeName } = details;
                const displayPrice = itemPrice || (v ? (v.discounted_price || v.price) : (product?.discounted_price || product?.price));

                const isItemOutOfStock = idx === null
                  ? getProductStock(product, null) <= 0
                  : getProductStock(product, v) <= 0;

                return (
                  <TouchableOpacity
                    key={v?.sku || item.id || idx}
                    style={styles.variantItemWrapper}
                    activeOpacity={0.8}
                    onPress={() => {
                      const newIdx = idx === null ? null : (isSelected ? null : idx);
                      handleSelectVariant(newIdx);
                    }}>
                    
                    {/* The Option Box / Pill */}
                    <View style={[
                      styles.variantCard,
                      isSelected && styles.variantCardActive,
                      isItemOutOfStock && !isSelected && styles.variantCardOutOfStock,
                    ]}>
                      <View style={styles.variantInfoRow}>
                        {weightLabel ? (
                          <Text style={[
                            styles.variantName,
                            isSelected && styles.variantNameActive,
                            isItemOutOfStock && !isSelected && styles.variantNameOutOfStock,
                          ]}>
                            {weightLabel}
                          </Text>
                        ) : shadeName ? (
                          <Text style={[
                            styles.variantName,
                            isSelected && styles.variantNameActive,
                            isItemOutOfStock && !isSelected && styles.variantNameOutOfStock,
                          ]}>
                            {shadeName}
                          </Text>
                        ) : (
                          <Text style={[
                            styles.variantName,
                            isSelected && styles.variantNameActive,
                            isItemOutOfStock && !isSelected && styles.variantNameOutOfStock,
                          ]}>
                            {v?.weight_in_grams ? `${v.weight_in_grams} g` : idx === null ? 'Standard' : `#${idx + 1}`}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Price or Sold Out Shown Below the Box */}
                    {isItemOutOfStock ? (
                      <Text style={styles.variantSoldOutLabel}>
                        Sold out
                      </Text>
                    ) : (
                      <Text style={styles.variantPriceBelow}>
                        ₹{displayPrice}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Product Shades & Colors (Main Shade + Variant Shades) ── */}
        {allShadeItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.shadeHeaderRow}>
              <View style={styles.shadeHeaderLeft}>
                <Text style={styles.sectionTitleNoMargin}>Select Shade</Text>
                {/* {activeShadeLabel ? (
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.activeShadeInlineText}>
                    • {activeShadeLabel}
                  </Text>
                ) : null} */}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.viewAllShadesBtn}
                onPress={() => setShowShadeModal(true)}>
                <Text style={styles.viewAllShadesBtnText}>View All</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorSwatchesScrollContent}>
              {allShadeItems.map((item) => {
                const isSelected = item.index === null
                  ? selectedVariantIndex === null
                  : selectedVariantIndex === item.index;

                const isItemOutOfStock = item.variant
                  ? getProductStock(product, item.variant) === 0
                  : getProductStock(product, null) === 0;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      const newIdx = item.index === null ? null : (isSelected ? null : item.index);
                      handleSelectVariant(newIdx);
                    }}
                    style={styles.colorSwatchItemWrapper}>
                    <View
                      style={[
                        styles.colorSwatchContainer,
                        isSelected && styles.colorSwatchContainerActive,
                        isItemOutOfStock && !isSelected && styles.colorSwatchContainerOutOfStock,
                      ]}>
                      <View style={[styles.colorSwatchSquare, { backgroundColor: item.color }]} />
                    </View>

                    {isItemOutOfStock ? (
                      <Text style={styles.variantSoldOutLabel}>
                        Sold out
                      </Text>
                    ) : item.price ? (
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
                {similarProductCards.map((card) => {
                  const productItem = card.item || card;
                  return (
                    <ProductCard
                      key={card.itemId || productItem._id || productItem.id}
                      product={productItem}
                      width={SIMILAR_CARD_WIDTH}
                      style={styles.similarCard}
                      brands={brands}
                      onPress={handleOpenSimilarProduct}
                    />
                  );
                })}
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
            {quantityOptions.map((opt, optIdx) => {
              const isSelected = selectedTierQty === opt.qty;
              const isOutOfStock = opt.isOutOfStock || (maxStock > 0 && opt.qty > maxStock);

              const nextTierOpt = quantityOptions[optIdx + 1];
              const prevTierOpt = quantityOptions[optIdx - 1];
              const isNextDisabled = !nextTierOpt || nextTierOpt.isOutOfStock || (maxStock > 0 && nextTierOpt.qty > maxStock);
              const isPrevDisabled = !prevTierOpt;

              return (
                <View
                  key={opt.qty}
                  style={[
                    styles.sheetOptionRow,
                    isSelected && styles.sheetOptionRowActive,
                    isOutOfStock && styles.sheetOptionRowDisabled,
                  ]}>
                  <TouchableOpacity
                    style={styles.optionClickArea}
                    activeOpacity={isOutOfStock ? 1 : 0.8}
                    onPress={() => {
                      if (isOutOfStock) {
                        Alert.alert('Stock Limit', `Only ${maxStock} items available in stock.`);
                        return;
                      }
                      setSelectedTierQty(opt.qty);
                      setTempQty(opt.qty);
                    }}>
                    <View style={styles.optionLeft}>
                      <View style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleActive,
                        isOutOfStock && styles.radioCircleDisabled,
                      ]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.optionTextColumn}>
                        <View style={styles.qtyTitleRow}>
                          <Text style={[styles.optionQtyText, isOutOfStock && { color: '#94A3B8' }]}>
                            Qty: {opt.qty}
                          </Text>
                          {opt.badge ? (
                            <View style={[styles.tierBadge, isOutOfStock && styles.tierBadgeOutOfStock]}>
                              <Text style={styles.tierBadgeText}>{opt.badge}</Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={[styles.optionUnitPriceText, isOutOfStock && { color: '#94A3B8' }]}>
                          ₹{opt.unitPrice}/unit
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Stepper on the right side if the row is selected and is a tier */}
                  {isSelected && opt.isTier ? (
                    <View style={styles.rowStepperWrapper}>
                      <View style={styles.rowStepperContainer}>
                        <TouchableOpacity
                          style={styles.rowStepperBtn}
                          activeOpacity={0.7}
                          disabled={isPrevDisabled}
                          onPress={() => {
                            if (prevTierOpt) {
                              setSelectedTierQty(prevTierOpt.qty);
                              setTempQty(prevTierOpt.qty);
                            }
                          }}>
                          <Minus
                            size={12}
                            color={isPrevDisabled ? '#CBD5E1' : colors.primary}
                            strokeWidth={2.5}
                          />
                        </TouchableOpacity>
                        
                        <View style={styles.rowStepperTextContainer}>
                          <Text style={styles.rowStepperText}>{opt.qty}</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.rowStepperBtn}
                          activeOpacity={0.7}
                          disabled={isNextDisabled}
                          onPress={() => {
                            if (!nextTierOpt) return;
                            if (nextTierOpt.isOutOfStock || (maxStock > 0 && nextTierOpt.qty > maxStock)) {
                              Alert.alert('Stock Limit', `Only ${maxStock} items available in stock.`);
                            } else {
                              setSelectedTierQty(nextTierOpt.qty);
                              setTempQty(nextTierOpt.qty);
                            }
                          }}>
                          <Plus
                            size={12}
                            color={isNextDisabled ? '#CBD5E1' : colors.primary}
                            strokeWidth={2.5}
                          />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.rowTotalPriceText}>₹{opt.totalPrice}</Text>
                    </View>
                  ) : (
                    <View style={styles.optionRight}>
                      <Text style={[styles.optionTotalPriceText, isOutOfStock && { color: '#94A3B8' }]}>
                        ₹{opt.totalPrice}
                      </Text>
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => {
              const isSelected = tempQty === q;
              const isOutOfStock = maxStock > 0 && q > maxStock;
              return (
                <TouchableOpacity
                  key={q}
                  activeOpacity={0.85}
                  disabled={isOutOfStock}
                  style={[
                    styles.qtyCirclePill,
                    isSelected && styles.qtyCirclePillActive,
                    isOutOfStock && { opacity: 0.35, backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                  ]}
                  onPress={() => {
                    if (isOutOfStock) {
                      Alert.alert('Stock Limit', `Only ${maxStock} items available in stock.`);
                      return;
                    }
                    setTempQty(q);
                  }}>
                  <Text
                    style={[
                      styles.qtyCircleText,
                      isSelected && styles.qtyCircleTextActive,
                      isOutOfStock && { color: '#94A3B8' },
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
          style={[
            styles.confirmQtyBtn,
            (maxStock > 0 && tempQty > maxStock) && styles.confirmQtyBtnDisabled,
          ]}
          activeOpacity={0.85}
          onPress={() => {
            const chosenQty = activePriceTiers.length > 0 ? (selectedTierQty || tempQty || 1) : tempQty;
            if (maxStock > 0 && chosenQty > maxStock) {
              Alert.alert('Stock Limit', `Only ${maxStock} items available in stock.`);
              return;
            }
            selectQuantityOption(chosenQty);
            setShowQtyModal(false);
          }}>
          <Text style={styles.confirmQtyBtnText}>Confirm</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ── Bottom Sheet All Shades & Color Variants Selector (Matching User Screenshot UI) ── */}
      <BottomSheetModal
        visible={showShadeModal}
        showHandle={true}
        containerStyle={styles.shadeBottomSheetContainer}
        onClose={() => setShowShadeModal(false)}>
        {/* Header with Title & Close button */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select Shade</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setShowShadeModal(false)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.shadeSheetScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.shadeSheetScrollContent}>
          {/* 1. Top Section: Selected Shade Preview Card */}
          <View style={styles.shadeTopPreviewCard}>
            {/* Left Image Box */}
            <View style={styles.shadePreviewImageBox}>
              <Image
                source={getImageSource(activeShadeImage, 'DETAIL_THUMB', DUMMY_IMG)}
                style={styles.shadePreviewImg}
                resizeMode="contain"
              />
            </View>

            {/* Right Details Column */}
            <View style={styles.shadePreviewInfoCol}>
              <Text style={styles.shadePreviewTitle}>
                {activeShadeTitle}
              </Text>

              {/* Price Row: ₹Discounted ₹MRP % Off */}
              <View style={styles.shadePreviewPriceRow}>
                <Text style={styles.shadePreviewFinalPrice}>₹{activeItemPrice}</Text>
                {activeItemDiscount > 0 ? (
                  <>
                    <Text style={styles.shadePreviewOrigPrice}>₹{activeItemOrigPrice}</Text>
                    <Text style={styles.shadePreviewDiscountText}>{activeItemDiscount}% Off</Text>
                  </>
                ) : null}
              </View>

              {/* Rating Row (only if real rating exists) */}
              {/* {activeRating ? (
                <View style={styles.shadePreviewRatingRow}>
                  <View style={styles.shadePreviewRatingBadge}>
                    <Text style={styles.shadePreviewRatingText}>{activeRating}</Text>
                    <Star size={9} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                  </View>
                  {activeRatingCount ? (
                    <Text style={styles.shadePreviewRatingsCountText}>
                      {activeRatingCount} Ratings
                    </Text>
                  ) : null}
                </View>
              ) : null} */}

              {/* Volume / Weight */}
              {/* {activeVolume ? (
                <Text style={styles.shadePreviewVolumeText}>{activeVolume}</Text>
              ) : null} */}
            </View>
          </View>

          {/* 2. Filter Chip: "All" */}
          <View style={styles.shadeFilterChipsRow}>
            <View style={styles.shadeFilterChipActive}>
              <Text style={styles.shadeFilterChipActiveText}>All Shade</Text>
            </View>
          </View>

          {/* 3. Two-Column Shade Swatches Grid */}
          <View style={styles.shadeTwoColGrid}>
            {allShadeItems.map((item) => {
              const isSelected =
                item.index === null
                  ? selectedVariantIndex === null
                  : selectedVariantIndex === item.index;

              const itemHasDiscount = item.originalPrice > item.price;
              const discountOff =
                itemHasDiscount && item.originalPrice > 0
                  ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
                  : 0;

              const isSoldOut = item.variant
                ? getProductStock(product, item.variant) === 0
                : getProductStock(product, null) === 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.shadeTwoColItem}
                  activeOpacity={0.8}
                  onPress={() => {
                    handleSelectVariant(item.index);
                    setActiveImageIndex(0);
                    if (mainCarouselRef.current) {
                      mainCarouselRef.current.scrollTo({ x: 0, animated: true });
                    }
                    setShowShadeModal(false);
                  }}>
                  {/* Big Rounded Color Swatch Box */}
                  <View
                    style={[
                      styles.shadeGridSwatchBox,
                      { backgroundColor: item.color },
                      isSelected && styles.shadeGridSwatchBoxActive,
                    ]}>
                    {isSoldOut ? (
                      <View style={styles.shadeSoldOutPill}>
                        <Text style={styles.shadeSoldOutText}>Sold out</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Right: Shade Name & Discount / Price */}
                  <View style={styles.shadeGridTextCol}>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.shadeGridShadeName,
                        isSelected && styles.shadeGridShadeNameActive,
                      ]}>
                      {item.shadeName}
                    </Text>
                    {/* {discountOff > 0 ? (
                      <Text style={styles.shadeGridDiscountLabel}>
                        {discountOff}% Off
                      </Text>
                    ) : (
                      <Text style={styles.shadeGridPriceLabel}>
                        ₹{item.price}
                      </Text>
                    )} */}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </BottomSheetModal>

      {/* ── Fixed Bottom Action Bar (Quantity Trigger + Add to Bag) ── */}
      <View style={styles.bottomBar}>
        {/* Quantity Selector Trigger - Opens Bottom Sheet */}
        <TouchableOpacity
          style={[styles.quantityContainer, maxStock <= 0 && { opacity: 0.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }]}
          activeOpacity={0.8}
          disabled={maxStock <= 0}
          onPress={openQuantityModal}>
          <Text style={[styles.qtyBtnText, maxStock <= 0 && { color: '#94A3B8' }]}>Qty: {quantity}</Text>
          <ChevronDown size={16} color={maxStock <= 0 ? '#94A3B8' : colors.primary} />
        </TouchableOpacity>

        {/* Primary Color Add to Bag / Go to Bag Button */}
        <TouchableOpacity
          style={[styles.addToBagBtn, maxStock <= 0 && styles.addToBagBtnDisabled]}
          activeOpacity={0.85}
          disabled={maxStock <= 0 || isAdding}
          onPress={handleAddToCart}>
          {isAdding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Handbag size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addToBagBtnText}>
                {maxStock <= 0
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
    gap: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  weightPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weightPillBadgeText: {
    color: '#475569',
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
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
  variantsScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 3,
    paddingHorizontal: 2,
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
  variantCardOutOfStock: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.65,
  },
  variantNameOutOfStock: {
    color: '#94A3B8',
  },
  variantPriceBelow: {
    fontSize: moderateScale(12.5),
    fontFamily: fonts.big,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
  },
  variantSoldOutLabel: {
    fontSize: moderateScale(11.5),
    fontFamily: fonts.medium,
    color: '#EF4444',
    marginTop: 6,
    textAlign: 'center',
  },
  colorSwatchContainerOutOfStock: {
    opacity: 0.5,
    borderColor: '#E2E8F0',
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
  confirmQtyBtnDisabled: {
    opacity: 0.5,
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
  sheetOptionRowDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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
  radioCircleDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
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
  tierBadgeOutOfStock: {
    backgroundColor: '#EF4444',
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
  shadeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  activeShadeInlineText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
    flexShrink: 1,
  },
  viewAllShadesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  viewAllShadesBtnText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  activeShadeLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  /* ── Shade Bottom Sheet (Matching Screenshot UI) ── */
  shadeBottomSheetContainer: {
    maxHeight: height * 0.88,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  shadeSheetScrollView: {
    flexGrow: 0,
  },
  shadeSheetScrollContent: {
    paddingBottom: 24,
  },

  /* Top Preview Card (Left image box with border + dots underneath; Right title, price, rating, volume) */
  shadeTopPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
  },
  shadePreviewImageBoxWrapper: {
    alignItems: 'center',
  },
  shadePreviewImageBox: {
    width: 125,
    height: 125,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  shadePreviewImg: {
    width: '100%',
    height: '100%',
  },
  shadePreviewInfoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  shadePreviewTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    lineHeight: moderateScale(19),
    marginBottom: 6,
  },
  shadePreviewPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  shadePreviewFinalPrice: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  shadePreviewOrigPrice: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  shadePreviewDiscountText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  shadePreviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  shadePreviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  shadePreviewRatingText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  shadePreviewRatingsCountText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  shadePreviewVolumeText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
  },

  /* "All" Filter Chip */
  shadeFilterChipsRow: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shadeFilterChipActive: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  shadeFilterChipActiveText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },

  /* 2-Column Shade Grid */
  shadeTwoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  shadeTwoColItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shadeGridSwatchBox: {
    width: 62,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  shadeGridSwatchBoxActive: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  shadeSoldOutPill: {
    backgroundColor: 'rgba(226, 232, 240, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  shadeSoldOutText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  shadeGridTextCol: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  shadeGridShadeName: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#1E293B',
    lineHeight: moderateScale(16),
  },
  shadeGridShadeNameActive: {
    color: colors.primary,
  },
  shadeGridDiscountLabel: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: colors.primary,
    marginTop: 2,
  },
  shadeGridPriceLabel: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#64748B',
    marginTop: 2,
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
  similarOutOfStockButton: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  similarOutOfStockText: {
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
  detailOutOfStockBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 10,
  },
  detailOutOfStockBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    letterSpacing: 0.6,
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
    borderRadius: 8,
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
});
