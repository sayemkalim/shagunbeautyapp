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
      if (res?.data?.items) {
        const apiItems = res.data.items.map((item) => {
          const product = item.product || {};
          const pId = typeof product === 'string' ? product : product._id;
          const variantKey = item.variant_sku || 'base';
          const productPrice = toNumber(product.price);
          const productDiscountedPrice = toNumber(product.discounted_price);
          const uPrice = toNumber(item.price) || productDiscountedPrice || productPrice || 0;
          const qty = item.quantity || 1;
          const tPrice = toNumber(item.total) || Math.round(uPrice * qty) || 0;
          const bPrice = productPrice || toNumber(item.price) || uPrice;

          return {
            cartItemId: `${pId}_${variantKey}`,
            productId: pId,
            name: product.name || 'Product',
            brandName: product.brand?.name || '',
            image: product.banner_image || (product.images && product.images[0]) || null,
            variant: item.variant_sku ? { sku: item.variant_sku } : null,
            variantName: item.variant_sku || null,
            unitPrice: uPrice,
            totalPrice: tPrice,
            quantity: qty,
            price: bPrice,
            discountedPrice: productDiscountedPrice || uPrice,
            price_tiers: parsePriceTiers(product.price_tiers || product.priceTiers),
          };
        });

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
      } else {
        state.items.push({
          cartItemId: itemKey,
          productId: newItem.productId,
          name: newItem.name,
          brandName: newItem.brandName || '',
          image: newItem.image || null,
          variant: newItem.variant || null,
          variantName: newItem.variantName || null,
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
      const cartData = action.payload || {};
      if (cartData && Array.isArray(cartData.items)) {
        const apiItems = cartData.items.map((item) => {
          const product = item.product || {};
          const pId = typeof product === 'string' ? product : product._id;
          const variantKey = item.variant_sku || 'base';
          const productPrice = toNumber(product.price);
          const productDiscountedPrice = toNumber(product.discounted_price);
          const uPrice = toNumber(item.price) || productDiscountedPrice || productPrice || 0;
          const qty = item.quantity || 1;
          const tPrice = toNumber(item.total) || Math.round(uPrice * qty) || 0;
          const bPrice = productPrice || toNumber(item.price) || uPrice;

          return {
            cartItemId: `${pId}_${variantKey}`,
            productId: pId,
            name: product.name || 'Product',
            brandName: product.brand?.name || '',
            image: product.banner_image || (product.images && product.images[0]) || null,
            variant: item.variant_sku ? { sku: item.variant_sku } : null,
            variantName: item.variant_sku || null,
            unitPrice: uPrice,
            totalPrice: tPrice,
            quantity: qty,
            price: bPrice,
            discountedPrice: productDiscountedPrice || uPrice,
            price_tiers: parsePriceTiers(product.price_tiers || product.priceTiers),
          };
        });

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
