import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCart } from '../api/cart';
import { getToken } from '../api/authStorage';

const CART_STORAGE_KEY = 'shagun_cart_storage';

const saveCartToStorage = async (cartState) => {
  try {
    await AsyncStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: cartState.items,
        totalQuantity: cartState.totalQuantity,
        totalAmount: cartState.totalAmount,
      })
    );
  } catch (e) {
    console.log('Failed to save cart to storage', e);
  }
};

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal) || 0;
  }
  return Number(value) || 0;
};

export const parsePriceTiers = (raw) => {
  if (!raw) return null;
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  return parsed
    .filter((t) => t && t.quantity !== undefined && t.quantity !== null)
    .map((t) => ({
      quantity: Number(t.quantity),
      price: toNumber(t.price),
    }))
    .filter((t) => !isNaN(t.quantity) && t.quantity >= 2)
    .sort((a, b) => a.quantity - b.quantity);
};

export const resolveItemPricing = ({
  priceTiers,
  quantity,
  baseMRP,
  baseDiscountedPrice,
  apiPrice,
  apiTotal,
  isVariant,
}) => {
  const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
  const mrp = toNumber(baseMRP);
  const normalDiscounted = toNumber(baseDiscountedPrice) > 0
    ? toNumber(baseDiscountedPrice)
    : (mrp > 0 ? mrp : 0);

  // Check if bulk price tiers exist (applicable to both base product and variant)
  const parsedTiers = Array.isArray(priceTiers) ? priceTiers : parsePriceTiers(priceTiers);

  if (parsedTiers && parsedTiers.length > 0 && qty >= 2) {
    const matchedExact = parsedTiers.find((t) => t.quantity === qty);
    const matchedTier = matchedExact || parsedTiers.filter((t) => t.quantity <= qty).pop();

    if (matchedTier) {
      const rawTierPrice = toNumber(matchedTier.price);
      let tierUnitPrice = rawTierPrice;
      // If tier price is total pack price (e.g. rawTierPrice > mrp), divide by tier quantity
      if (mrp > 0 && rawTierPrice > mrp) {
        tierUnitPrice = rawTierPrice / matchedTier.quantity;
      }
      const unitP = Math.round(tierUnitPrice);
      const totalP = Math.round(unitP * qty);
      return {
        unitPrice: unitP,
        totalPrice: totalP,
        discountedPrice: unitP,
        isBulkTier: true,
      };
    }
  }

  // If backend provided apiPrice or apiTotal that indicates bulk pricing
  const numApiPrice = toNumber(apiPrice);
  const numApiTotal = toNumber(apiTotal);

  if (numApiPrice > 0 && (numApiPrice < normalDiscounted || normalDiscounted <= 0)) {
    const unitP = numApiPrice;
    const totalP = numApiTotal > 0 ? numApiTotal : Math.round(unitP * qty);
    return {
      unitPrice: unitP,
      totalPrice: totalP,
      discountedPrice: unitP,
      isBulkTier: true,
    };
  }

  if (numApiTotal > 0 && (numApiTotal < normalDiscounted * qty || normalDiscounted <= 0)) {
    const totalP = numApiTotal;
    const unitP = Math.round(totalP / qty);
    return {
      unitPrice: unitP,
      totalPrice: totalP,
      discountedPrice: unitP,
      isBulkTier: true,
    };
  }

  // Standard flat pricing fallback
  const uPrice = normalDiscounted > 0 ? normalDiscounted : (numApiPrice > 0 ? numApiPrice : mrp);
  const tPrice = Math.round(uPrice * qty);
  return {
    unitPrice: uPrice,
    totalPrice: tPrice,
    discountedPrice: uPrice,
    isBulkTier: false,
  };
};

const recalculateCartTotals = (state) => {
  let qty = 0;
  let amount = 0;
  state.items.forEach((item) => {
    const itemQty = item.quantity || 1;
    const isVariant = !!(item.variant && item.variant.sku);

    const pricing = resolveItemPricing({
      priceTiers: item.price_tiers,
      quantity: itemQty,
      baseMRP: item.price || 0,
      baseDiscountedPrice: item.baseDiscountedPrice || item.discountedPrice || item.unitPrice || 0,
      apiPrice: item.unitPrice,
      apiTotal: item.totalPrice,
      isVariant,
    });

    item.quantity = itemQty;
    item.unitPrice = pricing.unitPrice;
    item.totalPrice = pricing.totalPrice;
    item.discountedPrice = pricing.discountedPrice;

    qty += itemQty;
    amount += pricing.totalPrice;
  });
  state.totalQuantity = qty;
  state.totalAmount = Math.round(amount);
  saveCartToStorage(state);
};

const extractImgUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string' && img.trim()) return img.trim();
  if (typeof img === 'object') {
    return img.url || img.secure_url || img.uri || img.path || img.image || null;
  }
  return null;
};

const extractCleanShadeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  let clean = name.trim();
  clean = clean.replace(/\s*\(\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs)?\s*\)\s*$/i, '').trim();
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    const last = parts[parts.length - 1].trim();
    if (last && last.length < 40 && !/^\d+\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i.test(last)) {
      return last;
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    const last = parts[parts.length - 1].trim();
    if (last && last.length < 40 && !/^\d+\s*(?:ml|l|ltr|g|gm|kg|pcs)$/i.test(last)) {
      return last;
    }
  }
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const last = parts[parts.length - 1].trim();
    if (last && last.length < 40) {
      return last;
    }
  }
  return '';
};

const parseCartItemFromApi = (item) => {
  const product = item.product || {};
  const pId = typeof product === 'string' ? product : product._id;
  const variantKey = item.variant_sku || 'base';

  // Find matching variant in product.variants if variant_sku is present
  const variantObj = (item.variant_sku && Array.isArray(product.variants))
    ? product.variants.find((v) => v.sku === item.variant_sku || v._id === item.variant_sku || String(v._id) === String(item.variant_sku))
    : null;

  // Resolve Price (MRP): variant.price first, then product.price
  const vPrice = toNumber(variantObj?.price);
  const pPrice = toNumber(product.price);
  const resolvedMRP = vPrice > 0 ? vPrice : (pPrice > 0 ? pPrice : (toNumber(item.price) || 0));

  // Resolve Discounted Price: variant.discounted_price first, then product.discounted_price
  const vDiscountedPrice = toNumber(variantObj?.discounted_price);
  const pDiscountedPrice = toNumber(product.discounted_price);
  const resolvedDiscountedPrice = vDiscountedPrice > 0 ? vDiscountedPrice : (pDiscountedPrice > 0 ? pDiscountedPrice : resolvedMRP);

  // Price tiers: variant-specific price tiers first if variant exists, then product price tiers, then item price tiers
  const rawTiers = variantObj
    ? (variantObj.price_tiers || variantObj.priceTiers || item.price_tiers || item.priceTiers || null)
    : (product.price_tiers || product.priceTiers || item.price_tiers || item.priceTiers || null);
  const parsedPriceTiers = parsePriceTiers(rawTiers);
  const qty = item.quantity || 1;

  const itemApiPrice = toNumber(item.price);
  const itemApiTotal = toNumber(item.total || item.total_price);

  const pricing = resolveItemPricing({
    priceTiers: parsedPriceTiers,
    quantity: qty,
    baseMRP: resolvedMRP,
    baseDiscountedPrice: resolvedDiscountedPrice,
    apiPrice: itemApiPrice,
    apiTotal: itemApiTotal,
    isVariant: !!variantObj,
  });

  const uPrice = pricing.unitPrice;
  const tPrice = pricing.totalPrice;
  const bPrice = resolvedMRP > 0 ? resolvedMRP : uPrice;

  // Name: variant name (e.g. "STREAX SHINE HAIR Serum (90ml)") first, fallback to product.name
  const itemName = variantObj?.name || product.name || 'Product';

  // Image: variant image first, fallback to product images
  let vImage = null;
  if (variantObj) {
    if (Array.isArray(variantObj.images) && variantObj.images.length > 0) {
      vImage = extractImgUrl(variantObj.images[0]);
    }
    if (!vImage) {
      vImage = extractImgUrl(variantObj.image) || extractImgUrl(variantObj.banner_image);
    }
  }

  let pImage = null;
  if (Array.isArray(product.images) && product.images.length > 0) {
    pImage = extractImgUrl(product.images[0]);
  }
  if (!pImage) {
    pImage = extractImgUrl(product.image) || extractImgUrl(product.banner_image);
  }

  const itemImage = vImage || pImage || null;

  // Extract clean shade name candidate
  const rawShadeCandidate =
    variantObj?.shade ||
    variantObj?.shade_name ||
    variantObj?.shadeName ||
    variantObj?.color_name ||
    variantObj?.colorName ||
    product.shade ||
    product.shade_name ||
    product.shadeName ||
    product.color_name ||
    product.colorName;

  const parsedShade =
    (typeof rawShadeCandidate === 'string' && !rawShadeCandidate.trim().startsWith('#') ? rawShadeCandidate.trim() : '') ||
    extractCleanShadeName(variantObj?.name) ||
    extractCleanShadeName(product.name);

  // Option display name: e.g. "90 ml", shade name, or variantObj.name
  let optName = null;
  if (item.variant_sku) {
    if (variantObj) {
      if (variantObj.weight_in_grams) {
        const isMl = (variantObj.name && /ml/i.test(variantObj.name)) || (product.name && /ml/i.test(product.name));
        optName = `${variantObj.weight_in_grams} ${isMl ? 'ml' : 'g'}`;
      } else if (parsedShade) {
        optName = parsedShade;
      } else if (variantObj.color) {
        optName = typeof variantObj.color === 'string' && !variantObj.color.startsWith('#')
          ? variantObj.color
          : (variantObj.color?.name || parsedShade || null);
      } else if (variantObj.name && variantObj.name !== product.name) {
        optName = variantObj.name;
      } else {
        optName = variantObj.sku || item.variant_sku;
      }
    } else {
      optName = item.variant_sku;
    }
  }

  if (!optName && parsedShade) {
    optName = parsedShade;
  }

  // Extract Color from variant or product
  let rawColor =
    variantObj?.color ||
    variantObj?.color_code ||
    variantObj?.colorCode ||
    variantObj?.hex ||
    variantObj?.attributes?.color ||
    variantObj?.attributes?.shade ||
    variantObj?.attributes?.hex ||
    variantObj?.attributes?.['Color'] ||
    variantObj?.attributes?.['Colour'] ||
    variantObj?.attributes?.['Color Code'] ||
    product.color ||
    null;

  if (rawColor && typeof rawColor === 'object') {
    rawColor = rawColor.hex || rawColor.code || rawColor.value || rawColor.color || rawColor.name;
  }
  const vColor = (typeof rawColor === 'string' && rawColor.trim() !== '') ? rawColor.trim() : null;

  return {
    cartItemId: `${pId}_${variantKey}`,
    productId: pId,
    name: itemName,
    brandName: product.brand?.name || (typeof product.brand === 'string' ? '' : ''),
    image: itemImage,
    variant: variantObj
      ? { ...variantObj, sku: item.variant_sku || variantObj.sku, color: vColor || variantObj.color }
      : (item.variant_sku ? { sku: item.variant_sku, color: vColor } : null),
    variantName: optName,
    shadeName: parsedShade || null,
    color: vColor,
    unitPrice: uPrice,
    totalPrice: tPrice,
    quantity: qty,
    price: bPrice,
    discountedPrice: pricing.discountedPrice || uPrice,
    baseDiscountedPrice: resolvedDiscountedPrice,
    price_tiers: parsedPriceTiers,
    available_inventory: variantObj && typeof variantObj.available_inventory === 'number'
      ? variantObj.available_inventory
      : (typeof item.available_inventory === 'number'
        ? item.available_inventory
        : (typeof product.available_inventory === 'number' ? product.available_inventory : null)),
    base_available_inventory: typeof product.base_available_inventory === 'number'
      ? product.base_available_inventory
      : null,
  };
};

export const initializeCart = createAsyncThunk('cart/initializeCart', async () => {
  let localCartData = null;
  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      localCartData = JSON.parse(raw);
    }
  } catch (e) {
    console.log('Error reading local cart', e);
  }

  // Also try fetching from API if authenticated user
  try {
    const token = await getToken();
    if (token) {
      const res = await getCart();
      const cartData = res?.data?.data || res?.data || res || {};
      if (Array.isArray(cartData?.items)) {
        const apiItems = cartData.items.map(parseCartItemFromApi);

        let qty = 0;
        let amount = 0;
        apiItems.forEach((i) => {
          qty += i.quantity;
          amount += i.totalPrice;
        });

        const syncedData = {
          items: apiItems,
          totalQuantity: qty,
          totalAmount: Math.round(amount),
        };
        await saveCartToStorage(syncedData);
        return syncedData;
      }
    }
  } catch (e) {
    console.log('Cart API fetch fallback to local storage', e);
  }

  if (localCartData && Array.isArray(localCartData.items)) {
    return localCartData;
  }

  return { items: [], totalQuantity: 0, totalAmount: 0 };
});

const initialState = {
  items: [],
  totalQuantity: 0,
  totalAmount: 0,
  isInitialized: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const newItem = action.payload;
      const variantKey = newItem.variant?.sku || newItem.variant?._id || newItem.variantId || 'base';
      const itemKey = `${newItem.productId}_${variantKey}`;

      const rawTiers = newItem.price_tiers ||
        newItem.variant?.price_tiers ||
        newItem.variant?.priceTiers ||
        newItem.product?.price_tiers ||
        newItem.product?.priceTiers;
      const parsedPriceTiers = parsePriceTiers(rawTiers);
      const isVariant = !!(newItem.variant && (newItem.variant.sku || newItem.variant._id));

      // Determine stock limit if known from variant or product data
      const rawStock = (newItem.variant && typeof newItem.variant.available_inventory === 'number')
        ? newItem.variant.available_inventory
        : (typeof newItem.available_inventory === 'number'
          ? newItem.available_inventory
          : (typeof newItem.base_available_inventory === 'number' ? newItem.base_available_inventory : null));

      const existingIndex = state.items.findIndex((item) => item.cartItemId === itemKey);

      if (existingIndex >= 0) {
        const existingItem = state.items[existingIndex];
        let updatedQty = newItem.isSetQuantity ? (newItem.quantity || 1) : (existingItem.quantity + (newItem.quantity || 1));
        if (typeof rawStock === 'number' && rawStock > 0 && updatedQty > rawStock) {
          updatedQty = rawStock;
        }
        const effectiveTiers = parsedPriceTiers || existingItem.price_tiers;

        const pricing = resolveItemPricing({
          priceTiers: effectiveTiers,
          quantity: updatedQty,
          baseMRP: existingItem.price || newItem.price || 0,
          baseDiscountedPrice: newItem.baseDiscountedPrice || existingItem.baseDiscountedPrice || existingItem.discountedPrice || newItem.discountedPrice || 0,
          apiPrice: newItem.unitPrice,
          apiTotal: newItem.totalPrice,
          isVariant,
        });

        existingItem.quantity = updatedQty;
        existingItem.unitPrice = pricing.unitPrice;
        existingItem.totalPrice = pricing.totalPrice;
        existingItem.discountedPrice = pricing.discountedPrice;
        existingItem.baseDiscountedPrice = newItem.baseDiscountedPrice || existingItem.baseDiscountedPrice || pricing.unitPrice;
        existingItem.price_tiers = effectiveTiers;
        existingItem.price = existingItem.price || newItem.price || pricing.unitPrice;
        if (typeof rawStock === 'number') {
          existingItem.available_inventory = rawStock;
        }
        if (!existingItem.color && (newItem.color || newItem.variant?.color)) {
          existingItem.color = newItem.color || newItem.variant?.color;
        }
        if (!existingItem.shadeName && newItem.shadeName) {
          existingItem.shadeName = newItem.shadeName;
        }
        if ((!existingItem.variantName || existingItem.variantName.startsWith('#')) && newItem.variantName && !newItem.variantName.startsWith('#')) {
          existingItem.variantName = newItem.variantName;
        }
      } else {
        let qty = newItem.quantity || 1;
        if (typeof rawStock === 'number' && rawStock > 0 && qty > rawStock) {
          qty = rawStock;
        }
        const pricing = resolveItemPricing({
          priceTiers: parsedPriceTiers,
          quantity: qty,
          baseMRP: newItem.price || 0,
          baseDiscountedPrice: newItem.baseDiscountedPrice || newItem.discountedPrice || 0,
          apiPrice: newItem.unitPrice,
          apiTotal: newItem.totalPrice,
          isVariant,
        });

        state.items.push({
          cartItemId: itemKey,
          productId: newItem.productId,
          name: newItem.name,
          brandName: newItem.brandName || '',
          image: newItem.image || null,
          variant: newItem.variant || null,
          variantName: newItem.variantName || null,
          shadeName: newItem.shadeName || null,
          color: newItem.color || newItem.variant?.color || null,
          unitPrice: pricing.unitPrice,
          totalPrice: pricing.totalPrice,
          quantity: qty,
          price: newItem.price || pricing.unitPrice,
          discountedPrice: pricing.discountedPrice,
          baseDiscountedPrice: newItem.baseDiscountedPrice || newItem.discountedPrice || pricing.unitPrice,
          price_tiers: parsedPriceTiers,
          available_inventory: rawStock,
        });
      }

      recalculateCartTotals(state);
    },

    removeFromCart: (state, action) => {
      const cartItemId = action.payload;
      state.items = state.items.filter((item) => item.cartItemId !== cartItemId);
      recalculateCartTotals(state);
    },

    updateQuantity: (state, action) => {
      const { cartItemId, quantity } = action.payload;
      const targetItem = state.items.find((item) => item.cartItemId === cartItemId);
      if (targetItem) {
        if (quantity <= 0) {
          state.items = state.items.filter((item) => item.cartItemId !== cartItemId);
        } else {
          let safeQty = quantity;
          const rawStock = typeof targetItem.available_inventory === 'number'
            ? targetItem.available_inventory
            : (typeof targetItem.base_available_inventory === 'number' ? targetItem.base_available_inventory : null);
          if (typeof rawStock === 'number' && rawStock > 0 && safeQty > rawStock) {
            safeQty = rawStock;
          }
          targetItem.quantity = safeQty;
          const isVariant = !!(targetItem.variant && targetItem.variant.sku);
          const pricing = resolveItemPricing({
            priceTiers: targetItem.price_tiers,
            quantity: safeQty,
            baseMRP: targetItem.price || 0,
            baseDiscountedPrice: targetItem.baseDiscountedPrice || targetItem.discountedPrice || targetItem.unitPrice || 0,
            isVariant,
          });
          targetItem.unitPrice = pricing.unitPrice;
          targetItem.totalPrice = pricing.totalPrice;
          targetItem.discountedPrice = pricing.discountedPrice;
        }
        recalculateCartTotals(state);
      }
    },

    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
      saveCartToStorage(state);
    },
    setCartData: (state, action) => {
      const payload = action.payload || {};
      const cartData = (payload.data && Array.isArray(payload.data.items)) ? payload.data : payload;
      if (cartData && Array.isArray(cartData.items)) {
        const apiItems = cartData.items.map(parseCartItemFromApi);

        state.items = apiItems;
        let qty = 0;
        let amount = 0;
        apiItems.forEach((i) => {
          qty += i.quantity;
          amount += i.totalPrice;
        });
        state.totalQuantity = qty;
        state.totalAmount = Math.round(amount);
        saveCartToStorage(state);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeCart.fulfilled, (state, action) => {
      if (action.payload) {
        state.items = action.payload.items || [];
        state.totalQuantity = action.payload.totalQuantity || 0;
        state.totalAmount = action.payload.totalAmount || 0;
        state.isInitialized = true;
      }
    });
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, setCartData } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartTotalQuantity = (state) => state.cart.totalQuantity;
export const selectCartTotalAmount = (state) => state.cart.totalAmount;

export default cartSlice.reducer;
