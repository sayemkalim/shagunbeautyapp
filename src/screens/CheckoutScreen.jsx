import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, X, MapPin, CheckCircle2, PlusCircle } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartItems } from '../redux/cartSlice';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import BottomSheetModal from '../components/BottomSheetModal';
import { AddressCardSkeleton } from '../components/Skeleton';
import { getUserAddresses } from '../api/address';
import { getUser } from '../api/authStorage';
import { moderateScale } from '../theme/responsive';

const DUMMY_IMG = require('../../assets/dummy_product.png');

export default function CheckoutScreen({ navigation, route }) {
  const cartItems = useSelector(selectCartItems);

  // States for Address selection
  const [selectedAddr, setSelectedAddr] = useState(route.params?.selectedAddress);
  const [addressesList, setAddressesList] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Load addresses on focus
  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const currentUser = await getUser();
      if (!currentUser) return;
      const data = await getUserAddresses(currentUser.id);
      
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
      }));
      
      setAddressesList(mapped);

      // Refresh selected address using functional state setter to avoid hook dependency loop
      setSelectedAddr(prev => {
        if (mapped.length > 0) {
          if (!prev || !mapped.find(a => a.id === prev.id)) {
            const primary = mapped.find(a => a.isPrimary) || mapped[0];
            return primary;
          } else {
            const freshSelected = mapped.find(a => a.id === prev.id);
            return freshSelected;
          }
        }
        return null;
      });
    } catch (error) {
      console.log('Error fetching addresses in Checkout:', error);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  // Generate delivery date string offset from today
  const getDeliveryDateStr = (daysOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const getDeliveryMonthRangeStr = (startOffset, endOffset) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + startOffset);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + endOffset);

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const month = startDate.toLocaleDateString('en-GB', { month: 'short' });
    
    return `${startDay} ${month} - ${endDay} ${month}`;
  };

  // Generate estimates list for items
  const estimates = useMemo(() => {
    return cartItems.map((item) => {
      const text = `Delivery between ${getDeliveryMonthRangeStr(2, 7)}`;
      return {
        ...item,
        estimateText: text,
      };
    });
  }, [cartItems]);

  const handleContinue = () => {
    if (!selectedAddr) {
      Alert.alert('No Address Selected', 'Please select a delivery address to place your order.');
      return;
    }
    // Navigate to Payment Options Screen
    navigation.navigate('Payment', {
      addressId: selectedAddr._id || selectedAddr.id,
      address: selectedAddr,
      couponCode: route.params?.couponCode,
      totalAmount: route.params?.totalAmount,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
        {/* Address Card */}
        {selectedAddr ? (
          <View style={styles.addressCard}>
            <View style={styles.addressLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{selectedAddr.name}</Text>
                {selectedAddr.isPrimary && (
                  <Text style={styles.defaultLabel}>(Default)</Text>
                )}
                {/* <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>HOME</Text>
                </View> */}
              </View>
              <Text style={styles.addressText}>{selectedAddr.addressText}</Text>
              <Text style={styles.mobileText}>Mobile: {selectedAddr.mobile}</Text>
            </View>

            <TouchableOpacity
              style={styles.changeButton}
              activeOpacity={0.7}
              onPress={() => setShowAddressModal(true)}>
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noAddressCard}>
            <Text style={styles.noAddressText}>No Delivery Address Selected</Text>
            <TouchableOpacity
              style={styles.selectAddressBtn}
              activeOpacity={0.7}
              onPress={() => setShowAddressModal(true)}>
              <Text style={styles.selectAddressBtnText}>Select Address</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delivery Estimates Divider */}
        <View style={styles.estimatesDivider}>
          <Text style={styles.estimatesTitle}>DELIVERY ESTIMATES</Text>
        </View>

        {/* Estimates List */}
        <View style={styles.estimatesList}>
          {estimates.map((item, index) => (
            <View key={item.cartItemId || index} style={styles.estimateItem}>
              <Image
                source={item.image ? { uri: item.image } : DUMMY_IMG}
                style={styles.itemImage}
                resizeMode="contain"
              />
              <View style={styles.estimateTextContainer}>
                <Text style={styles.estimateText}>{item.estimateText}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Continue button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={handleContinue}>
          <Text style={styles.continueBtnText}>CONTINUE</Text>
        </TouchableOpacity>
      </View>

      {/* ── Address Selector Bottom Sheet Modal (Synced with CartScreen) ── */}
      <BottomSheetModal
        visible={showAddressModal}
        showHandle={true}
        onClose={() => setShowAddressModal(false)}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select Delivery Location</Text>
          <TouchableOpacity onPress={() => setShowAddressModal(false)}>
            <X size={22} color="#1E1B4B" />
          </TouchableOpacity>
        </View>

        {/* Saved Addresses List */}
        {loadingAddresses ? (
          <View>
            <AddressCardSkeleton />
            <AddressCardSkeleton />
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {addressesList.length === 0 ? (
              <View style={styles.noAddressItem}>
                <Text style={styles.noAddressItemText}>No addresses saved yet.</Text>
              </View>
            ) : (
              addressesList.map((addr) => {
                const isSel = selectedAddr?.id === addr.id;
                if (isSel) {
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.activeAddressContainer}
                      activeOpacity={0.9}
                      onPress={() => setSelectedAddr(null)}>
                      <View style={styles.activeAddressHeader}>
                        <View style={styles.activeAddressTitleRow}>
                          <MapPin size={16} color="#0F172A" style={{ marginRight: 6 }} />
                          <Text style={styles.activeAddressTitleText}>
                            {addr.name}, {addr.pincode}
                          </Text>
                        </View>
                        <View style={styles.redCheckCircle}>
                          <CheckCircle2 size={18} color="#FFFFFF" fill={colors.primary} />
                        </View>
                      </View>
                      
                      <Text style={styles.activeAddressDetailText}>
                        {addr.addressText}
                      </Text>
                      
                      <Text style={styles.activeAddressMobText}>
                        Mob: {addr.mobile || 'N/A'}
                      </Text>
 
                      <View style={styles.activeAddressButtonsRow}>
                        <TouchableOpacity
                          style={styles.editAddressTextBtn}
                          onPress={() => {
                            setShowAddressModal(false);
                            navigation.navigate('Address', { editAddress: addr });
                          }}
                          activeOpacity={0.7}>
                          <Text style={styles.editAddressTextBtnText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.simplifiedAddressCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedAddr(addr);
                        setShowAddressModal(false);
                      }}>
                      <View style={styles.simplifiedAddressRow}>
                        <Text style={styles.simplifiedAddressText} numberOfLines={2}>
                          {addr.name} ({addr.pincode}) - {addr.addressText}
                        </Text>
                        <View style={styles.simplifiedRadioCircle}>
                          <View style={styles.simplifiedRadioInnerCircle} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }
              })
            )}
          </ScrollView>
        )}

        {/* Bottom Add Address Button */}
        <TouchableOpacity
          style={styles.addNewAddressOutlineBtn}
          onPress={() => {
            setShowAddressModal(false);
            navigation.navigate('Address', { openAdd: true });
          }}
          activeOpacity={0.8}>
          <PlusCircle size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.addNewAddressOutlineBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F3',
  },
  addressLeft: {
    flex: 1,
    paddingRight: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1E293B',
    marginRight: 6,
  },
  defaultLabel: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginRight: 6,
  },
  tagBadge: {
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagBadgeText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    color: '#10B981',
  },
  addressText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: moderateScale(18),
    marginBottom: 6,
  },
  mobileText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1E293B',
  },
  changeButton: {
    paddingVertical: 4,
  },
  changeButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  noAddressCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAddressText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginBottom: 12,
  },
  selectAddressBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  selectAddressBtnText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  estimatesDivider: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  estimatesTitle: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  estimatesList: {
    backgroundColor: '#FFFFFF',
  },
  estimateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F3',
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    marginRight: 16,
  },
  estimateTextContainer: {
    flex: 1,
  },
  estimateText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#1E293B',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  continueBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  activeAddressContainer: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  activeAddressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeAddressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  activeAddressTitleText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  redCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAddressDetailText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#1E293B',
    lineHeight: moderateScale(18),
    marginBottom: 4,
  },
  activeAddressMobText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 12,
  },
  activeAddressButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editAddressTextBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  editAddressTextBtnText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  simplifiedAddressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  simplifiedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  simplifiedAddressText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#1E293B',
    flex: 1,
    lineHeight: moderateScale(18),
  },
  simplifiedRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simplifiedRadioInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  addNewAddressOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  addNewAddressOutlineBtnText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  noAddressItem: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noAddressItemText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
  },
});
