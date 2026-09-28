import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Animated,
  Easing,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Banknote, CheckCircle2, ShoppingBag, MapPin, ShieldCheck } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import RazorpayCheckout from 'react-native-razorpay';
import { selectCartTotalAmount, selectCartItems, clearCart, removeFromCart } from '../redux/cartSlice';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getCart } from '../api/cart';
import { createOrder, createRazorpayOrder, verifyRazorpayPayment, getRazorpayConfig } from '../api/order';
import { getImageSource } from '../utils/imageOptimizer';
import { isProductOutOfStock } from '../utils/productUtils';

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
  
  // Calculate final total amount (including the ₹50 delivery charge fallback if total is < ₹2000)
  const totalAmount = useMemo(() => {
    if (paramTotalAmount !== undefined) {
      return paramTotalAmount;
    }
    if (reduxTotalAmount > 0 && reduxTotalAmount < 2000) {
      return reduxTotalAmount + 50;
    }
    return reduxTotalAmount;
  }, [paramTotalAmount, reduxTotalAmount]);
  const cartItems = useSelector(selectCartItems);

  // Selected Payment Method: 'online' (Razorpay) or 'cod' (Cash on delivery)
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderedItems, setOrderedItems] = useState([]);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [razorpayKeyId, setRazorpayKeyId] = useState(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  // 1. Fetch Razorpay config on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getRazorpayConfig();
        const cfg = res?.data || res;
        if (isMounted && cfg) {
          if (cfg.enabled !== undefined) {
            setRazorpayEnabled(cfg.enabled);
            if (!cfg.enabled) {
              setPaymentMethod('cod');
            }
          }
          if (cfg.keyId) setRazorpayKeyId(cfg.keyId);
        }
      } catch (err) {
        console.log('Error fetching Razorpay config:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Handle hardware back press on Android:
  // 1. While placing order / verifying payment: disable back button completely
  // 2. When payment successful / success overlay is active: reset navigation to Home instead of going back to PaymentScreen
  useEffect(() => {
    const onHardwareBack = () => {
      if (isPlacingOrder) {
        return true; // Block hardware back button while payment or order is in-flight
      }
      if (showSuccessOverlay) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'BottomTabs', state: { routes: [{ name: 'Home' }] } }],
        });
        return true; // Block going back to payment screen
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backHandler.remove();
  }, [isPlacingOrder, showSuccessOverlay, navigation]);

  // Handle React Navigation beforeRemove event (gesture back or header back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isPlacingOrder) {
        // Prevent leaving screen while placing order / verifying payment
        e.preventDefault();
        return;
      }
      
      // If navigation is an intentional RESET or REPLACE action, let it proceed
      const actionType = e.data?.action?.type;
      if (actionType === 'RESET' || actionType === 'REPLACE') {
        return;
      }

      if (showSuccessOverlay) {
        // Prevent returning to Payment screen; reset stack to Home
        e.preventDefault();
        navigation.reset({
          index: 0,
          routes: [{ name: 'BottomTabs', state: { routes: [{ name: 'Home' }] } }],
        });
      }
    });

    return unsubscribe;
  }, [navigation, showSuccessOverlay, isPlacingOrder]);

  // Standard Order Flow (for COD)
  const placeOrderFlow = async (mode = 'COD') => {
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

      // 2. Validate in-stock items
      const finalOrderedItems = (route.params?.selectedCartItems && Array.isArray(route.params.selectedCartItems) && route.params.selectedCartItems.length > 0)
        ? route.params.selectedCartItems.filter((i) => !isProductOutOfStock(i))
        : cartItems.filter((i) => !isProductOutOfStock(i));

      if (finalOrderedItems.length === 0) {
        Alert.alert('Out of Stock', 'The selected item(s) are currently out of stock and cannot be ordered.');
        return;
      }

      const inStockItemIds = finalOrderedItems.map((i) => i.cartItemId);
      const selectedItemIds = (route.params?.selectedItemIds || inStockItemIds).filter((id) => inStockItemIds.includes(id));

      const orderRes = await createOrder({
        cartId,
        addressId,
        couponCode,
        paymentMode: mode,
        selectedItemIds,
      });

      const orderData = orderRes?.data || orderRes?.order || orderRes;
      setCreatedOrder(orderData);

      // 3. Success - Set orderedItems to ONLY what was actually ordered
      setOrderedItems([...finalOrderedItems]);
      setShowSuccessOverlay(true);

      // Remove only the ordered items from Redux cart
      if (finalOrderedItems.length === cartItems.length) {
        dispatch(clearCart());
      } else {
        finalOrderedItems.forEach((item) => {
          if (item.cartItemId) {
            dispatch(removeFromCart(item.cartItemId));
          }
        });
      }
    } catch (e) {
      console.log('Order creation failed:', e);
      Alert.alert('Order Placement Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Razorpay Online Payment Flow
  const onlinePaymentFlow = async () => {
    if (!addressId) {
      Alert.alert('Error', 'Delivery address not found. Please try again.');
      return;
    }

    const finalOrderedItems = (route.params?.selectedCartItems && Array.isArray(route.params.selectedCartItems) && route.params.selectedCartItems.length > 0)
      ? route.params.selectedCartItems.filter((i) => !isProductOutOfStock(i))
      : cartItems.filter((i) => !isProductOutOfStock(i));

    if (finalOrderedItems.length === 0) {
      Alert.alert('Out of Stock', 'The selected item(s) are currently out of stock and cannot be ordered.');
      return;
    }

    try {
      setIsPlacingOrder(true);

      const cartRes = await getCart(addressId, couponCode);
      const cartId = cartRes?.data?.data?._id || cartRes?.data?._id;
      if (!cartId) {
        Alert.alert('Error', 'Your cart is empty or not found.');
        setIsPlacingOrder(false);
        return;
      }

      const inStockItemIds = finalOrderedItems.map((i) => i.cartItemId);
      const selectedItemIds = (route.params?.selectedItemIds || inStockItemIds).filter((id) => inStockItemIds.includes(id));

      // 1. Create Razorpay order directly with cart & address without pre-creating DB Order
      const rzpRes = await createRazorpayOrder({
        cartId,
        addressId,
        couponCode,
        selectedItemIds,
      });
      const rzpData = rzpRes?.data || rzpRes;

      if (!rzpData?.razorpayOrderId) {
        throw new Error(rzpRes?.message || 'Failed to create Razorpay payment order.');
      }

      // 2. Launch Razorpay Checkout
      const checkoutOptions = {
        key: rzpData.keyId || razorpayKeyId,
        order_id: rzpData.razorpayOrderId,
        amount: rzpData.amount, // in paise
        currency: rzpData.currency || 'INR',
        name: 'Shagun Beauty',
        description: 'Online Order Payment',
        prefill: {
          name: rzpData.customer?.name || address?.name || '',
          contact: rzpData.customer?.contact || address?.mobile || '',
          email: rzpData.customer?.email || '',
        },
        theme: { color: '#E91E63' },
      };

      setIsPlacingOrder(false);

      if (!RazorpayCheckout || !RazorpayCheckout.open) {
        Alert.alert('Error', 'Razorpay Checkout is not available.');
        return;
      }

      RazorpayCheckout.open(checkoutOptions)
        .then(async (data) => {
          // On payment success: verify payment and create DB Order ONLY now
          try {
            setIsPlacingOrder(true);
            const verifiedRes = await verifyRazorpayPayment({
              cartId,
              addressId,
              couponCode,
              selectedItemIds,
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature,
            });

            const verifiedOrder = verifiedRes?.data || verifiedRes?.order || verifiedRes;
            if (verifiedOrder) {
              setCreatedOrder(verifiedOrder);
            }

            // On success, set ordered items, clear cart, show success screen
            setOrderedItems([...finalOrderedItems]);
            setShowSuccessOverlay(true);

            if (finalOrderedItems.length === cartItems.length) {
              dispatch(clearCart());
            } else {
              finalOrderedItems.forEach((item) => {
                if (item.cartItemId) {
                  dispatch(removeFromCart(item.cartItemId));
                }
              });
            }
          } catch (verifyErr) {
            console.log('Payment verification error:', verifyErr);
            Alert.alert(
              'Payment Verification Pending',
              verifyErr?.message || 'Payment received by bank. It will be verified shortly from your order history.',
              [
                { text: 'View Orders', onPress: () => navigation.navigate('Orders') },
                { text: 'OK' }
              ]
            );
          } finally {
            setIsPlacingOrder(false);
          }
        })
        .catch((error) => {
          // On user dismissal or payment failure:
          // Since no order was created in DB, cart remains intact
          console.log('Razorpay payment cancelled / dismissed:', error);
          setIsPlacingOrder(false);
          Alert.alert(
            'Payment Incomplete',
            'Payment was cancelled or could not be completed. Your cart items are preserved. You can try again whenever you are ready.',
            [{ text: 'OK', style: 'default' }]
          );
        });

    } catch (e) {
      console.log('Online payment flow error:', e);
      setIsPlacingOrder(false);
      Alert.alert('Payment Error', e?.message || 'Could not initiate online payment. Please try again.');
    }
  };

  const handlePayment = () => {
    if (isPlacingOrder) return;
    if (paymentMethod === 'online') {
      onlinePaymentFlow();
    } else {
      placeOrderFlow('COD');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, (isPlacingOrder || showSuccessOverlay) && styles.backButtonDisabled]}
          activeOpacity={0.7}
          disabled={isPlacingOrder || showSuccessOverlay}
          onPress={() => {
            if (!isPlacingOrder && !showSuccessOverlay) {
              navigation.goBack();
            }
          }}>
          <ChevronLeft size={24} color={isPlacingOrder || showSuccessOverlay ? '#CBD5E1' : '#1A1C1E'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Option</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Payable Amount</Text>
          <Text style={styles.amountValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {/* 1. Online Payment (Razorpay Checkout) */}
        {razorpayEnabled && (
          <>
            <TouchableOpacity
              style={[
                styles.paymentCard,
                paymentMethod === 'online' && styles.paymentCardActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setPaymentMethod('online')}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconContainer, paymentMethod === 'online' && styles.iconContainerActive]}>
                  <CreditCard size={22} color={paymentMethod === 'online' ? colors.primary : '#64748B'} />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.methodTitle}>Online Payment</Text>
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                    </View>
                  </View>
                  <Text style={styles.methodDescription}>UPI, Debit/Credit Cards, Net Banking & Wallets</Text>
                </View>
              </View>
              <View style={[styles.radioOuter, paymentMethod === 'online' && styles.radioOuterActive]}>
                {paymentMethod === 'online' && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

            {paymentMethod === 'online' && (
              <View style={styles.onlineBenefitBanner}>
                <ShieldCheck size={18} color="#15803D" style={{ marginRight: 8 }} />
                <Text style={styles.onlineBenefitText}>
                  Fast & 100% secure payment verified directly via Razorpay.
                </Text>
              </View>
            )}
          </>
        )}

        {/* 2. Cash on Delivery (COD) */}
        <TouchableOpacity
          style={[
            styles.paymentCard,
            paymentMethod === 'cod' && styles.paymentCardActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setPaymentMethod('cod')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, paymentMethod === 'cod' && styles.iconContainerActive]}>
              <Banknote size={22} color={paymentMethod === 'cod' ? colors.primary : '#64748B'} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.methodTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.methodDescription}>Pay with cash on delivery of your order.</Text>
            </View>
          </View>
          <View style={[styles.radioOuter, paymentMethod === 'cod' && styles.radioOuterActive]}>
            {paymentMethod === 'cod' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Bottom Payment Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payButton, isPlacingOrder && styles.payButtonDisabled]}
          activeOpacity={0.85}
          disabled={isPlacingOrder}
          onPress={handlePayment}>
          {isPlacingOrder ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>
              {paymentMethod === 'online'
                ? `PAY NOW • ₹${Math.round(totalAmount).toLocaleString('en-IN')}`
                : `PLACE ORDER (COD) • ₹${Math.round(totalAmount).toLocaleString('en-IN')}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
                const imageSource = item.image ? getImageSource(item.image, 'THUMBNAIL', null) : null;
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
              {createdOrder?._id ? (
                <TouchableOpacity
                  style={styles.viewOrdersBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowSuccessOverlay(false);
                    navigation.reset({
                      index: 1,
                      routes: [
                        { name: 'BottomTabs', state: { routes: [{ name: 'Home' }] } },
                        {
                          name: 'OrderDetail',
                          params: { orderId: createdOrder._id, orderData: createdOrder },
                        },
                      ],
                    });
                  }}>
                  <Text style={styles.viewOrdersText}>View Order Details</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.continueShopBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessOverlay(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'BottomTabs', state: { routes: [{ name: 'Home' }] } }],
                  });
                }}>
                <Text style={styles.continueShopText}>Continue Shopping</Text>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  amountLabel: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: moderateScale(32),
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
    borderRadius: 16,
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
    marginRight: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconContainerActive: {
    backgroundColor: '#F3E8FF',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  recommendedBadge: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  recommendedBadgeText: {
    color: '#BE185D',
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    letterSpacing: 0.3,
  },
  methodDescription: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    lineHeight: moderateScale(16),
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  onlineBenefitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
    marginTop: -2,
    marginBottom: 14,
  },
  onlineBenefitText: {
    flex: 1,
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#166534',
    lineHeight: moderateScale(16),
    marginLeft: 8,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    width: '100%',
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  backButtonDisabled: {
    opacity: 0.3,
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
  whatsappBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    gap: 8,
  },
  whatsappText: {
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
