import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getUserAddresses } from '../api/address';
import { getUser } from '../api/authStorage';

export const fetchAddresses = createAsyncThunk(
  'address/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const user = await getUser();
      if (!user || !user.id) return [];
      const data = await getUserAddresses(user.id);
      
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
    },
    clearAddressesState: (state) => {
      state.addresses = [];
      state.selectedAddress = null;
      state.isInitialized = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = action.payload || [];
        state.isInitialized = true;
        
        // Auto-select primary address if none selected or the currently selected one is no longer in the list
        if (action.payload && action.payload.length > 0) {
          const stillExists = state.selectedAddress 
            ? action.payload.find(a => a.id === state.selectedAddress.id) 
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
