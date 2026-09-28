import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, MapPin, ShoppingBag, FileText, Wallet, CreditCard, Download, AlertCircle, Clock, MessageSquare, RotateCcw, ShieldCheck, CheckCircle2, Check } from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getOrderDetails, cancelOrder, returnOrder, createRazorpayOrder, verifyRazorpayPayment } from '../api/order';
import BottomSheetModal from '../components/BottomSheetModal';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

const extractImgUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string' && img.trim()) return img.trim();
  if (Array.isArray(img) && img.length > 0) {
    return extractImgUrl(img[0]);
  }
  if (typeof img === 'object') {
    return (
      img.url ||
      img.secure_url ||
      img.uri ||
      img.path ||
      img.image ||
      img.banner_image ||
      img.bannerImage ||
      img.product_image ||
      img.productImage ||
      img.thumbnail ||
      null
    );
  }
  return null;
};

const resolveOrderItemImage = (subItem) => {
  if (!subItem) return null;
  const product = (typeof subItem.product === 'object' && subItem.product) ? subItem.product : {};
  const bundle = (typeof subItem.bundle === 'object' && subItem.bundle) ? subItem.bundle : {};

  let variantObj = null;
  if (subItem.variant_sku && Array.isArray(product.variants)) {
    variantObj = product.variants.find(
      (v) => v.sku === subItem.variant_sku || v._id === subItem.variant_sku || String(v._id) === String(subItem.variant_sku)
    );
  }

  // 1. Variant specific images (image, banner_image, images)
  const variantImg =
    extractImgUrl(variantObj?.image) ||
    extractImgUrl(variantObj?.banner_image) ||
    extractImgUrl(variantObj?.bannerImage) ||
    extractImgUrl(variantObj?.images);
  if (variantImg) return variantImg;

  // 2. Direct subItem images (new backend response or item level)
  const itemImg =
    extractImgUrl(subItem.image) ||
    extractImgUrl(subItem.product_image) ||
    extractImgUrl(subItem.productImage) ||
    extractImgUrl(subItem.banner_image) ||
    extractImgUrl(subItem.bannerImage) ||
    extractImgUrl(subItem.images);
  if (itemImg) return itemImg;

  // 3. Product images (product.image first, then product.banner_image, then product.images)
  const productImg =
    extractImgUrl(product.image) ||
    extractImgUrl(product.banner_image) ||
    extractImgUrl(product.bannerImage) ||
    extractImgUrl(product.images) ||
    extractImgUrl(product.thumbnail);
  if (productImg) return productImg;

  // 4. Bundle fallback (if bundle order item)
  const bundleImg =
    extractImgUrl(bundle.image) ||
    extractImgUrl(bundle.banner_image) ||
    extractImgUrl(bundle.bannerImage) ||
    extractImgUrl(bundle.images) ||
    extractImgUrl(bundle.thumbnail);
  if (bundleImg) return bundleImg;

  return null;
};

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `https://shagunbeautybe.onrender.com${cleanPath}`;
};

const RETURN_REASONS = [
  'Damaged product',
  'Wrong item received',
  'Quality issue',
  'Other',
];

export default function OrderDetailScreen({ navigation, route }) {
  const { orderId, orderData, openPayment } = route.params || {};
  const [order, setOrder] = useState(orderData || null);
  const [isLoading, setIsLoading] = useState(!orderData);
  const [isError, setIsError] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [isReturnSheetVisible, setIsReturnSheetVisible] = useState(false);
  const [isCancelSheetVisible, setIsCancelSheetVisible] = useState(false);
  const [selectedReturnReason, setSelectedReturnReason] = useState('Damaged product');
  const [customReturnReason, setCustomReturnReason] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      setIsError(false);
      const res = await getOrderDetails(orderId);
      // Standard fetch single order returns: { data: <order doc> }
      const data = res?.data || res;
      if (data) {
        setOrder(data);
      } else {
        setIsError(true);
      }
    } catch (e) {
      console.log('Error fetching order details:', e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!order) {
      fetchOrderDetails();
    }
  }, [order, fetchOrderDetails]);

  // Handle retry payment for pending ONLINE orders
  const handleCompletePayment = useCallback(async () => {
    if (!order?._id || isCompletingPayment) return;
    try {
      setIsCompletingPayment(true);
      // 1. Call POST /api/order/razorpay/create-order passing { orderId: order._id }
      const res = await createRazorpayOrder(order._id);
      const rzpData = res?.data || res;

      if (!rzpData?.razorpayOrderId) {
        throw new Error(res?.message || 'Failed to initiate Razorpay order.');
      }

      // 2. Launch Razorpay Checkout
      const checkoutOptions = {
        key: rzpData.keyId,
        order_id: rzpData.razorpayOrderId,
        amount: rzpData.amount, // in paise
        currency: rzpData.currency || 'INR',
        name: 'Shagun Beauty',
        description: `Order #${order.orderNumber || order._id.slice(-6)} Payment`,
        prefill: {
          name: rzpData.customer?.name || order.address?.name || '',
          contact: rzpData.customer?.contact || order.address?.mobile || '',
          email: rzpData.customer?.email || '',
        },
        theme: { color: '#E91E63' },
      };

      setIsCompletingPayment(false);

      if (!RazorpayCheckout || !RazorpayCheckout.open) {
        Alert.alert('Error', 'Razorpay Checkout is not available on this device.');
        return;
      }

      RazorpayCheckout.open(checkoutOptions)
        .then(async (data) => {
          try {
            setIsCompletingPayment(true);
            const verifiedRes = await verifyRazorpayPayment({
              orderId: order._id,
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature,
            });

            const verifiedData = verifiedRes?.data || verifiedRes;
            if (verifiedData) {
              setOrder(verifiedData);
            }
            fetchOrderDetails();

            Alert.alert(
              'Payment Successful!',
              'Your payment has been successfully verified and your order is now confirmed.',
              [{ text: 'OK' }]
            );
          } catch (verifyErr) {
            console.log('Payment verification error:', verifyErr);
            Alert.alert(
              'Verification Pending',
              verifyErr?.message || 'Payment received by bank. It may take a few moments to update on the server.'
            );
          } finally {
            setIsCompletingPayment(false);
          }
        })
        .catch((err) => {
          console.log('Payment dismissed / cancelled:', err);
          setIsCompletingPayment(false);
          Alert.alert(
            'Payment Incomplete',
            'Payment was not completed. You can retry payment anytime using the Complete Payment button.'
          );
        });
    } catch (e) {
      console.log('Error creating Razorpay order:', e);
      setIsCompletingPayment(false);
      Alert.alert('Payment Error', e?.message || 'Failed to initiate Razorpay checkout. Please try again.');
    }
  }, [order, isCompletingPayment, fetchOrderDetails]);

  // If navigated with openPayment param, auto-trigger checkout when order is ready
  useEffect(() => {
    if (
      openPayment &&
      order &&
      String(order.paymentMode || '').toUpperCase() === 'ONLINE' &&
      String(order.paymentStatus || '').toLowerCase() === 'pending' &&
      String(order.status || '').toLowerCase() !== 'cancelled'
    ) {
      const timer = setTimeout(() => {
        handleCompletePayment();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [openPayment, order, handleCompletePayment]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('en-GB', options);
  };

  const getStatusStyle = (status, paymentStatus) => {
    const s = String(status || '').toLowerCase();
    const ps = String(paymentStatus || '').toLowerCase();

    if (s === 'refunded' || ps === 'refunded') {
      return { bg: '#FFE4E6', text: '#E11D48', label: 'Refunded' };
    }
    switch (s) {
      case 'out_for_delivery':
        return { bg: '#EDE9FE', text: '#6D28D9', label: 'Out for Delivery' };
      case 'delivered':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Delivered' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' };
      case 'return_requested':
        return { bg: '#FFEDD5', text: '#C2410C', label: 'Return Requested' };
      case 'returned':
        return { bg: '#CCFBF1', text: '#0F766E', label: 'Returned' };
      case 'shipped':
        return { bg: '#E0E7FF', text: '#4338CA', label: 'Shipped' };
      case 'processing':
        return { bg: '#F3E8FF', text: '#7E22CE', label: 'Processing' };
      case 'confirmed':
        return { bg: '#EFF6FF', text: '#1D4ED8', label: 'Confirmed' };
      case 'pending':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Payment Pending' };
      default:
        return { bg: '#FEF3C7', text: '#D97706', label: status || 'Pending' };
    }
  };

  const getPaymentStatusStyle = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'paid':
      case 'completed':
      case 'success':
        return { color: '#15803D', label: 'Paid' };
      case 'refunded':
        return { color: '#E11D48', label: 'Refunded' };
      case 'failed':
        return { color: '#DC2626', label: 'Failed' };
      case 'pending':
      default:
        return { color: '#D97706', label: 'Pending' };
    }
  };

  const getPaymentModeLabel = (mode) => {
    const m = String(mode || '').toUpperCase();
    if (m === 'COD') return 'Cash on Delivery';
    if (m === 'ONLINE') return 'Online Payment (Razorpay)';
    if (m === 'UPI') return 'UPI QR / Bank Transfer';
    if (mode) return String(mode);
    return 'Not specified';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ChevronLeft size={24} color="#1A1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
          </View>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ChevronLeft size={24} color="#1A1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
          </View>
        </View>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>Failed to load order details.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrderDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isRefunded = String(order.status || '').toLowerCase() === 'refunded' || String(order.paymentStatus || '').toLowerCase() === 'refunded';
  const refundAmount = order.refundAmount !== undefined && order.refundAmount !== null ? parseFloat(order.refundAmount?.$numberDecimal || order.refundAmount) : null;
  const statusDetails = getStatusStyle(order.status, order.paymentStatus);
  const orderStatus = String(order.status).toLowerCase();
  const canRetryPayment = String(order.paymentMode || '').toUpperCase() === 'ONLINE' && String(order.paymentStatus || '').toLowerCase() === 'pending' && orderStatus !== 'cancelled' && !isRefunded;
  
  const isWithin48HoursOfDelivery = () => {
    if (orderStatus !== 'delivered') return false;
    const deliveryTime = new Date(order.deliveredAt || order.updatedAt || order.createdAt);
    const currentTime = new Date();
    const diffInMs = currentTime - deliveryTime;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours <= 48;
  };

  // Cancel Order: ONLY when status in ['pending', 'confirmed', 'processing', 'shipped']
  const canCancelOrder = ['pending', 'confirmed', 'processing', 'shipped'].includes(orderStatus) && !isRefunded;
  
  // Return Order: ONLY when status === 'delivered', not already requested/returned, and within 48 hours of delivery
  const canReturnOrder = orderStatus === 'delivered' && !isRefunded && orderStatus !== 'return_requested' && orderStatus !== 'returned' && isWithin48HoursOfDelivery();

  const items = order.items || [];
  const address = order.address || {};
  const totalAmount = parseFloat(order.totalAmount?.$numberDecimal || order.totalAmount || 0);
  const shippingCost = parseFloat(order.shippingCost?.$numberDecimal || order.shippingCost || 0);
  const discountedTotal = parseFloat(order.discountedTotalAmount?.$numberDecimal || order.discountedTotalAmount || 0);
  const finalTotalAmount = parseFloat(order.finalTotalAmount?.$numberDecimal || order.finalTotalAmount || 0);
  const couponDiscountAmount = parseFloat(order.couponDiscountAmount?.$numberDecimal || order.couponDiscountAmount || 0);
  const couponCode = order.couponCode || '';
  const paymentMode = order.paymentMode || '';
  const paymentStatusDetails = getPaymentStatusStyle(order.paymentStatus);

  const handleCancelOrder = () => {
    setIsCancelSheetVisible(true);
  };

  const handleCancelOrderSubmit = async () => {
    if (isCancelling) return;
    try {
      setIsCancelling(true);
      const res = await cancelOrder(order._id || orderId);
      const updated = res?.data || res;
      setOrder((prev) => (updated ? { ...prev, ...updated } : { ...prev, status: 'cancelled' }));
      setIsCancelSheetVisible(false);
      Alert.alert('Order Cancelled', 'Order cancelled successfully');
      fetchOrderDetails();
    } catch (e) {
      console.log('Error cancelling order:', e);
      Alert.alert('Cancellation Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturnOrder = () => {
    setSelectedReturnReason('Damaged product');
    setCustomReturnReason('');
    setIsReturnSheetVisible(true);
  };

  const handleReturnOrderSubmit = async () => {
    if (isSubmittingReturn) return;
    const finalReason = selectedReturnReason === 'Other'
      ? (customReturnReason.trim() || 'Other')
      : (customReturnReason.trim() ? `${selectedReturnReason}: ${customReturnReason.trim()}` : selectedReturnReason);

    try {
      setIsSubmittingReturn(true);
      const res = await returnOrder(order._id || orderId, finalReason);
      const updated = res?.data || res;
      setOrder((prev) => (updated ? { ...prev, ...updated } : { ...prev, status: 'return_requested' }));
      setIsReturnSheetVisible(false);
      Alert.alert('Return Requested', 'Return requested successfully');
      fetchOrderDetails();
    } catch (e) {
      console.log('Error submitting return request:', e);
      Alert.alert('Return Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Address string formatting
  const fullAddress = [
    address.address,
    address.locality,
    address.city,
    address.state,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#1A1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        {(order?.billUrl || order?.billurl) && orderStatus === 'delivered' ? (
          <TouchableOpacity
            style={styles.receiptButton}
            activeOpacity={0.7}
            onPress={() => {
              const url = order.billUrl || order.billurl;
              Linking.openURL(url).catch((err) => {
                console.log('Error opening bill URL:', err);
                Alert.alert('Error', 'Unable to open invoice URL.');
              });
            }}>
            <FileText size={16} color={colors.primary} />
            <Text style={styles.receiptButtonText}>Invoice</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status & Metadata Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.orderNumberText}>Order #{order.orderNumber}</Text>
              <View style={styles.dateRow}>
                <Calendar size={12} color="#94A3B8" />
                <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusDetails.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusDetails.text }]}>
                {statusDetails.label.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Prominent Refund Information Card */}
        {isRefunded && (
          <View style={styles.sectionContainer}>
            <View style={styles.refundCard}>
              <View style={styles.refundHeaderRow}>
                <View style={styles.refundIconCircle}>
                  <RotateCcw size={20} color="#E11D48" />
                </View>
                <View style={styles.refundHeaderTextWrapper}>
                  <Text style={styles.refundTitle}>Order Refunded</Text>
                  <Text style={styles.refundSubtitle}>
                    This order has been cancelled and refunded to your original payment method.
                  </Text>
                </View>
              </View>

              <View style={styles.refundDivider} />

              <View style={styles.refundDetailsList}>
                {refundAmount !== null && (
                  <View style={styles.refundDetailRow}>
                    <Text style={styles.refundDetailLabel}>Refund Amount:</Text>
                    <Text style={styles.refundDetailValue}>₹{Math.round(refundAmount)}</Text>
                  </View>
                )}
                {order.refundedAt ? (
                  <View style={styles.refundDetailRow}>
                    <Text style={styles.refundDetailLabel}>Refunded on:</Text>
                    <Text style={styles.refundDetailDate}>
                      {new Date(order.refundedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                ) : null}
                {order.refundId ? (
                  <View style={styles.refundDetailRow}>
                    <Text style={styles.refundDetailLabel}>Refund ID / ARN:</Text>
                    <Text style={styles.refundDetailId}>{order.refundId}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Retry Payment Card for Pending Online Orders */}
        {canRetryPayment && (
          <View style={styles.sectionContainer}>
            <View style={styles.retryPaymentBanner}>
              <View style={styles.retryPaymentLeft}>
                <CreditCard size={20} color="#D97706" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.retryPaymentTitle}>Payment Pending</Text>
                  <Text style={styles.retryPaymentSubtitle}>
                    Complete your online payment to confirm this order.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.retryPayInlineBtn}
                activeOpacity={0.85}
                disabled={isCompletingPayment}
                onPress={handleCompletePayment}>
                {isCompletingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.retryPayInlineBtnText}>Pay Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Invoice Card */}
        {(order?.billUrl || order?.billurl) && orderStatus === 'delivered' ? (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.invoiceCard}
              activeOpacity={0.85}
              onPress={() => {
                const url = order.billUrl || order.billurl;
                Linking.openURL(url).catch((err) => {
                  console.log('Error opening bill URL:', err);
                  Alert.alert('Error', 'Unable to open invoice URL.');
                });
              }}>
              <View style={styles.invoiceCardContent}>
                <View style={styles.invoiceIconContainer}>
                  <FileText size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.invoiceTitle}>Download Invoice</Text>
                <View style={styles.downloadIconContainer}>
                  <Download size={18} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Return Video Note & Button - ONLY for return_requested orders */}
        {orderStatus === 'return_requested' && (
          <View style={styles.sectionContainer}>
            <View style={styles.returnNoticeCard}>
              <AlertCircle size={20} color="#B06000" />
              <View style={styles.returnNoticeTextContainer}>
                <Text style={styles.returnNoticeTitle}>Return Verification Video</Text>
                <Text style={styles.returnNoticeText}>
                  Please share your package unboxing video on WhatsApp for return validation. Mention Order ID: #{order.orderNumber}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sendVideoBtn}
                activeOpacity={0.8}
                onPress={() => {
                  const message = `Hello Shagun Beauty support, here is the unboxing video for my return request for order #${order.orderNumber}.`;
                  const url = `https://wa.me/919045791373?text=${encodeURIComponent(message)}`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Error', 'WhatsApp is not installed. Please contact support.');
                  });
                }}
              >
                <MessageSquare size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sendVideoBtnText}>Send Video on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ordered Items List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          <View style={styles.card}>
            {items.map((item, index) => {
              const product = item.product || {};
              const variantObj = (item.variant_sku && Array.isArray(product.variants))
                ? product.variants.find((v) => v.sku === item.variant_sku || v._id === item.variant_sku || String(v._id) === String(item.variant_sku))
                : null;
              const rawUri = resolveOrderItemImage(item);
              const imageUrl = getOptimizedImageUrl(rawUri, 'THUMBNAIL');
              const itemName = variantObj?.name || product.name || 'Product';

              let brandName = '';
              if (typeof product.brand === 'object' && product.brand?.name) {
                brandName = product.brand.name;
              } else if (product.brandName) {
                brandName = product.brandName;
              } else if (typeof product.brand === 'string') {
                brandName = product.brand;
              }

              const itemPrice = parseFloat(item.discounted_total_amount?.$numberDecimal || item.discounted_total_amount || item.total_amount?.$numberDecimal || item.total_amount || 0);
              const qty = item.quantity || 1;
              const unitPrice = Math.round(itemPrice / qty);

              const actualTotalPrice = parseFloat(item.total_amount?.$numberDecimal || item.total_amount || 0);
              const actualUnitPrice = Math.round(actualTotalPrice / qty);

              const targetVariantSku = item.variant_sku || variantObj?.sku || null;

              return (
                <View key={`${item._id || product._id || 'item'}-${index}`}>
                  <TouchableOpacity
                    style={styles.itemRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (product._id) {
                        navigation.navigate('ProductDetail', {
                          productId: product._id,
                          variantSku: targetVariantSku,
                        });
                      }
                    }}>
                    <View style={styles.itemImageWrapper}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl, cache: 'force-cache' }} style={styles.itemImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.placeholderContainer}>
                          <ShoppingBag size={24} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.itemDetails}>
                      {/* <Text style={styles.itemBrand}>{brandName || 'Brand'}</Text> */}
                      <Text numberOfLines={2} style={styles.itemName}>
                        {itemName}
                      </Text>
                      <Text style={styles.itemQtyPrice}>
                        Qty: {qty} • {actualUnitPrice > unitPrice ? (
                          <Text style={styles.strikethroughText}>₹{actualUnitPrice}</Text>
                        ) : null}{actualUnitPrice > unitPrice ? ' ' : ''}₹{unitPrice} / unit
                      </Text>
                      <View style={styles.itemPriceRowBelow}>
                        <Text style={styles.itemTotalPrice}>₹{Math.round(itemPrice)}</Text>
                        {actualTotalPrice > itemPrice ? (
                          <>
                            <Text style={styles.strikethroughTotal}>₹{Math.round(actualTotalPrice)}</Text>
                            <Text style={styles.savingsText}>₹{Math.round(actualTotalPrice - itemPrice)} Off</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {index < items.length - 1 && <View style={styles.itemDivider} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery Address Card */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={[styles.card, styles.cardPadding]}>
            <View style={styles.addressHeader}>
              <MapPin size={18} color={colors.primary} />
              <Text style={styles.addressName}>{address.name}</Text>
            </View>
            <Text style={styles.addressText}>{fullAddress}</Text>
            <Text style={styles.addressPincode}>Pincode: {address.pincode}</Text>
            {address.landmark ? <Text style={styles.addressText}>Landmark: {address.landmark}</Text> : null}
            <Text style={styles.addressMobile}>Mobile: {address.mobile}</Text>
          </View>
        </View>

        {/* Payment Method Card */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={[styles.card, styles.cardPadding]}>
            <View style={styles.paymentRow}>
              {paymentMode === 'COD' ? (
                <Wallet size={18} color={colors.primary} />
              ) : (
                <CreditCard size={18} color={colors.primary} />
              )}
              <Text style={styles.paymentMethodText}>{getPaymentModeLabel(paymentMode)}</Text>
            </View>
            <View style={styles.paymentSubRow}>
              <Text style={styles.paymentLabel}>Payment Status: </Text>
              <Text style={[styles.paymentValue, { color: isRefunded ? '#E11D48' : paymentStatusDetails.color }]}>
                {isRefunded ? 'Refunded' : paymentStatusDetails.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Price Calculations */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptContent}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Total Amount (MRP)</Text>
                <Text style={styles.billValue}>₹{Math.round(totalAmount)}</Text>
              </View>
              {discountedTotal < totalAmount ? (
                <>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Wholesale Discount</Text>
                    <Text style={[styles.billValue, { color: '#137333' }]}>
                      -₹{Math.round(totalAmount - discountedTotal)}
                    </Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Discounted Total</Text>
                    <Text style={styles.billValue}>₹{Math.round(discountedTotal)}</Text>
                  </View>
                </>
              ) : null}
              {couponDiscountAmount > 0 ? (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>
                    Coupon Discount{couponCode ? ` (${couponCode})` : ''}
                  </Text>
                  <Text style={[styles.billValue, { color: '#137333' }]}>
                    -₹{Math.round(couponDiscountAmount)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Shipping & Delivery</Text>
                <Text style={styles.billValue}>
                  {shippingCost > 0 ? `₹${Math.round(shippingCost)}` : 'FREE'}
                </Text>
              </View>
              <View style={styles.billDivider} />
              <View style={styles.billRowTotal}>
                <Text style={styles.billLabelTotal}>Grand Total</Text>
                <Text style={styles.billValueTotal}>₹{Math.round(finalTotalAmount)}</Text>
              </View>
            </View>
            {/* Ticket Cut / Receipt Wavy Edge */}
            <View style={styles.receiptJaggedEdgeContainer}>
              {Array.from({ length: 50 }).map((_, i) => (
                <View key={i} style={styles.jaggedTooth} />
              ))}
            </View>
          </View>
        </View>

        {/* Cancel / Return / Complete Payment Action Buttons */}
        {!isRefunded && (
          <View style={styles.actionButtonContainer}>
            {canRetryPayment ? (
              <>
                <TouchableOpacity
                  style={[styles.completePaymentPrimaryBtn, isCompletingPayment && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                  disabled={isCompletingPayment}
                  onPress={handleCompletePayment}>
                  {isCompletingPayment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CreditCard size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.actionButtonText}>Complete Payment</Text>
                    </>
                  )}
                </TouchableOpacity>

                {canCancelOrder && (
                  <TouchableOpacity
                    style={styles.cancelOutlineButton}
                    activeOpacity={0.8}
                    disabled={isCancelling || isCompletingPayment}
                    onPress={handleCancelOrder}>
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#64748B" />
                    ) : (
                      <Text style={styles.cancelOutlineButtonText}>Cancel Order</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : canReturnOrder ? (
              <TouchableOpacity
                style={styles.returnButton}
                activeOpacity={0.8}
                onPress={handleReturnOrder}>
                <Text style={styles.actionButtonText}>Return Order</Text>
              </TouchableOpacity>
            ) : canCancelOrder ? (
              <TouchableOpacity
                style={[styles.cancelButton, isCancelling && { opacity: 0.7 }]}
                activeOpacity={0.8}
                disabled={isCancelling}
                onPress={handleCancelOrder}>
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionButtonText}>Cancel Order</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}

      </ScrollView>

      {/* Return Order Bottom Sheet */}
      <BottomSheetModal
        visible={isReturnSheetVisible}
        onClose={() => !isSubmittingReturn && setIsReturnSheetVisible(false)}
        showHandle={true}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Return Order</Text>
          <Text style={styles.sheetSubtitle}>
            Please select the reason for returning Order #{order.orderNumber}
          </Text>

          <View style={styles.reasonsListContainer}>
            {RETURN_REASONS.map((reason) => {
              const isSelected = selectedReturnReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOptionCard, isSelected && styles.reasonOptionCardSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReturnReason(reason)}>
                  <View style={[styles.reasonRadioOuter, isSelected && styles.reasonRadioOuterSelected]}>
                    {isSelected && <View style={styles.reasonRadioInner} />}
                  </View>
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.commentInputContainer}>
            <Text style={styles.commentInputLabel}>
              {selectedReturnReason === 'Other' ? 'Please specify reason *' : 'Additional details (optional)'}
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder={selectedReturnReason === 'Other' ? 'Describe the reason for return...' : 'Add any additional details...'}
              placeholderTextColor="#94A3B8"
              value={customReturnReason}
              onChangeText={setCustomReturnReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.sheetButtonsRow}>
            <TouchableOpacity
              style={styles.sheetCancelBtn}
              activeOpacity={0.8}
              disabled={isSubmittingReturn}
              onPress={() => setIsReturnSheetVisible(false)}>
              <Text style={styles.sheetCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetConfirmBtnPrimary, isSubmittingReturn && { opacity: 0.7 }]}
              activeOpacity={0.85}
              disabled={isSubmittingReturn || (selectedReturnReason === 'Other' && !customReturnReason.trim())}
              onPress={handleReturnOrderSubmit}>
              {isSubmittingReturn ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sheetConfirmBtnText}>Submit Return</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>

      {/* Cancel Order Bottom Sheet */}
      <BottomSheetModal
        visible={isCancelSheetVisible}
        onClose={() => !isCancelling && setIsCancelSheetVisible(false)}
        showHandle={true}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Cancel Order</Text>
          
          <View style={[styles.infoBanner, { backgroundColor: '#FCE8E6' }]}>
            <AlertCircle size={16} color="#C5221F" />
            <Text style={[styles.infoBannerText, { color: '#C5221F' }]}>
              This action cannot be undone
            </Text>
          </View>
          
          <Text style={styles.sheetMessageText}>
            Are you sure you want to cancel Order #{order.orderNumber}? The items in this order will be returned to stock.
          </Text>

          <View style={styles.sheetButtonsRow}>
            <TouchableOpacity
              style={styles.sheetCancelBtn}
              activeOpacity={0.8}
              disabled={isCancelling}
              onPress={() => setIsCancelSheetVisible(false)}
            >
              <Text style={styles.sheetCancelBtnText}>No, Keep Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetConfirmBtnDestructive, isCancelling && { opacity: 0.7 }]}
              activeOpacity={0.85}
              disabled={isCancelling}
              onPress={handleCancelOrderSubmit}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sheetConfirmBtnText}>Yes, Cancel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginLeft: 8,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  receiptButtonText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  cardPadding: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  orderNumberText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  dateText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 8,
    marginLeft: 4,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  itemImageWrapper: {
    width: 72,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  itemBrand: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#1A1C1E',
  },
  itemName: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#1E293B',
    marginTop: 2,
  },
  itemQtyPrice: {
    fontSize: moderateScale(12),
    fontFamily: fonts.small,
    color: '#475569',
    marginTop: 4,
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemTotalPrice: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  savingsText: {
    fontSize: moderateScale(10.5),
    fontFamily: fonts.big,
    color: '#137333',
  },
  itemPriceRowBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addressName: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  addressText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#334155',
    lineHeight: 18,
  },
  addressPincode: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#334155',
    marginTop: 2,
  },
  addressMobile: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginTop: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  paymentSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  paymentLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  paymentValue: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
  },
  paymentValueCode: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#334155',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  billValue: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  billDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  billRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabelTotal: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  billValueTotal: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#334155',
    marginTop: 12,
  },
  errorText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  strikethroughTotal: {
    textDecorationLine: 'line-through',
    color: '#64748B',
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
  },
  receiptContainer: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
    backgroundColor: 'transparent',
  },
  receiptContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderBottomWidth: 0,
    padding: 16,
    paddingBottom: 24,
  },
  receiptJaggedEdgeContainer: {
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
    marginTop: -1,
  },
  jaggedTooth: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: -6,
    marginRight: -2,
  },
  actionButtonContainer: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  returnButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  invoiceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  invoiceTitle: {
    flex: 1,
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  downloadIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    flex: 1,
  },
  sheetInstructionTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  instructionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  instructionText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 18,
  },
  sheetSubmitButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  sheetSubmitButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  sheetMessageText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  sheetButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  sheetCancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  sheetCancelBtnText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#475569',
  },
  sheetConfirmBtnDestructive: {
    flex: 1,
    height: 48,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  sheetConfirmBtnText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  returnNoticeCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#B06000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  returnNoticeTextContainer: {
    alignItems: 'center',
  },
  returnNoticeTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#B06000',
    marginBottom: 4,
    textAlign: 'center',
  },
  returnNoticeText: {
    fontSize: moderateScale(12.5),
    fontFamily: fonts.medium,
    color: '#B06000',
    lineHeight: 18,
    textAlign: 'center',
  },
  sendVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#137333',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 6,
    shadowColor: '#137333',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  sendVideoBtnText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  refundCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 16,
  },
  refundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refundIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  refundHeaderTextWrapper: {
    flex: 1,
  },
  refundTitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#E11D48',
  },
  refundSubtitle: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#9F1239',
    marginTop: 2,
    lineHeight: 16,
  },
  refundDivider: {
    height: 1,
    backgroundColor: '#FECDD3',
    marginVertical: 12,
  },
  refundDetailsList: {
    gap: 8,
  },
  refundDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refundDetailLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#4B5563',
  },
  refundDetailValue: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#E11D48',
  },
  refundDetailDate: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#1F2937',
  },
  refundDetailId: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#6B7280',
  },
  retryPaymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
  },
  retryPaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  retryPaymentTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#D97706',
  },
  retryPaymentSubtitle: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#B45309',
    marginTop: 1,
  },
  retryPayInlineBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPayInlineBtnText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  completePaymentPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  cancelOutlineButton: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelOutlineButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#EF4444',
  },
  sheetSubtitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  reasonsListContainer: {
    gap: 10,
    marginBottom: 16,
  },
  reasonOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reasonOptionCardSelected: {
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary,
  },
  reasonRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reasonRadioOuterSelected: {
    borderColor: colors.primary,
  },
  reasonRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#334155',
  },
  reasonTextSelected: {
    color: colors.primary,
    fontFamily: fonts.big,
  },
  commentInputContainer: {
    marginBottom: 16,
  },
  commentInputLabel: {
    fontSize: moderateScale(12.5),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginBottom: 6,
  },
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#0F172A',
    minHeight: 70,
  },
  sheetConfirmBtnPrimary: {
    flex: 1,
    height: 48,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
});
