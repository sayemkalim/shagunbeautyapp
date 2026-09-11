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

const parsePriceTiers = (raw) => {
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

const recalculateCartTotals = (state) => {
  let qty = 0;
  let amount = 0;
  state.items.forEach((item) => {
    const itemQty = item.quantity || 1;
    const uPrice = item.unitPrice || item.discountedPrice || item.price || 0;
    const itemTot = (typeof item.totalPrice === 'number' && item.totalPrice > 0)
      ? item.totalPrice
      : Math.round(uPrice * itemQty);

    item.quantity = itemQty;
    item.unitPrice = uPrice;
    item.totalPrice = itemTot;

    qty += itemQty;
    amount += itemTot;
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

  // Live unit price: prioritize the live resolved discounted price so any price change immediately reflects!
  const uPrice = resolvedDiscountedPrice > 0 ? resolvedDiscountedPrice : (toNumber(item.price) || resolvedMRP || 0);
  const qty = item.quantity || 1;
  const tPrice = Math.round(uPrice * qty);
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

  // Option display name: e.g. "90 ml", color, or variantObj.name
  let optName = null;
  if (item.variant_sku) {
    if (variantObj) {
      if (variantObj.weight_in_grams) {
        const isMl = (variantObj.name && /ml/i.test(variantObj.name)) || (product.name && /ml/i.test(product.name));
        optName = `${variantObj.weight_in_grams} ${isMl ? 'ml' : 'g'}`;
      } else if (variantObj.color) {
        optName = typeof variantObj.color === 'string' ? variantObj.color : (variantObj.color?.name || variantObj.color?.hex);
      } else if (variantObj.name && variantObj.name !== product.name) {
        optName = variantObj.name;
      } else {
        optName = variantObj.sku || item.variant_sku;
      }
    } else {
      optName = item.variant_sku;
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
    color: vColor,
    unitPrice: uPrice,
    totalPrice: tPrice,
    quantity: qty,
    price: bPrice,
    discountedPrice: resolvedDiscountedPrice || uPrice,
    price_tiers: parsePriceTiers(product.price_tiers || product.priceTiers),
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

      const uPrice = newItem.unitPrice || newItem.discountedPrice || newItem.price || 0;
      const qty = newItem.quantity || 1;
      const tPrice = newItem.totalPrice || Math.round(uPrice * qty);

      const existingIndex = state.items.findIndex((item) => item.cartItemId === itemKey);

      if (existingIndex >= 0) {
        const existingItem = state.items[existingIndex];
        const updatedQty = existingItem.quantity + qty;
        existingItem.quantity = updatedQty;
        existingItem.unitPrice = existingItem.unitPrice || uPrice;
        existingItem.totalPrice = Math.round(existingItem.unitPrice * updatedQty);
        existingItem.price = existingItem.price || newItem.price || uPrice;
        existingItem.discountedPrice = existingItem.discountedPrice || newItem.discountedPrice || uPrice;
        if (!existingItem.color && (newItem.color || newItem.variant?.color)) {
          existingItem.color = newItem.color || newItem.variant?.color;
        }
      } else {
        state.items.push({
          cartItemId: itemKey,
          productId: newItem.productId,
          name: newItem.name,
          brandName: newItem.brandName || '',
          image: newItem.image || null,
          variant: newItem.variant || null,
          variantName: newItem.variantName || null,
          color: newItem.color || newItem.variant?.color || null,
          unitPrice: uPrice,
          totalPrice: tPrice,
          quantity: qty,
          price: newItem.price || uPrice,
          discountedPrice: newItem.discountedPrice || uPrice,
          price_tiers: newItem.price_tiers ? parsePriceTiers(newItem.price_tiers) : null,
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
          targetItem.quantity = quantity;
          targetItem.totalPrice = Math.round(targetItem.unitPrice * quantity);
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
