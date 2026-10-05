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
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ChevronLeft,
  CreditCard,
  Banknote,
  CheckCircle2,
  ShoppingBag,
  MapPin,
  ShieldCheck,
  Lock,
  ArrowRight,
  Copy,
  Check,
  Truck,
  Package,
  Clock,
  PartyPopper,
  CheckCircle,
} from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import LottieView from 'lottie-react-native';
import successTickLottie from '../lottie/Tick animation - success feedback.json';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getCart, removeFromCartApi, deleteCartApi } from '../api/cart';
import { getUser } from '../api/authStorage';
import { createOrder, createRazorpayOrder, verifyRazorpayPayment, getRazorpayConfig } from '../api/order';
import { getImageSource } from '../utils/imageOptimizer';
import { isProductOutOfStock, getProductStock, getItemVariantSku } from '../utils/productUtils';

const CONFETTI_PARTICLES = [
  { dx: -70, dy: -90, color: '#10B981', size: 10, rotate: '-25deg' },
  { dx: 70, dy: -95, color: '#34D399', size: 12, rotate: '35deg' },
  { dx: -100, dy: -45, color: '#FBBF24', size: 9, rotate: '-45deg' },
  { dx: 100, dy: -50, color: '#059669', size: 11, rotate: '55deg' },
  { dx: -80, dy: 60, color: '#10B981', size: 9, rotate: '-15deg' },
  { dx: 85, dy: 70, color: '#F59E0B', size: 10, rotate: '25deg' },
  { dx: -35, dy: -120, color: '#047857', size: 8, rotate: '10deg' },
  { dx: 35, dy: -125, color: '#6EE7B7', size: 12, rotate: '-30deg' },
  { dx: -120, dy: 15, color: '#34D399', size: 9, rotate: '-60deg' },
  { dx: 120, dy: 20, color: '#FBBF24', size: 11, rotate: '40deg' },
  { dx: -90, dy: -80, color: '#10B981', size: 10, rotate: '20deg' },
  { dx: 95, dy: -85, color: '#F59E0B', size: 9, rotate: '-50deg' },
  { dx: -55, dy: 90, color: '#059669', size: 11, rotate: '15deg' },
  { dx: 55, dy: 95, color: '#6EE7B7', size: 10, rotate: '-35deg' },
  { dx: -130, dy: -35, color: '#10B981', size: 8, rotate: '45deg' },
  { dx: 130, dy: -30, color: '#FBBF24', size: 12, rotate: '-15deg' },
];

export default function PaymentScreen({ navigation, route }) {
  const queryClient = useQueryClient();
  const cartItems = useCartStore((state) => state.items);
  const cartTotalAmount = useCartStore((state) => state.totalAmount);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);

  const { addressId, address, couponCode, totalAmount: paramTotalAmount, cartId: paramCartId } = route.params || {};
  const [cartId, setCartId] = useState(paramCartId || null);
  
  // Calculate final total amount (including the ₹50 delivery charge fallback if total is < ₹2000)
  const totalAmount = useMemo(() => {
    if (paramTotalAmount !== undefined) {
      return paramTotalAmount;
    }
    if (cartTotalAmount > 0 && cartTotalAmount < 2000) {
      return cartTotalAmount + 50;
    }
    return cartTotalAmount;
  }, [paramTotalAmount, cartTotalAmount]);

  // Live display amount synced with backend & Razorpay
  const [displayAmount, setDisplayAmount] = useState(totalAmount);

  useEffect(() => {
    setDisplayAmount(totalAmount);
  }, [totalAmount]);

  // Pre-sync accurate backend cart total on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (addressId) {
          const cartRes = await getCart(addressId, couponCode);
          const cartData = cartRes?.data?.data || cartRes?.data || cartRes;
          if (isMounted && cartData) {
            const fetchedCartId = cartData?._id || cartData?.data?._id;
            if (fetchedCartId) {
              setCartId(fetchedCartId);
            }
            if (!paramTotalAmount) {
              if (typeof cartData.final_price === 'number' && cartData.final_price > 0) {
                setDisplayAmount(Math.round(cartData.final_price));
              } else if (typeof cartData.final_total === 'number' && cartData.final_total > 0) {
                setDisplayAmount(Math.round(cartData.final_total));
              } else {
                const rawTotal = cartData.total_price || 0;
                const cDiscount = cartData.coupon_discount_amount ?? cartData.coupon?.discount_amount ?? 0;
                const sCharge = (typeof cartData.shipping_charge === 'number')
                  ? cartData.shipping_charge
                  : ((rawTotal > 0 && rawTotal < 2000) ? 50 : 0);
                const calcFinal = Math.max(0, rawTotal - cDiscount) + sCharge;
                if (calcFinal > 0) {
                  setDisplayAmount(Math.round(calcFinal));
                }
              }
            }
          }
        }
      } catch (err) {
        console.log('Error pre-fetching cart total on PaymentScreen:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressId, couponCode, paramTotalAmount]);

  // Selected Payment Method: 'online' (Razorpay) or 'cod' (Cash on delivery)
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderedItems, setOrderedItems] = useState([]);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [razorpayKeyId, setRazorpayKeyId] = useState(null);

  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      fadeAnim.setValue(0);
      slideUpAnim.setValue(40);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideUpAnim, {
          toValue: 0,
          friction: 7,
          tension: 35,
          useNativeDriver: true,
        }),
      ]).start();

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.16,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => {
        pulseLoop.stop();
      };
    }
  }, [showSuccessOverlay, scaleAnim, confettiAnim, fadeAnim, slideUpAnim, pulseAnim]);

  // Handle hardware back press on Android:
  useEffect(() => {
    const onHardwareBack = () => {
      if (isPlacingOrder) {
        return true;
      }
      if (showSuccessOverlay) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'BottomTabs', state: { routes: [{ name: 'Home' }] } }],
        });
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backHandler.remove();
  }, [isPlacingOrder, showSuccessOverlay, navigation]);

  // Handle React Navigation beforeRemove event
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isPlacingOrder) {
        e.preventDefault();
        return;
      }
      
      const actionType = e.data?.action?.type;
      if (actionType === 'RESET' || actionType === 'REPLACE') {
        return;
      }

      if (showSuccessOverlay) {
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

      let effectiveCartId = cartId || route.params?.cartId;
      if (!effectiveCartId) {
        const cartRes = await getCart(addressId, couponCode);
        effectiveCartId = cartRes?.data?.data?._id || cartRes?.data?._id;
        if (effectiveCartId) {
          setCartId(effectiveCartId);
        }
      }

      if (!effectiveCartId) {
        Alert.alert('Error', 'Your cart is empty or not found.');
        return;
      }

      const rawOrderedItems = (route.params?.selectedCartItems && Array.isArray(route.params.selectedCartItems) && route.params.selectedCartItems.length > 0)
        ? route.params.selectedCartItems.filter((i) => !isProductOutOfStock(i))
        : cartItems.filter((i) => !isProductOutOfStock(i));

      const finalOrderedItems = rawOrderedItems.map((i) => {
        const stock = getProductStock(i);
        if (typeof stock === 'number' && stock > 0 && i.quantity > stock) {
          return { ...i, quantity: stock };
        }
        return i;
      });

      if (finalOrderedItems.length === 0) {
        Alert.alert('Out of Stock', 'The selected item(s) are currently out of stock and cannot be ordered.');
        return;
      }

      const inStockItemIds = finalOrderedItems.map((i) => i.cartItemId);
      const isOrderingAll = finalOrderedItems.length >= cartItems.length;

      const orderRes = await createOrder({
        cartId: effectiveCartId,
        addressId,
        couponCode,
        paymentMode: mode,
        ...(isOrderingAll ? {} : { selectedItemIds: inStockItemIds }),
      });

      const orderData = orderRes?.data || orderRes?.order || orderRes;
      setCreatedOrder(orderData);
      if (orderData?.finalTotalAmount || orderData?.totalAmount) {
        setDisplayAmount(Math.round(orderData.finalTotalAmount || orderData.totalAmount));
      }

      setOrderedItems([...finalOrderedItems]);
      setShowSuccessOverlay(true);

      if (isOrderingAll) {
        clearCart();
      } else {
        finalOrderedItems.forEach((item) => {
          if (item.cartItemId) removeFromCart(item.cartItemId);
          if (item._id) removeFromCart(item._id);
          if (item.backendCartItemId) removeFromCart(item.backendCartItemId);
          removeFromCart(`${item.productId}_${getItemVariantSku(item) || 'base'}`);
        });
      }

      // Background cache invalidation and non-blocking sync
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      Promise.all(
        finalOrderedItems.map((item) =>
          removeFromCartApi({
            productId: item.productId || item.product?._id || item.id,
            variantSku: getItemVariantSku(item),
          }).catch(() => {})
        )
      ).catch(() => {});

      if (isOrderingAll) {
        getUser().then((user) => {
          const uId = user?.id || user?._id;
          if (uId) {
            deleteCartApi(uId).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.log('Order creation failed:', e);
      const errMsg = e?.message || 'Something went wrong. Please try again.';
      const isStockError =
        errMsg.toLowerCase().includes('out of stock') ||
        errMsg.toLowerCase().includes('stock') ||
        (Array.isArray(e?.outOfStockItems) && e.outOfStockItems.length > 0);

      if (isStockError) {
        Alert.alert(
          'Item Out of Stock',
          errMsg,
          [
            { text: 'Review Bag', onPress: () => navigation.navigate('Cart') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Order Placement Failed', errMsg);
      }
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

    const rawOrderedItems = (route.params?.selectedCartItems && Array.isArray(route.params.selectedCartItems) && route.params.selectedCartItems.length > 0)
      ? route.params.selectedCartItems.filter((i) => !isProductOutOfStock(i))
      : cartItems.filter((i) => !isProductOutOfStock(i));

    const finalOrderedItems = rawOrderedItems.map((i) => {
      const stock = getProductStock(i);
      if (typeof stock === 'number' && stock > 0 && i.quantity > stock) {
        return { ...i, quantity: stock };
      }
      return i;
    });

    if (finalOrderedItems.length === 0) {
      Alert.alert('Out of Stock', 'The selected item(s) are currently out of stock and cannot be ordered.');
      return;
    }

    try {
      setIsPlacingOrder(true);

      let effectiveCartId = cartId || route.params?.cartId;
      if (!effectiveCartId) {
        const cartRes = await getCart(addressId, couponCode);
        effectiveCartId = cartRes?.data?.data?._id || cartRes?.data?._id;
        if (effectiveCartId) {
          setCartId(effectiveCartId);
        }
      }

      if (!effectiveCartId) {
        Alert.alert('Error', 'Your cart is empty or not found.');
        setIsPlacingOrder(false);
        return;
      }

      const inStockItemIds = finalOrderedItems.map((i) => i.cartItemId);
      const isOrderingAll = finalOrderedItems.length >= cartItems.length;

      const rzpRes = await createRazorpayOrder({
        cartId: effectiveCartId,
        addressId,
        couponCode,
        ...(isOrderingAll ? {} : { selectedItemIds: inStockItemIds }),
      });
      const rzpData = rzpRes?.data || rzpRes;

      if (!rzpData?.razorpayOrderId) {
        throw new Error(rzpRes?.message || 'Failed to create Razorpay payment order.');
      }

      if (rzpData.amount) {
        const orderAmountInRupees = Math.round(Number(rzpData.amount) / 100);
        if (orderAmountInRupees > 0) {
          setDisplayAmount(orderAmountInRupees);
        }
      }

      const checkoutOptions = {
        key: rzpData.keyId || razorpayKeyId,
        order_id: rzpData.razorpayOrderId,
        amount: rzpData.amount,
        currency: rzpData.currency || 'INR',
        name: 'Shagun Beauty',
        description: 'Online Order Payment',
        prefill: {
          name: rzpData.customer?.name || address?.name || '',
          contact: rzpData.customer?.contact || address?.mobile || '',
          email: rzpData.customer?.email || '',
        },
        theme: { color: colors.primary },
      };

      setIsPlacingOrder(false);

      if (!RazorpayCheckout || !RazorpayCheckout.open) {
        Alert.alert('Error', 'Razorpay Checkout is not available.');
        return;
      }

      RazorpayCheckout.open(checkoutOptions)
        .then(async (data) => {
          try {
            setIsPlacingOrder(true);
            const verifiedRes = await verifyRazorpayPayment({
              cartId: effectiveCartId,
              addressId,
              couponCode,
              ...(isOrderingAll ? {} : { selectedItemIds: inStockItemIds }),
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature,
            });

            const verifiedOrder = verifiedRes?.data || verifiedRes?.order || verifiedRes;
            if (verifiedOrder) {
              setCreatedOrder(verifiedOrder);
            }

            setOrderedItems([...finalOrderedItems]);
            setShowSuccessOverlay(true);

            if (isOrderingAll) {
              clearCart();
            } else {
              finalOrderedItems.forEach((item) => {
                if (item.cartItemId) removeFromCart(item.cartItemId);
                if (item._id) removeFromCart(item._id);
                if (item.backendCartItemId) removeFromCart(item.backendCartItemId);
                removeFromCart(`${item.productId}_${getItemVariantSku(item) || 'base'}`);
              });
            }

            // Non-blocking query invalidation & background cleanup
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });

            Promise.all(
              finalOrderedItems.map((item) =>
                removeFromCartApi({
                  productId: item.productId || item.product?._id || item.id,
                  variantSku: getItemVariantSku(item),
                }).catch(() => {})
              )
            ).catch(() => {});

            if (isOrderingAll) {
              getUser().then((user) => {
                const uId = user?.id || user?._id;
                if (uId) {
                  deleteCartApi(uId).catch(() => {});
                }
              }).catch(() => {});
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
      const errMsg = e?.message || 'Could not initiate online payment. Please try again.';
      const isStockError =
        errMsg.toLowerCase().includes('out of stock') ||
        errMsg.toLowerCase().includes('stock') ||
        (Array.isArray(e?.outOfStockItems) && e.outOfStockItems.length > 0);

      if (isStockError) {
        Alert.alert(
          'Item Out of Stock',
          errMsg,
          [
            { text: 'Review Bag', onPress: () => navigation.navigate('Cart') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Payment Error', errMsg);
      }
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

      {/* Zomato-style Clean Header */}
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
          <ChevronLeft size={24} color={isPlacingOrder || showSuccessOverlay ? '#CBD5E1' : '#111827'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Payment Method</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Zomato-style Bill Summary Strip */}
        <View style={styles.amountCard}>
          <View style={styles.amountLeftCol}>
            <Text style={styles.amountLabel}>Total to Pay</Text>
            <Text style={styles.amountSubtext}>Includes all taxes & delivery</Text>
          </View>
          <Text style={styles.amountValue}>₹{Math.round(displayAmount).toLocaleString('en-IN')}</Text>
        </View>

        <Text style={styles.sectionTitle}>PAYMENT OPTIONS</Text>

        {/* 1. Online Payment (UPI / Cards / Net Banking) */}
        {razorpayEnabled && (
          <TouchableOpacity
            style={[
              styles.paymentCard,
              paymentMethod === 'online' && styles.paymentCardActive,
            ]}
            activeOpacity={0.85}
            onPress={() => setPaymentMethod('online')}>
            <View style={styles.cardLeft}>
              <View style={[styles.iconContainer, paymentMethod === 'online' && styles.iconContainerActive]}>
                <CreditCard size={22} color={paymentMethod === 'online' ? colors.primary : '#4B5563'} />
              </View>
              <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.methodTitle, paymentMethod === 'online' && styles.methodTitleActive]}>
                    Online Payment
                  </Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                  </View>
                </View>
                <Text style={styles.methodDescription}>UPI, Cards, Net Banking & Wallets</Text>
              </View>
            </View>
            <View style={[styles.radioOuter, paymentMethod === 'online' && styles.radioOuterActive]}>
              {paymentMethod === 'online' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        )}

        {/* 2. Cash on Delivery (COD) */}
        <TouchableOpacity
          style={[
            styles.paymentCard,
            paymentMethod === 'cod' && styles.paymentCardActive,
          ]}
          activeOpacity={0.85}
          onPress={() => setPaymentMethod('cod')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, paymentMethod === 'cod' && styles.iconContainerActive]}>
              <Banknote size={22} color={paymentMethod === 'cod' ? colors.primary : '#4B5563'} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.methodTitle, paymentMethod === 'cod' && styles.methodTitleActive]}>
                Cash on Delivery (COD)
              </Text>
              <Text style={styles.methodDescription}>Pay with cash on delivery of your order</Text>
            </View>
          </View>
          <View style={[styles.radioOuter, paymentMethod === 'cod' && styles.radioOuterActive]}>
            {paymentMethod === 'cod' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Full-Width Bottom Pay Button */}
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
                ? `PAY NOW • ₹${Math.round(displayAmount).toLocaleString('en-IN')}`
                : `PLACE ORDER (COD) • ₹${Math.round(displayAmount).toLocaleString('en-IN')}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {showSuccessOverlay && (
        <View style={styles.overlayContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#ECFDF5" />
          <ScrollView
            contentContainerStyle={styles.overlayScrollContent}
            showsVerticalScrollIndicator={false}>
            
            {/* Top Celebratory Header with Light Mint/Greenish Gradient */}
            <LinearGradient
              colors={['#ECFDF5', '#D1FAE5', '#A7F3D0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}>
              
              {/* Confetti Explosion Layer */}
              <View style={styles.confettiContainer} pointerEvents="none">
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
                        rotate: p.rotate || '0deg',
                      },
                      {
                        scale: confettiAnim.interpolate({
                          inputRange: [0, 0.3, 0.8, 1],
                          outputRange: [0, 1.4, 1, 0.3],
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
              </View>

              {/* Central Pulsing Ripple Rings & Celebration Badge */}
              <View style={styles.badgeWrapper}>
                {/* Outer Ripple */}
                <Animated.View
                  style={[
                    styles.rippleRing,
                    styles.rippleRingOuter,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                {/* Inner Ripple */}
                <Animated.View
                  style={[
                    styles.rippleRing,
                    styles.rippleRingInner,
                    { transform: [{ scale: Animated.multiply(pulseAnim, 0.93) }] },
                  ]}
                />

                {/* Main Animated Lottie Tick */}
                <Animated.View
                  style={[
                    styles.lottieBox,
                    { transform: [{ scale: scaleAnim }] },
                  ]}>
                  <LottieView
                    source={successTickLottie}
                    autoPlay
                    loop={false}
                    style={styles.lottieAnimation}
                  />
                </Animated.View>
              </View>

              {/* Success Texts */}
              <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                <Text style={styles.heroSuccessTitle}>Order Placed Successfully! 🎉</Text>
                <Text style={styles.heroSuccessSubtitle}>
                  Thank you for shopping with Shagun Beauty. Your order request has been received.
                </Text>

                {/* Order ID Pill with 1-Tap Copy */}
                {createdOrder?._id ? (
                  <TouchableOpacity
                    style={styles.orderIdPill}
                    activeOpacity={0.8}
                    onPress={() => {
                      const idText = String(createdOrder._id);
                      Clipboard.setString(idText);
                      setCopiedOrderId(true);
                      setTimeout(() => setCopiedOrderId(false), 2000);
                    }}>
                    <Text style={styles.orderIdLabel}>Order ID: </Text>
                    <Text style={styles.orderIdValue}>
                      #{String(createdOrder._id).slice(-8).toUpperCase()}
                    </Text>
                    {copiedOrderId ? (
                      <View style={styles.copiedBadge}>
                        <Check size={11} color="#10B981" />
                        <Text style={styles.copiedBadgeText}>Copied</Text>
                      </View>
                    ) : (
                      <Copy size={13} color="#059669" style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                ) : null}
              </Animated.View>
            </LinearGradient>

            {/* Slide-Up Content Body */}
            <Animated.View
              style={[
                styles.overlayBody,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideUpAnim }],
                },
              ]}>
              


              {/* Delivery Address Card */}
              {address && (
                <View style={styles.overlayCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderIconBox}>
                      <MapPin size={15} color="#7C3AED" />
                    </View>
                    <Text style={styles.cardHeaderTitle}>Delivery Address</Text>
                  </View>
                  <View style={styles.addressBody}>
                    <Text style={styles.addressNameText}>{address.name}</Text>
                    <Text style={styles.addressDetailText}>{address.address}</Text>
                    {address.city ? (
                      <Text style={styles.addressDetailText}>
                        {address.city}, {address.state} - {address.pincode}
                      </Text>
                    ) : null}
                    <Text style={styles.addressMobileText}>Mobile: {address.mobile}</Text>
                  </View>
                </View>
              )}

              {/* Items Purchased List Card */}
              <View style={styles.overlayCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderIconBox}>
                    <ShoppingBag size={15} color="#7C3AED" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>
                    Items in Order ({orderedItems.length})
                  </Text>
                </View>
                <View style={styles.cardDivider} />
                
                {orderedItems.map((item, index) => {
                  const imageSource = item.image ? getImageSource(item.image, 'THUMBNAIL', null) : null;
                  return (
                    <View key={item.cartItemId || index}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemImageWrapper}>
                          {imageSource ? (
                            <Image source={imageSource} style={styles.itemThumbImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.itemPlaceholder}>
                              <ShoppingBag size={20} color="#7C3AED" />
                            </View>
                          )}
                        </View>
                        <View style={styles.itemDetailsCol}>
                          {item.brandName ? (
                            <Text style={styles.itemBrandName}>{item.brandName}</Text>
                          ) : null}
                          <Text style={styles.itemNameText} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <View style={styles.itemBadgeRow}>
                            {item.variantName ? (
                              <View style={styles.variantChip}>
                                <Text style={styles.variantChipText}>{item.variantName}</Text>
                              </View>
                            ) : null}
                            <View style={styles.qtyChip}>
                              <Text style={styles.qtyChipText}>Qty: {item.quantity}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.itemPriceCol}>
                          <Text style={styles.itemTotalPrice}>₹{Math.round(item.totalPrice).toLocaleString('en-IN')}</Text>
                        </View>
                      </View>
                      {index < orderedItems.length - 1 && <View style={styles.itemSeparator} />}
                    </View>
                  );
                })}

                <View style={styles.cardDivider} />

                {/* Receipt Footer */}
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.grandTotalLabel}>Total Amount</Text>
                  <Text style={styles.grandTotalValue}>
                    ₹{Math.round(createdOrder?.finalTotalAmount || createdOrder?.totalAmount || displayAmount).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.overlayButtonStack}>
                {createdOrder?._id ? (
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    activeOpacity={0.88}
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
                    <LinearGradient
                      colors={['#7C3AED', '#5B21B6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryGradientBtn}>
                      <Text style={styles.primaryActionText}>View Order Details</Text>
                      <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowSuccessOverlay(false);
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'BottomTabs', state: { routes: [{ name: 'Home' }] } }],
                    });
                  }}>
                  <ShoppingBag size={18} color="#6D28D9" style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryActionText}>Continue Shopping</Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#111827',
    textAlign: 'left',
    width: '80%',
  },
  headerSpacer: {
    width: 32,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  amountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  amountLeftCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#111827',
  },
  amountSubtext: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#9CA3AF',
    marginTop: 2,
  },
  amountValue: {
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 2,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
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
    marginRight: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
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
    marginBottom: 2,
  },
  methodTitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#111827',
  },
  methodTitleActive: {
    color: '#111827',
  },
  recommendedBadge: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  recommendedBadgeText: {
    color: '#BE185D',
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    letterSpacing: 0.4,
  },
  methodDescription: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#6B7280',
    marginTop: 3,
    lineHeight: moderateScale(16),
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
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
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  payButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  backButtonDisabled: {
    opacity: 0.3,
  },

  // ─── Super Premium Animated Success Overlay ───
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    zIndex: 2000,
  },
  overlayScrollContent: {
    paddingBottom: 40,
  },
  heroGradient: {
    paddingTop: 50,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  confettiContainer: {
    position: 'absolute',
    top: 90,
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
  },
  rippleRingOuter: {
    width: 170,
    height: 170,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  rippleRingInner: {
    width: 130,
    height: 130,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  lottieBox: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  lottieAnimation: {
    width: 250,
    height: 250,
  },
  heroSuccessTitle: {
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: '#064E3B',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSuccessSubtitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#047857',
    textAlign: 'center',
    lineHeight: moderateScale(18),
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  orderIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  orderIdLabel: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#059669',
  },
  orderIdValue: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#064E3B',
    letterSpacing: 0.4,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    gap: 3,
  },
  copiedBadgeText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#16A34A',
  },

  overlayBody: {
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 14,
  },

  // ── Delivery Status Card ──
  deliveryStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  deliveryStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryTruckIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryExpectedTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1E293B',
  },
  deliveryExpectedDate: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#6D28D9',
    marginTop: 2,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  trackStep: {
    alignItems: 'center',
    width: 58,
  },
  trackNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trackNodeCompleted: {
    backgroundColor: '#10B981',
  },
  trackNodeActive: {
    backgroundColor: '#7C3AED',
  },
  trackLabel: {
    fontSize: moderateScale(10),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textAlign: 'center',
  },
  trackLabelCompleted: {
    color: '#10B981',
    fontFamily: fonts.big,
  },
  trackLabelActive: {
    color: '#7C3AED',
    fontFamily: fonts.big,
  },
  trackLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
    marginHorizontal: -4,
  },
  trackLineActive: {
    backgroundColor: '#10B981',
  },

  // ── Overlay Generic Card ──
  overlayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardHeaderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1E293B',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  addressBody: {
    paddingLeft: 4,
  },
  addressNameText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1E293B',
    marginBottom: 3,
  },
  addressDetailText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    lineHeight: moderateScale(17),
  },
  addressMobileText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#334155',
    marginTop: 6,
  },

  // ── Ordered Item Row ──
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemImageWrapper: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  itemThumbImage: {
    width: '100%',
    height: '100%',
  },
  itemPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  itemDetailsCol: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  itemBrandName: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#7C3AED',
  },
  itemNameText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#334155',
    marginTop: 2,
    lineHeight: moderateScale(16),
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  variantChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  variantChipText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  qtyChip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyChipText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#6D28D9',
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemTotalPrice: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Payment Summary / Footer ──
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  paymentModeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentModeText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
  },
  grandTotalCol: {
    alignItems: 'flex-end',
  },
  grandTotalLabel: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#1E293B',
  },
  grandTotalValue: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#6D28D9',
  },

  // ── Action Buttons Stack ──
  overlayButtonStack: {
    width: '100%',
    gap: 12,
    marginTop: 6,
  },
  primaryActionBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryGradientBtn: {
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryActionText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#6D28D9',
  },
});
