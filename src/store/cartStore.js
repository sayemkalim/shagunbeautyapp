import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCart } from '../api/cart';
import { getToken } from '../api/authStorage';

const CART_STORAGE_KEY = 'shagun_cart_storage';

export const toNumber = (value) => {
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
      let totalP = rawTierPrice;

      if (mrp > 0 && rawTierPrice > mrp) {
        // If rawTierPrice is total pack price (e.g. 8712 for pack of 144)
        if (qty === matchedTier.quantity) {
          totalP = rawTierPrice;
          tierUnitPrice = rawTierPrice / qty;
        } else {
          tierUnitPrice = rawTierPrice / matchedTier.quantity;
          totalP = Math.round(tierUnitPrice * qty);
        }
      } else {
        tierUnitPrice = rawTierPrice;
        totalP = Math.round(rawTierPrice * qty);
      }

      // If backend API returned exact item total, respect it
      const numApiTotal = toNumber(apiTotal);
      if (numApiTotal > 0 && Math.abs(numApiTotal - totalP) <= 100) {
        totalP = numApiTotal;
      }

      const unitP = Math.round((totalP / qty) * 100) / 100;
      return {
        unitPrice: Math.round(unitP),
        exactUnitPrice: unitP,
        totalPrice: totalP,
        discountedPrice: Math.round(unitP),
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

export const extractImgUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string' && img.trim()) return img.trim();
  if (typeof img === 'object') {
    return img.url || img.secure_url || img.uri || img.path || img.image || img.src || img.imageUrl || img.imageUri || img.thumbnail || null;
  }
  return null;
};

export const extractCleanShadeName = (name) => {
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

export const parseCartItemFromApi = (item) => {
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
  const itemName = variantObj?.name || product.name || item.name || 'Product';

  // Image: variant image first, fallback to product images, fallback to item root images
  let vImage = null;
  if (variantObj) {
    if (Array.isArray(variantObj.images) && variantObj.images.length > 0) {
      vImage = extractImgUrl(variantObj.images[0]);
    }
    if (!vImage) {
      vImage = extractImgUrl(variantObj.image) || extractImgUrl(variantObj.banner_image) || extractImgUrl(variantObj.thumbnail) || extractImgUrl(variantObj.imageUrl) || extractImgUrl(variantObj.imageUri);
    }
  }

  let pImage = null;
  if (Array.isArray(product.images) && product.images.length > 0) {
    pImage = extractImgUrl(product.images[0]);
  }
  if (!pImage) {
    pImage = extractImgUrl(product.image) || extractImgUrl(product.banner_image) || extractImgUrl(product.thumbnail) || extractImgUrl(product.imageUrl) || extractImgUrl(product.imageUri);
  }

  let directItemImage = null;
  if (Array.isArray(item.images) && item.images.length > 0) {
    directItemImage = extractImgUrl(item.images[0]);
  }
  if (!directItemImage) {
    directItemImage = extractImgUrl(item.image) ||
      extractImgUrl(item.imageUrl) ||
      extractImgUrl(item.imageUri) ||
      extractImgUrl(item.thumbnail) ||
      extractImgUrl(item.banner_image) ||
      extractImgUrl(item.product_image) ||
      extractImgUrl(item.productImage);
  }

  const itemImage = vImage || pImage || directItemImage || null;

  // Extract clean shade name candidate
  const rawShadeCandidate =
    variantObj?.color_name ||
    variantObj?.colorName ||
    variantObj?.shade ||
    variantObj?.shade_name ||
    variantObj?.shadeName ||
    product.color_name ||
    product.colorName ||
    product.shade ||
    product.shade_name ||
    product.shadeName;

  const parsedShade =
    (typeof rawShadeCandidate === 'string' && !rawShadeCandidate.trim().startsWith('#') ? rawShadeCandidate.trim() : '') ||
    (variantObj?.name && extractCleanShadeName(variantObj.name)) ||
    '';

  // Option display name: e.g. "90 ml", "25 g", shade name, or variantObj.name
  let optName = null;
  if (item.variant_sku && variantObj) {
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
  } else if (item.variant_sku) {
    optName = item.variant_sku;
  } else {
    // Base product - check weight or title bracketed weight
    const baseWeight = product.weight_in_grams || product.weight;
    if (baseWeight) {
      const isMl = product.name && /ml/i.test(product.name);
      optName = `${baseWeight} ${isMl ? 'ml' : 'g'}`;
    } else {
      const weightMatch = (product.name || '').match(/\(\s*(\d+(?:\.\d+)?\s*(?:ml|l|ltr|g|gm|kg|pcs))\s*\)/i);
      if (weightMatch) {
        optName = weightMatch[1];
      } else if (parsedShade) {
        optName = parsedShade;
      }
    }
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
    variantObj?.attributes?.Color ||
    variantObj?.attributes?.Colour ||
    variantObj?.attributes?.['Color Code'] ||
    product.color ||
    null;

  if (rawColor && typeof rawColor === 'object') {
    rawColor = rawColor.hex || rawColor.code || rawColor.value || rawColor.color || rawColor.name;
  }
  const vColor = (typeof rawColor === 'string' && rawColor.trim() !== '') ? rawColor.trim() : null;
  const vColorName = variantObj?.color_name || variantObj?.colorName || product.color_name || product.colorName || parsedShade || null;

  return {
    cartItemId: `${pId}_${variantKey}`,
    productId: pId,
    name: itemName,
    brandName: product.brand?.name || (typeof product.brand === 'string' ? '' : ''),
    image: itemImage,
    variant: variantObj
      ? {
          ...variantObj,
          sku: item.variant_sku || variantObj.sku,
          color: vColor || variantObj.color,
          color_name: variantObj.color_name || variantObj.colorName || vColorName,
          available_inventory: typeof variantObj.available_inventory === 'number'
            ? variantObj.available_inventory
            : (typeof item.available_inventory === 'number' ? item.available_inventory : null),
        }
      : (item.variant_sku
          ? {
              sku: item.variant_sku,
              color: vColor,
              color_name: vColorName,
              available_inventory: typeof item.available_inventory === 'number' ? item.available_inventory : null,
            }
          : null),
    variantName: optName,
    shadeName: parsedShade || null,
    color_name: vColorName,
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

export const mapBackendItemToCartItem = parseCartItemFromApi;

export const recalculateCartTotals = (items) => {
  let qty = 0;
  let amount = 0;

  const updatedItems = (items || []).map((item) => {
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

    qty += itemQty;
    amount += pricing.totalPrice;

    return {
      ...item,
      quantity: itemQty,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.totalPrice,
      discountedPrice: pricing.discountedPrice,
    };
  });

  return {
    items: updatedItems,
    totalQuantity: qty,
    totalAmount: Math.round(amount),
  };
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      totalQuantity: 0,
      totalAmount: 0,
      isInitialized: false,

      addToCart: (newItem) => {
        if (!newItem) return;
        const currentItems = get().items || [];
        const variantKey = newItem.variant?.sku || newItem.variant?._id || newItem.variantId || 'base';
        const itemKey = `${newItem.productId}_${variantKey}`;

        const rawTiers = newItem.price_tiers ||
          newItem.variant?.price_tiers ||
          newItem.variant?.priceTiers ||
          newItem.product?.price_tiers ||
          newItem.product?.priceTiers;
        const parsedPriceTiers = parsePriceTiers(rawTiers);
        const isVariant = !!(newItem.variant && (newItem.variant.sku || newItem.variant._id));

        const rawStock = (newItem.variant && typeof newItem.variant.available_inventory === 'number')
          ? newItem.variant.available_inventory
          : (typeof newItem.available_inventory === 'number'
            ? newItem.available_inventory
            : (typeof newItem.base_available_inventory === 'number' ? newItem.base_available_inventory : null));

        const existingIndex = currentItems.findIndex((item) => item.cartItemId === itemKey);
        let newItems = [...currentItems];

        if (existingIndex >= 0) {
          const existingItem = currentItems[existingIndex];
          let updatedQty = newItem.isSetQuantity ? (newItem.quantity || 1) : ((existingItem.quantity || 0) + (newItem.quantity || 1));
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

          newItems[existingIndex] = {
            ...existingItem,
            ...newItem,
            quantity: updatedQty,
            unitPrice: pricing.unitPrice,
            totalPrice: pricing.totalPrice,
            discountedPrice: pricing.discountedPrice,
            baseDiscountedPrice: newItem.baseDiscountedPrice || existingItem.baseDiscountedPrice || pricing.unitPrice,
            price_tiers: effectiveTiers,
            price: existingItem.price || newItem.price || pricing.unitPrice,
            image: newItem.image || existingItem.image,
            available_inventory: typeof rawStock === 'number' ? rawStock : existingItem.available_inventory,
            color: newItem.color || newItem.variant?.color || existingItem.color,
            shadeName: newItem.shadeName || existingItem.shadeName,
            variantName: (!existingItem.variantName || existingItem.variantName.startsWith('#')) && newItem.variantName && !newItem.variantName.startsWith('#')
              ? newItem.variantName
              : (existingItem.variantName || newItem.variantName),
          };
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

          newItems.push({
            cartItemId: itemKey,
            productId: newItem.productId,
            name: newItem.name,
            brandName: newItem.brandName || '',
            image: newItem.image || null,
            variant: newItem.variant
              ? { ...newItem.variant, available_inventory: rawStock ?? newItem.variant.available_inventory ?? null }
              : null,
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

        const recalculated = recalculateCartTotals(newItems);
        set(recalculated);
      },

      updateQuantity: ({ cartItemId, quantity }) => {
        const currentItems = get().items || [];
        const targetItem = currentItems.find((item) => item.cartItemId === cartItemId);
        if (!targetItem) return;

        if (quantity <= 0) {
          const newItems = currentItems.filter((item) => item.cartItemId !== cartItemId);
          set(recalculateCartTotals(newItems));
          return;
        }

        let safeQty = quantity;
        const rawStock = typeof targetItem.available_inventory === 'number'
          ? targetItem.available_inventory
          : (typeof targetItem.base_available_inventory === 'number' ? targetItem.base_available_inventory : null);
        if (typeof rawStock === 'number' && rawStock > 0 && safeQty > rawStock) {
          safeQty = rawStock;
        }

        const isVariant = !!(targetItem.variant && targetItem.variant.sku);
        const pricing = resolveItemPricing({
          priceTiers: targetItem.price_tiers,
          quantity: safeQty,
          baseMRP: targetItem.price || 0,
          baseDiscountedPrice: targetItem.baseDiscountedPrice || targetItem.discountedPrice || targetItem.unitPrice || 0,
          isVariant,
        });

        const newItems = currentItems.map((item) => {
          if (item.cartItemId === cartItemId) {
            return {
              ...item,
              quantity: safeQty,
              unitPrice: pricing.unitPrice,
              totalPrice: pricing.totalPrice,
              discountedPrice: pricing.discountedPrice,
            };
          }
          return item;
        });

        set(recalculateCartTotals(newItems));
      },

      removeFromCart: (cartItemId) => {
        const currentItems = get().items || [];
        const newItems = currentItems.filter((item) => item.cartItemId !== cartItemId);
        set(recalculateCartTotals(newItems));
      },

      clearCart: () => {
        set({
          items: [],
          totalQuantity: 0,
          totalAmount: 0,
        });
      },

      setCartData: (payload) => {
        if (!payload) return;
        const cartData = (payload.data && Array.isArray(payload.data.items)) ? payload.data : payload;
        if (!cartData || !Array.isArray(cartData.items)) return;

        const currentItems = get().items || [];
        const existingMap = new Map();
        currentItems.forEach((it) => {
          if (it.cartItemId) existingMap.set(it.cartItemId, it);
          if (it.productId) existingMap.set(`${it.productId}_${it.variant?.sku || 'base'}`, it);
          if (it.productId) existingMap.set(String(it.productId), it);
        });

        const apiItems = cartData.items.map((rawItem) => {
          const parsed = parseCartItemFromApi(rawItem);
          const existing =
            existingMap.get(parsed.cartItemId) ||
            existingMap.get(`${parsed.productId}_${parsed.variant?.sku || 'base'}`) ||
            existingMap.get(String(parsed.productId));

          if (existing) {
            if (!parsed.image && existing.image) {
              parsed.image = existing.image;
            }
            if (!parsed.brandName && existing.brandName) {
              parsed.brandName = existing.brandName;
            }
            if ((!parsed.name || parsed.name === 'Product') && existing.name && existing.name !== 'Product') {
              parsed.name = existing.name;
            }
            if (!parsed.shadeName && existing.shadeName) {
              parsed.shadeName = existing.shadeName;
            }
            if (!parsed.color && existing.color) {
              parsed.color = existing.color;
            }
            if ((!parsed.variantName || parsed.variantName.startsWith('#')) && existing.variantName && !existing.variantName.startsWith('#')) {
              parsed.variantName = existing.variantName;
            }
          }
          return parsed;
        });

        let qty = 0;
        let amount = 0;
        apiItems.forEach((i) => {
          qty += i.quantity;
          amount += i.totalPrice;
        });

        const finalTotal = (typeof cartData.final_total === 'number' && cartData.final_total > 0)
          ? Math.round(cartData.final_total)
          : ((typeof cartData.final_price === 'number' && cartData.final_price > 0)
            ? Math.round(cartData.final_price)
            : ((typeof cartData.total_price === 'number' && cartData.total_price > 0)
              ? Math.round(cartData.total_price)
              : Math.round(amount)));

        set({
          items: apiItems,
          totalQuantity: qty,
          totalAmount: finalTotal,
        });
      },

      initializeCart: async () => {
        try {
          const token = await getToken();
          if (token) {
            const res = await getCart();
            const cartData = res?.data?.data || res?.data || res || {};
            if (Array.isArray(cartData?.items)) {
              get().setCartData(cartData);
              set({ isInitialized: true });
              return;
            }
          }
        } catch (e) {
          console.log('Cart API fetch fallback to local storage', e);
        }
        set({ isInitialized: true });
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        totalQuantity: state.totalQuantity,
        totalAmount: state.totalAmount,
      }),
    }
  )
);

// Backward-compatible selector helpers
export const selectCartItems = (state) => state.items;
export const selectCartTotalQuantity = (state) => state.totalQuantity;
export const selectCartTotalAmount = (state) => state.totalAmount;

// Action wrappers for non-hook callers
export const addToCart = (item) => useCartStore.getState().addToCart(item);
export const removeFromCart = (id) => useCartStore.getState().removeFromCart(id);
export const updateQuantity = (payload) => useCartStore.getState().updateQuantity(payload);
export const clearCart = () => useCartStore.getState().clearCart();
export const setCartData = (data) => useCartStore.getState().setCartData(data);
export const initializeCart = () => useCartStore.getState().initializeCart();
