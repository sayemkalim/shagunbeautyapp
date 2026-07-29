import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
  ActivityIndicator,
  ScrollView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Banknote, X, Smartphone, Copy, CheckCircle2, ShoppingBag, MapPin } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import { selectCartTotalAmount, selectCartItems, clearCart } from '../redux/cartSlice';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import BottomSheetModal from '../components/BottomSheetModal';
import { moderateScale } from '../theme/responsive';
import { getCart } from '../api/cart';
import { createOrder } from '../api/order';

const UPI_ID = '8210433552@ybl';
const UPI_PAYEE_NAME = 'ShagunBeauty';

const CONFETTI_PARTICLES = [
  { dx: -50, dy: -60, color: '#FF3366', size: 8 },
  { dx: 50, dy: -70, color: '#33CCFF', size: 10 },
  { dx: -70, dy: -20, color: '#FFCC33', size: 6 },
  { dx: 70, dy: -30, color: '#9933FF', size: 10 },
  { dx: -40, dy: 50, color: '#33FF99', size: 8 },
  { dx: 50, dy: 60, color: '#FF9933', size: 8 },
  { dx: -15, dy: -80, color: '#FF33FF', size: 6 },
  { dx: 20, dy: 80, color: '#33FFCC', size: 10 },
  { dx: -80, dy: 20, color: '#FF5733', size: 8 },
  { dx: 80, dy: 15, color: '#C70039', size: 7 },
  { dx: -60, dy: -50, color: '#900C3F', size: 9 },
  { dx: 65, dy: 45, color: '#581845', size: 6 },
  { dx: -30, dy: -90, color: '#2ECC71', size: 8 },
  { dx: 30, dy: -95, color: '#3498DB', size: 10 },
  { dx: -95, dy: -10, color: '#9B59B6', size: 8 },
  { dx: 95, dy: -5, color: '#F1C40F', size: 9 },
];

export default function PaymentScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { addressId, address, couponCode, totalAmount: paramTotalAmount } = route.params || {};
  const reduxTotalAmount = useSelector(selectCartTotalAmount);
  const totalAmount = paramTotalAmount !== undefined ? paramTotalAmount : reduxTotalAmount;
  const cartItems = useSelector(selectCartItems);

  // Selected Payment Method: 'cod' or 'online'
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [showQrModal, setShowQrModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderedItems, setOrderedItems] = useState([]);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSuccessOverlay) {
      scaleAnim.setValue(0);
      confettiAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSuccessOverlay, scaleAnim, confettiAnim]);

  const upiUri = useMemo(() => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: UPI_PAYEE_NAME,
      am: String(totalAmount),
      cu: 'INR',
      tn: 'ShagunBeauty Order Payment',
    });
    return `upi://pay?${params.toString()}`;
  }, [totalAmount]);

  const handlePayViaUpiApp = () => {
    Linking.openURL(upiUri).catch(() => {
      Alert.alert(
        'No UPI App Found',
        'Please install a UPI app like Google Pay or PhonePe, or scan the QR code with another device.'
      );
    });
  };

  const placeOrderFlow = async () => {
    if (!addressId) {
      Alert.alert('Error', 'Delivery address not found. Please try again.');
      return;
    }

    try {
      setIsPlacingOrder(true);
      
      // 1. Fetch cart to retrieve its _id
      const cartRes = await getCart(addressId, couponCode);
      const cartId = cartRes?.data?.data?._id || cartRes?.data?._id;
      if (!cartId) {
        Alert.alert('Error', 'Your cart is empty or not found.');
        return;
      }

      // 2. Create the order
      const mode = paymentMethod === 'cod' ? 'COD' : 'UPI';
      await createOrder({ cartId, addressId, couponCode, paymentMode: mode });

      // 3. Success - Set orderedItems to preserve details for the overlay
      setOrderedItems([...cartItems]);
      setShowSuccessOverlay(true);
      dispatch(clearCart());
    } catch (e) {
      console.log('Order creation failed:', e);
      Alert.alert('Order Placement Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleConfirmPayment = () => {
    setShowQrModal(false);
    placeOrderFlow();
  };

  const handlePayment = () => {
    if (isPlacingOrder) return;
    if (paymentMethod === 'cod') {
      placeOrderFlow();
    } else {
      setShowQrModal(true);
    }
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
        <Text style={styles.headerTitle}>Payment Option</Text>
      </View>

      <View style={styles.container}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount to Pay</Text>
          <Text style={styles.amountValue}>₹{totalAmount}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {/* Cash on Delivery (COD) */}
        <TouchableOpacity
          style={[
            styles.paymentCard,
            paymentMethod === 'cod' && styles.paymentCardActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setPaymentMethod('cod')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, paymentMethod === 'cod' && styles.iconContainerActive]}>
              <Banknote size={24} color={paymentMethod === 'cod' ? colors.primary : '#64748B'} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.methodTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.methodDescription}>Pay with cash on delivery of your order.</Text>
            </View>
          </View>
          <View style={styles.radioOuter}>
            {paymentMethod === 'cod' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* Online Payment */}
        <TouchableOpacity
          style={[
            styles.paymentCard,
            paymentMethod === 'online' && styles.paymentCardActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setPaymentMethod('online')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, paymentMethod === 'online' && styles.iconContainerActive]}>
              <CreditCard size={24} color={paymentMethod === 'online' ? colors.primary : '#64748B'} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.methodTitle}>Online Payment</Text>
              <Text style={styles.methodDescription}>UPI, Credit/Debit Cards, Net Banking</Text>
            </View>
          </View>
          <View style={styles.radioOuter}>
            {paymentMethod === 'online' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Sticky Bottom Payment Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payButton, isPlacingOrder && { opacity: 0.7 }]}
          activeOpacity={0.85}
          disabled={isPlacingOrder}
          onPress={handlePayment}>
          {isPlacingOrder ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>
              {paymentMethod === 'cod' ? 'CONFIRM ORDER (COD)' : 'PROCEED TO PAY'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── UPI QR Payment Modal ── */}
      <BottomSheetModal
        visible={showQrModal}
        showHandle={true}
        onClose={() => setShowQrModal(false)}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Pay via UPI</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setShowQrModal(false)}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        <View style={styles.upiAmountRow}>
          <Text style={styles.upiAmountLabel}>Amount Payable</Text>
          <Text style={styles.upiAmountValue}>₹{totalAmount}</Text>
        </View>

        <View style={styles.qrContainer}>
          <QRCode value={upiUri} size={200} backgroundColor="#FFFFFF" color="#1A1C1E" />
        </View>

        <Text style={styles.upiScanHint}>
          Scan this QR with any UPI app (Google Pay, PhonePe, Paytm) to pay
        </Text>
        
        <TouchableOpacity
          style={styles.upiCopyRow}
          activeOpacity={0.7}
          onPress={() => {
            Clipboard.setString(UPI_ID);
            Alert.alert('UPI ID Copied', `Successfully copied: ${UPI_ID}`);
          }}>
          <Text style={styles.upiIdText}>UPI ID: {UPI_ID}</Text>
          <Copy size={14} color={colors.primary} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.upiPayBtn}
          activeOpacity={0.85}
          onPress={handlePayViaUpiApp}>
          <Smartphone size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.upiPayBtnText}>Pay via UPI App</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.upiConfirmBtn}
          activeOpacity={0.85}
          onPress={handleConfirmPayment}>
        <Text style={styles.upiConfirmBtnText}>I've Paid — Confirm Order</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {showSuccessOverlay && (
        <View style={styles.overlayContainer}>
          <ScrollView
            contentContainerStyle={styles.overlayScrollContent}
            showsVerticalScrollIndicator={false}>
            
            {/* Header / Animated Success Icon and Confetti */}
            <View style={styles.successHeader}>
              <View style={styles.animationWrapper}>
                {/* Confetti Particles */}
                {CONFETTI_PARTICLES.map((p, index) => {
                  const animStyle = {
                    position: 'absolute',
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: p.color,
                    transform: [
                      {
                        translateX: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dx],
                        }),
                      },
                      {
                        translateY: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dy],
                        }),
                      },
                      {
                        scale: confettiAnim.interpolate({
                          inputRange: [0, 0.2, 0.8, 1],
                          outputRange: [0, 1.5, 1, 0],
                        }),
                      },
                    ],
                    opacity: confettiAnim.interpolate({
                      inputRange: [0, 0.1, 0.8, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                  };
                  return <Animated.View key={index} style={animStyle} />;
                })}

                {/* Animated checkmark circle */}
                <Animated.View style={[styles.checkIconBox, { transform: [{ scale: scaleAnim }] }]}>
                  <CheckCircle2 size={48} color="#FFFFFF" />
                </Animated.View>
              </View>
              <Text style={styles.successTitle}>Order Placed Successfully!</Text>
              <Text style={styles.successSubtitle}>
                Thank you for shopping with Shagun Beauty. Your B2B order request has been received.
              </Text>
            </View>

            {/* Delivery Address Details Card */}
            {address && (
              <View style={styles.overlayCard}>
                <View style={styles.addressHeader}>
                  <MapPin size={16} color={colors.primary} />
                  <Text style={styles.addressSectionTitle}>Delivery Details</Text>
                </View>
                <View style={styles.overlayAddressDetails}>
                  <Text style={styles.overlayAddressName}>{address.name}</Text>
                  <Text style={styles.overlayAddressText}>
                    {address.address}
                  </Text>
                  {address.city ? (
                    <Text style={styles.overlayAddressText}>
                      {address.city}, {address.state} - {address.pincode}
                    </Text>
                  ) : null}
                  {address.landmark ? (
                    <Text style={styles.overlayAddressText}>Landmark: {address.landmark}</Text>
                  ) : null}
                  <Text style={styles.overlayAddressMobile}>Mobile: {address.mobile}</Text>
                </View>
              </View>
            )}

            {/* Items Purchased List Card */}
            <View style={styles.overlayCard}>
              <Text style={styles.overlayCardTitle}>Items in this Order</Text>
              <View style={styles.overlayDivider} />
              
              {orderedItems.map((item, index) => {
                const imageSource = item.image ? { uri: item.image } : null;
                return (
                  <View key={item.cartItemId || index}>
                    <View style={styles.overlayItemRow}>
                      <View style={styles.overlayItemImageWrapper}>
                        {imageSource ? (
                          <Image source={imageSource} style={styles.overlayItemImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.overlayPlaceholderImage}>
                            <ShoppingBag size={24} color={colors.primary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.overlayItemDetails}>
                        {item.brandName ? (
                          <Text style={styles.overlayItemBrand}>{item.brandName}</Text>
                        ) : null}
                        <Text style={styles.overlayItemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.overlayItemQty}>Qty: {item.quantity}</Text>
                      </View>
                      <View style={styles.overlayItemPriceCol}>
                        <Text style={styles.overlayItemPrice}>₹{Math.round(item.totalPrice)}</Text>
                      </View>
                    </View>
                    {index < orderedItems.length - 1 && <View style={styles.overlayItemDivider} />}
                  </View>
                );
              })}

              <View style={styles.overlayDivider} />

              <View style={styles.overlayTotalRow}>
                <Text style={styles.overlayTotalLabel}>Grand Total</Text>
                <Text style={styles.overlayTotalValue}>₹{Math.round(totalAmount)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.overlayActions}>
              <TouchableOpacity
                style={styles.continueShopBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessOverlay(false);
                  navigation.navigate('BottomTabs', { screen: 'Home' });
                }}>
                <Text style={styles.continueShopText}>Continue Shopping</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewOrdersBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setShowSuccessOverlay(false);
                  navigation.navigate('Orders');
                }}>
                <Text style={styles.viewOrdersText}>View My Orders</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  amountLabel: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginBottom: 6,
  },
  amountValue: {
    fontSize: moderateScale(28),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1E293B',
    marginBottom: 16,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconContainerActive: {
    backgroundColor: '#FFF1F2',
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  methodTitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#1E293B',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    lineHeight: moderateScale(16),
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  payButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  /* UPI QR Payment Modal */
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  closeBtn: {
    padding: 4,
  },
  upiAmountRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  upiAmountLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  upiAmountValue: {
    fontSize: moderateScale(28),
    fontFamily: fonts.big,
    color: colors.primary,
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 16,
  },
  upiScanHint: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  upiCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 20,
    alignSelf: 'center',
  },
  upiIdText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    textAlign: 'center',
  },
  upiPayBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  upiPayBtnText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  upiConfirmBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  upiConfirmBtnText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 2000,
  },
  overlayScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  checkIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  successTitle: {
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  overlayCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 32,
  },
  overlayCardTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 12,
  },
  overlayDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  overlayItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  overlayItemImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  overlayItemImage: {
    width: '100%',
    height: '100%',
  },
  overlayPlaceholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  overlayItemDetails: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  overlayItemBrand: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  overlayItemName: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#334155',
    marginTop: 2,
  },
  overlayItemQty: {
    fontSize: moderateScale(11),
    fontFamily: fonts.small,
    color: '#64748B',
    marginTop: 2,
  },
  overlayItemPriceCol: {
    alignItems: 'flex-end',
  },
  overlayItemPrice: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  overlayItemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  overlayTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  overlayTotalLabel: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  overlayTotalValue: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  overlayActions: {
    width: '100%',
    gap: 12,
  },
  continueShopBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  continueShopText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  viewOrdersBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOrdersText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#475569',
  },
  animationWrapper: {
    width: 200,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  addressSectionTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  overlayAddressDetails: {
    marginTop: 2,
  },
  overlayAddressName: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 4,
  },
  overlayAddressText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 16,
  },
  overlayAddressMobile: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginTop: 6,
  },
});
