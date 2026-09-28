import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserAddresses } from '../api/address';
import { getUser } from '../api/authStorage';

const ADDRESS_STORAGE_KEY = 'shagun_address_storage';

const saveAddressToStorage = async (state) => {
  try {
    await AsyncStorage.setItem(
      ADDRESS_STORAGE_KEY,
      JSON.stringify({
        addresses: state.addresses,
        selectedAddress: state.selectedAddress,
      })
    );
  } catch (e) {
    console.log('Failed to save address to storage', e);
  }
};

export const initializeAddresses = createAsyncThunk(
  'address/initializeAddresses',
  async () => {
    try {
      const stored = await AsyncStorage.getItem(ADDRESS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.log('Failed to load address from storage', e);
    }
    return null;
  }
);

export const fetchAddresses = createAsyncThunk(
  'address/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const user = await getUser();
      if (!user || !user.id) return [];
      const data = await getUserAddresses(user.id);
      
      const mapped = (data || []).map(addr => ({
        id: addr._id || addr.id,
        _id: addr._id || addr.id,
        name: addr.name,
        pincode: addr.pincode,
        addressText: `${addr.address}, ${addr.city}, ${addr.state}`,
        city: addr.city,
        state: addr.state,
        isPrimary: addr.isPrimary,
        mobile: addr.mobile,
        address: addr.address,
      }));
      return mapped;
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching addresses');
    }
  }
);

const initialState = {
  addresses: [],
  selectedAddress: null,
  loading: false,
  error: null,
  isInitialized: false,
};

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    setSelectedAddress: (state, action) => {
      state.selectedAddress = action.payload;
      saveAddressToStorage(state);
    },
    clearAddressesState: (state) => {
      state.addresses = [];
      state.selectedAddress = null;
      state.isInitialized = false;
      AsyncStorage.removeItem(ADDRESS_STORAGE_KEY).catch(() => {});
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAddresses.fulfilled, (state, action) => {
        if (action.payload) {
          state.addresses = action.payload.addresses || [];
          state.selectedAddress = action.payload.selectedAddress || null;
          state.isInitialized = true;
        }
      })
      .addCase(fetchAddresses.pending, (state) => {
        // Only show loading if we don't already have addresses in memory/cache
        if (!state.isInitialized && state.addresses.length === 0) {
          state.loading = true;
        }
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = action.payload || [];
        state.isInitialized = true;
        
        // Auto-select primary address if none selected or the currently selected one is no longer in the list
        if (action.payload && action.payload.length > 0) {
          const stillExists = state.selectedAddress 
            ? action.payload.find(a => (a.id === state.selectedAddress.id || a._id === state.selectedAddress.id || a.id === state.selectedAddress._id)) 
            : null;
          
          if (!stillExists) {
            const primary = action.payload.find(a => a.isPrimary) || action.payload[0];
            state.selectedAddress = primary;
          } else {
            // Update selectedAddress reference with fresh data
            state.selectedAddress = stillExists;
          }
        } else {
          state.selectedAddress = null;
        }
        saveAddressToStorage(state);
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setSelectedAddress, clearAddressesState } = addressSlice.actions;

export const selectAddresses = (state) => state.address.addresses;
export const selectSelectedAddress = (state) => state.address.selectedAddress;
export const selectAddressLoading = (state) => state.address.loading;
export const selectAddressInitialized = (state) => state.address.isInitialized;

export default addressSlice.reducer;
