import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { getUser } from '../api/authStorage';
import { getUserAddresses } from '../api/address';
import {
  ChevronLeft,
  ChevronDown,
  X,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Handbag,
  Percent,
  Minus,
  Plus,
  Trash2,
  MapPin,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react-native';

import {
  selectCartItems,
  selectCartTotalAmount,
  selectCartTotalQuantity,
  removeFromCart,
  updateQuantity,
  clearCart,
} from '../redux/cartSlice';
import { removeFromCartApi } from '../api/cart';
import BottomSheetModal from '../components/BottomSheetModal';
import colors from '../theme/colors';
import fonts from '../theme/typography';

const { width, height } = Dimensions.get('window');
const DUMMY_IMG = require('../../assets/dummy_product.png');

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const totalAmount = useSelector(selectCartTotalAmount);
  const totalQuantity = useSelector(selectCartTotalQuantity);

  // Checked item IDs for selection
  const [selectedItemIds, setSelectedItemIds] = useState(() =>
    cartItems.map((item) => item.cartItemId)
  );

  // Quantity Modal state for cart item editing
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const qtyScrollRef = useRef(null);

  useEffect(() => {
    if (editingCartItem) {
      const idx = (tempQuantity || 1) - 1;
      const scrollX = Math.max(0, idx * 78 - 80);
      const timer = setTimeout(() => {
        qtyScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCartItem]);

  // Address Selection state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressesList, setAddressesList] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadAddresses = async () => {
        try {
          setLoadingAddresses(true);
          const currentUser = await getUser();
          if (!currentUser) return;
          const data = await getUserAddresses(currentUser.id);
          if (isMounted) {
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
            // Default select primary or the first one if not set
            if (mapped.length > 0) {
              const primary = mapped.find(a => a.isPrimary) || mapped[0];
              setSelectedAddress(primary);
            } else {
              setSelectedAddress(null);
            }
          }
        } catch (error) {
          console.log('Error fetching addresses in Cart:', error);
          if (isMounted) {
            setAddressesList([]);
            setSelectedAddress(null);
          }
        } finally {
          if (isMounted) {
            setLoadingAddresses(false);
          }
        }
      };

      loadAddresses();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Modal state for removing item ("Move from Bag")
  const [removingCartItem, setRemovingCartItem] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleConfirmRemove = async (item, moveToWishlist = false) => {
    if (!item) return;
    try {
      setIsRemoving(true);
      // Backend API call to remove item from user cart (quantity: 0)
      await removeFromCartApi({
        type: 'product',
        productId: item.productId,
        variantSku: item.variant?.sku,
      });
    } catch (err) {
      // Non-blocking fallback for offline/guest scenario
    } finally {
      dispatch(removeFromCart(item.cartItemId));
      setIsRemoving(false);
      setRemovingCartItem(null);
    }
  };

  // Sync selected IDs if new item added
  useMemo(() => {
    setSelectedItemIds((prev) => {
      const allKeys = cartItems.map((item) => item.cartItemId);
      // Keep previous selected if still present, plus add new ones
      return allKeys;
    });
  }, [cartItems]);

  const toggleSelectItem = (cartItemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(cartItemId)
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === cartItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(cartItems.map((item) => item.cartItemId));
    }
  };

  // Filter selected items for checkout
  const selectedCartItems = useMemo(() => {
    return cartItems.filter((item) => selectedItemIds.includes(item.cartItemId));
  }, [cartItems, selectedItemIds]);

  // Financial calculations
  const { totalMRP, totalSellingPrice, totalSavings } = useMemo(() => {
    let mrp = 0;
    let selling = 0;
    selectedCartItems.forEach((item) => {
      const basePrice = item.price > 0 ? item.price : item.unitPrice;
      mrp += basePrice * item.quantity;
      selling += item.totalPrice;
    });
    const savings = mrp > selling ? mrp - selling : 0;
    return {
      totalMRP: Math.round(mrp),
      totalSellingPrice: Math.round(selling),
      totalSavings: Math.round(savings),
    };
  }, [selectedCartItems]);

  const handleUpdateQty = (cartItemId, newQty) => {
    dispatch(updateQuantity({ cartItemId, quantity: newQty }));
    setEditingCartItem(null);
  };

  const handleRemove = (cartItemId) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item from your bag?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => dispatch(removeFromCart(cartItemId)),
      },
    ]);
  };

  const handlePlaceOrder = () => {
    if (selectedCartItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to place an order.');
      return;
    }
    navigation.navigate('Checkout', {
      selectedAddress,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Address Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => navigation?.goBack?.()}>
            <ChevronLeft size={24} color="#1A1C1E" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addressContainer}
            activeOpacity={0.8}
            onPress={() => setShowAddressModal(true)}>
            {selectedAddress ? (
              <>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.deliverToLabel}>Deliver to:</Text>
                  <Text style={styles.userNameText}>
                    {selectedAddress.name} ({selectedAddress.pincode})
                  </Text>
                  <ChevronDown size={14} color="#1A1C1E" />
                </View>
                <Text style={styles.addressSubText} numberOfLines={1}>
                  {selectedAddress.addressText}
                </Text>
              </>
            ) : (
              <View style={styles.addressTitleRow}>
                <Text style={[styles.deliverToLabel, { color: '#EF4444' }]}>
                  Select Delivery Address
                </Text>
                <ChevronDown size={14} color="#EF4444" style={{ marginLeft: 4 }} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* ── Top Nav Tab ── */}
      <View style={styles.navTabsRow}>
        <View style={[styles.navTabPill, styles.navTabPillActive]}>
          <Text style={[styles.navTabText, styles.navTabTextActive]}>
            Items
          </Text>
        </View>
      </View>

      {cartItems.length === 0 ? (
        /* ── Empty Cart View ── */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Handbag size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your Bag is Empty</Text>
          <Text style={styles.emptySubText}>
            Looks like you haven't added any products to your bag yet.
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopNowBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>

          {/* ── Select All Row ── */}
          <View style={styles.selectAllRow}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              activeOpacity={0.8}
              onPress={toggleSelectAll}>
              <View
                style={[
                  styles.checkbox,
                  selectedItemIds.length === cartItems.length && styles.checkboxActive,
                ]}>
                {selectedItemIds.length === cartItems.length && (
                  <Check size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.selectAllText}>
                Select All ({selectedItemIds.length}/{cartItems.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={() => dispatch(clearCart())}>
              <Text style={styles.clearAllText}>Clear Bag</Text>
            </TouchableOpacity>
          </View>

          {/* ── Cart Item Cards ── */}
          {cartItems.map((item) => {
            const isChecked = selectedItemIds.includes(item.cartItemId);
            
            const displayPrice = (typeof item.totalPrice === 'number' && item.totalPrice > 0)
              ? item.totalPrice
              : Math.round(((item.discountedPrice || item.price || item.unitPrice || 0) * (item.quantity || 1)));

            const basePrice = (typeof item.price === 'number' && item.price > 0)
              ? item.price
              : (item.unitPrice || (displayPrice / (item.quantity || 1)));

            const discountAmount =
              basePrice * item.quantity > displayPrice
                ? Math.round(basePrice * item.quantity - displayPrice)
                : 0;

            return (
              <View key={item.cartItemId} style={styles.cartCard}>
                {/* Remove Trash Button */}
                <TouchableOpacity
                  style={styles.cardCloseBtn}
                  activeOpacity={0.7}
                  onPress={() => setRemovingCartItem(item)}>
                  <Trash2 size={18} color="#64748B" />
                </TouchableOpacity>

                <View style={styles.cartCardMain}>
                  {/* Item Selection Checkbox */}
                  <TouchableOpacity
                    style={styles.itemCheckboxTouch}
                    activeOpacity={0.8}
                    onPress={() => toggleSelectItem(item.cartItemId)}>
                    <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                      {isChecked && <Check size={12} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>

                  {/* Product Image Thumbnail - Opens Product Detail */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('ProductDetail', { productId: item.productId })
                    }>
                    <Image
                      source={item.image ? { uri: item.image } : DUMMY_IMG}
                      style={styles.cartItemImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>

                  {/* Product Details Right */}
                  <View style={styles.cartItemRight}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate('ProductDetail', { productId: item.productId })
                      }>
                      {item.brandName ? (
                        <Text style={styles.itemBrandName}>{item.brandName}</Text>
                      ) : null}
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>

                    {/* Option / Variant & Quantity Dropdown Pills */}
                    <View style={styles.pillsRow}>
                      {item.variantName ? (
                        <View style={styles.dropdownPill}>
                          <Text style={styles.dropdownPillText}>
                            Option: {item.variantName}
                          </Text>
                        </View>
                      ) : null}

                      {/* Beautiful Quantity Stepper (+ / -) */}
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.quantity <= 1) {
                              setRemovingCartItem(item);
                            } else {
                              handleUpdateQty(item.cartItemId, item.quantity - 1);
                            }
                          }}>
                          <Minus size={13} color={colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.stepperValueBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            setEditingCartItem(item);
                            setTempQuantity(item.quantity);
                          }}>
                          <Text style={styles.stepperValueText}>Qty: {item.quantity}</Text>
                          <ChevronDown size={11} color={colors.primary} style={{ marginLeft: 2 }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.quantity < 10) {
                              handleUpdateQty(item.cartItemId, item.quantity + 1);
                            }
                          }}>
                          <Plus
                            size={13}
                            color={item.quantity >= 10 ? '#CBD5E1' : colors.primary}
                            strokeWidth={2.5}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Price Row */}
                    <View style={styles.cardPriceRow}>
                      <Text style={styles.itemFinalPrice}>₹{displayPrice}</Text>
                      {discountAmount > 0 ? (
                        <>
                          <Text style={styles.itemMRPPrice}>
                            ₹{basePrice * item.quantity}
                          </Text>
                          <Text style={styles.itemDiscountOff}>
                            ₹{discountAmount} Off
                          </Text>
                        </>
                      ) : null}
                    </View>

                    {/* Delivery Service Line */}
                    {/* <View style={styles.itemDeliveryLine}>
                      <Truck size={14} color="#2d6a4f" />
                      <Text style={styles.itemDeliveryText}>
                        Fast Delivery Nationwide
                      </Text>
                    </View> */}
                  </View>
                </View>
              </View>
            );
          })}

          {/* ── Price Details Summary Card (Matching User Screenshot 2) ── */}
          <View style={styles.priceDetailsCard}>
            <Text style={styles.priceDetailsHeaderTitle}>Price Details</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelText}>Total MRP</Text>
              <Text style={styles.summaryValueText}>₹{totalMRP}</Text>
            </View>

            {totalSavings > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>Discount on MRP</Text>
                <Text style={styles.summaryDiscountText}>- ₹{totalSavings}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelText}>Shipping / Platform Fee</Text>
              <Text style={styles.summaryFreeText}>FREE</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total Amount</Text>
              <Text style={styles.summaryTotalValue}>₹{totalSellingPrice}</Text>
            </View>

            {totalSavings > 0 && (
              <View style={styles.savingsBannerPill}>
                <View style={styles.savingsIconCircle}>
                  <Percent size={13} color="#FFFFFF" strokeWidth={3} />
                </View>
                <Text style={styles.savingsBannerText}>
                  You're saving{' '}
                  <Text style={styles.savingsUnderlineAmount}>
                    ₹{totalSavings.toLocaleString('en-IN')}
                  </Text>{' '}
                  on this order
                </Text>
              </View>
            )}
          </View>

          {/* ── Trust Badges Row ── */}
          <View style={styles.trustBadgesRow}>
            <View style={styles.trustBadgeItem}>
              <ShieldCheck size={16} color="#64748B" />
              <Text style={styles.trustBadgeText}>100% Authentic</Text>
            </View>
            <Text style={styles.trustDot}>•</Text>
            <View style={styles.trustBadgeItem}>
              <Truck size={16} color="#64748B" />
              <Text style={styles.trustBadgeText}>Contactless Delivery</Text>
            </View>
            <Text style={styles.trustDot}>•</Text>
            <View style={styles.trustBadgeItem}>
              <RotateCcw size={16} color="#64748B" />
              <Text style={styles.trustBadgeText}>Easy Returns</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Fixed Bottom Sticky Action Bar (Matching User Screenshots) ── */}
      {cartItems.length > 0 && (
        <View style={styles.fixedBottomContainer}>
          <View style={styles.selectedCountBanner}>
            <Text style={styles.selectedCountText}>
              {selectedCartItems.length} Item{selectedCartItems.length !== 1 ? 's' : ''} selected for order
            </Text>
          </View>

          <View style={styles.bottomBarActionInner}>
            <TouchableOpacity
              style={[
                styles.placeOrderBtn,
                selectedCartItems.length === 0 && styles.placeOrderBtnDisabled,
                !selectedAddress && styles.selectAddressBtnHighlight,
              ]}
              activeOpacity={0.85}
              disabled={selectedCartItems.length === 0}
              onPress={() => {
                if (!selectedAddress) {
                  setShowAddressModal(true);
                } else {
                  handlePlaceOrder();
                }
              }}>
              <Text style={styles.placeOrderBtnText}>
                {!selectedAddress ? 'Select / Add Address' : 'Place Order'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Quantity Picker Modal for Cart Item (Matching Screenshot) ── */}
      <BottomSheetModal
        visible={!!editingCartItem}
        showHandle={true}
        onClose={() => setEditingCartItem(null)}>
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Change Quantity</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setEditingCartItem(null)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {/* Circular Horizontal Number Pills (1 to 10) */}
        <ScrollView
          ref={qtyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.qtyCircleContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => {
            const isSelected = tempQuantity === q;
            return (
              <TouchableOpacity
                key={q}
                activeOpacity={0.85}
                style={[
                  styles.qtyCirclePill,
                  isSelected && styles.qtyCirclePillActive,
                ]}
                onPress={() => setTempQuantity(q)}>
                <Text
                  style={[
                    styles.qtyCircleText,
                    isSelected && styles.qtyCircleTextActive,
                  ]}>
                  {q}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Confirm Solid Button */}
        <TouchableOpacity
          style={styles.confirmQtyBtn}
          activeOpacity={0.85}
          onPress={() => {
            handleUpdateQty(editingCartItem.cartItemId, tempQuantity);
            setEditingCartItem(null);
          }}>
          <Text style={styles.confirmQtyBtnText}>Confirm</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ── Address Selector / Add Address Modal ── */}
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
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {addressesList.length === 0 ? (
              <View style={styles.noAddressItem}>
                <Text style={styles.noAddressItemText}>No addresses saved yet.</Text>
              </View>
            ) : (
              addressesList.map((addr) => {
                const isSel = selectedAddress?.id === addr.id;
                if (isSel) {
                  // Expanded Detailed Card for active/selected address
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.activeAddressContainer}
                      activeOpacity={0.9}
                      onPress={() => setSelectedAddress(null)}>
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
                  // Simplified Row for non-selected addresses
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.simplifiedAddressCard}
                      activeOpacity={0.8}
                      onPress={() => setSelectedAddress(addr)}>
                      <View style={styles.simplifiedAddressRow}>
                        <Text style={styles.simplifiedAddressText} numberOfLines={2}>
                          {addr.name} ({addr.pincode}) - {addr.addressText}
                        </Text>
                        <View style={styles.simplifiedRadioCircle}>
                          {/* Circle check outline */}
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

      {/* ── Move from Bag Bottom Sheet Modal (Matching User Screenshot) ── */}
      <BottomSheetModal
        visible={!!removingCartItem}
        showHandle={true}
        onClose={() => setRemovingCartItem(null)}>
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Move from Bag</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setRemovingCartItem(null)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {/* Product Card Preview */}
        {removingCartItem && (
          <View style={styles.moveItemCard}>
            <Image
              source={removingCartItem.image ? { uri: removingCartItem.image } : DUMMY_IMG}
              style={styles.moveItemImg}
              resizeMode="cover"
            />
            <View style={styles.moveItemRight}>
              {removingCartItem.brandName ? (
                <Text style={styles.moveItemBrand}>{removingCartItem.brandName}</Text>
              ) : null}
              <Text style={styles.moveItemName} numberOfLines={2}>
                {removingCartItem.name}
              </Text>
            </View>
          </View>
        )}

        {/* Confirmation Question */}
        <Text style={styles.moveConfirmText}>
          Are you sure you want to remove this item from bag?
        </Text>

        {/* Outline Action Button: Remove */}
        <View style={styles.moveActionButtonsRow}>
          <TouchableOpacity
            style={styles.removeOutlineBtn}
            activeOpacity={0.8}
            disabled={isRemoving}
            onPress={() => handleConfirmRemove(removingCartItem, false)}>
            {isRemoving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.removeOutlineBtnText}>Remove</Text>
            )}
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backBtn: {
    padding: 4,
  },
  addressContainer: {
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliverToLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  userNameText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  addressSubText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 1,
  },
  headerIconButton: {
    padding: 6,
  },

  /* Jump Nav Tabs */
  navTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  navTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navTabPillActive: {
    backgroundColor: '#FAF5FF',
    borderColor: colors.primary,
  },
  navTabText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  navTabTextActive: {
    color: colors.primary,
    fontFamily: fonts.big,
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },

  /* Select All Row */
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: colors.primary,
  },

  /* Cart Item Card */
  cartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    zIndex: 10,
  },
  cartCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemCheckboxTouch: {
    paddingTop: 4,
  },
  cartItemImg: {
    width: 105,
    height: 125,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  cartItemRight: {
    flex: 1,
    paddingRight: 20,
  },
  itemBrandName: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: '#1A1C1E',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#475569',
    marginTop: 2,
    lineHeight: 18,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  dropdownPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownPillTrigger: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownPillText: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 30,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
  },
  stepperValueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#FFFFFF',
  },
  stepperValueText: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
    gap: 8,
  },
  itemFinalPrice: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  itemMRPPrice: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  itemDiscountOff: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  itemDeliveryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  itemDeliveryText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#2d6a4f',
  },

  /* Coupon Card */
  couponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponTitle: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  applyCouponBtnText: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: colors.primary,
  },

  /* Price Details Card */
  priceDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  priceDetailsHeaderTitle: {
    fontSize: 15,
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  summaryValueText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  summaryDiscountText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#2d6a4f',
  },
  applyCouponLink: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  summaryFreeText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#2d6a4f',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  savingsBannerPill: {
    backgroundColor: '#ECFCCB',
    borderWidth: 1,
    borderColor: '#D9F99D',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  savingsIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2d6a4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsBannerText: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: '#2d6a4f',
    textAlign: 'center',
  },
  savingsUnderlineAmount: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#2d6a4f',
    textDecorationLine: 'underline',
    textDecorationColor: '#2d6a4f',
  },

  /* Trust Badges Row */
  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  trustDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },

  /* Fixed Bottom Bar */
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  selectedCountBanner: {
    backgroundColor: '#FAF5FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  bottomBarActionInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placeOrderBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  placeOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.big,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  shopNowBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.big,
  },

  /* Quantity Modal Sheet (Matching Screenshot) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  qtyPickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  sheetTopCloseRow: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  closeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySheetTitle: {
    fontSize: 20,
    fontFamily: fonts.big,
    color: '#1E1B4B',
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
    fontSize: 22,
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
  confirmQtyBtnText: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },

  /* Address Selector Modal Styles */
  addressSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  closeBtn: {
    padding: 4,
  },
  addressItemCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  addressItemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
  },
  addressRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  addrNameText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#1E1B4B',
  },
  addrDetailText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  clearAddressBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearAddressBtnText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#EF4444',
  },
  selectAddressBtnHighlight: {
    backgroundColor: colors.primary,
  },

  /* Move from Bag Modal Styles */
  removeFromBagSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  moveSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  moveSheetTitle: {
    fontSize: 18,
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  moveSheetCloseBtn: {
    padding: 4,
  },
  moveItemCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  moveItemImg: {
    width: 64,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  moveItemRight: {
    flex: 1,
  },
  moveItemBrand: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: '#1A1C1E',
    letterSpacing: 0.5,
  },
  moveItemName: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },
  moveConfirmText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#334155',
    marginVertical: 18,
  },
  moveActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeOutlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  removeOutlineBtnText: {
    fontSize: 15,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  moveToWishlistBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveToWishlistBtnText: {
    fontSize: 15,
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  pincodeSection: {
    marginBottom: 16,
  },
  pincodeInputContainer: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  pincodeInput: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#0F172A',
  },
  pincodeCheckText: {
    fontFamily: fonts.big,
    fontSize: 14,
    color: '#64748B',
  },
  pincodeStatusMessage: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  pincodeStatusSuccess: {
    color: '#10B981',
  },
  pincodeStatusError: {
    color: '#EF4444',
  },
  quickActionsContainer: {
    marginBottom: 16,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  quickActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#EF4444',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 15,
    fontFamily: fonts.big,
    color: '#64748B',
  },
  activeAddressContainer: {
    backgroundColor: '#F5EEFD',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  homeBadgeContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  homeBadgeText: {
    fontSize: 9,
    fontFamily: fonts.big,
    color: '#64748B',
  },
  redCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAddressDetailText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 4,
  },
  activeAddressMobText: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 12,
  },
  activeAddressButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliverHereBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primary,
  },
  deliverHereBtnText: {
    fontSize: 12,
    fontFamily: fonts.big,
    color: '#FFFFFF',
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
    fontSize: 12,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  simplifiedAddressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  simplifiedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  simplifiedAddressText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#1E293B',
    flex: 1,
    lineHeight: 18,
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
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  addNewAddressOutlineBtnText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  noAddressItem: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noAddressItemText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#475569',
  },
});
