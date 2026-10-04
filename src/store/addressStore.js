import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserAddresses } from '../api/address';
import { getStoredUser } from '../api/authStorage';

const ADDRESS_STORAGE_KEY = '@shagun_selected_address';

export const useAddressStore = create(
  persist(
    (set, get) => ({
      addresses: [],
      selectedAddress: null,
      loading: false,

      setAddresses: (addresses) => {
        const addrList = Array.isArray(addresses) ? addresses : [];
        const currentSelected = get().selectedAddress;

        // Auto-select primary or first address if none selected or if selected is not in list
        let updatedSelected = currentSelected;
        if (!currentSelected || !addrList.some((a) => (a._id || a.id) === (currentSelected._id || currentSelected.id))) {
          const primary = addrList.find((a) => a.isPrimary || a.is_primary);
          updatedSelected = primary || addrList[0] || null;
        }

        set({
          addresses: addrList,
          selectedAddress: updatedSelected,
        });
      },

      setSelectedAddress: (address) => {
        set({ selectedAddress: address });
      },

      fetchAddresses: async () => {
        set({ loading: true });
        try {
          const user = await getStoredUser();
          const userId = user?.id || user?._id;
          if (userId) {
            const res = await getUserAddresses(userId);
            const addrList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            get().setAddresses(addrList);
          }
        } catch (err) {
          console.log('Error fetching addresses in Zustand store:', err);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: ADDRESS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ selectedAddress: state.selectedAddress }),
    }
  )
);
