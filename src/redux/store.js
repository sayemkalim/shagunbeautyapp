import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';
import addressReducer from './addressSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    address: addressReducer,
  },
});
