import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, MapPin, ShoppingBag, FileText, Wallet, CreditCard, Download, AlertCircle, Clock, MessageSquare } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getOrderDetails, cancelOrder } from '../api/order';
import BottomSheetModal from '../components/BottomSheetModal';

export default function OrderDetailScreen({ navigation, route }) {
  const { orderId, orderData } = route.params || {};
  const [order, setOrder] = useState(orderData || null);
  const [isLoading, setIsLoading] = useState(!orderData);
  const [isError, setIsError] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReturnSheetVisible, setIsReturnSheetVisible] = useState(false);
  const [isCancelSheetVisible, setIsCancelSheetVisible] = useState(false);

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

  const getStatusStyle = (status) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'delivered':
        return { bg: '#E6F4EA', text: '#137333', label: 'Delivered' };
      case 'cancelled':
        return { bg: '#FCE8E6', text: '#C5221F', label: 'Cancelled' };
      case 'shipped':
        return { bg: '#E8F0FE', text: '#1A73E8', label: 'Shipped' };
      case 'processing':
        return { bg: '#FEF7E0', text: '#B06000', label: 'Processing' };
      case 'confirmed':
        return { bg: '#F3E8FF', text: '#7209b7', label: 'Confirmed' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: status || 'Pending' };
    }
  };

  const getPaymentStatusStyle = (status) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'paid':
      case 'completed':
      case 'success':
        return { color: '#137333', label: 'Paid' };
      case 'failed':
        return { color: '#C5221F', label: 'Failed' };
      case 'pending':
      default:
        return { color: '#B06000', label: 'Pending' };
    }
  };

  const getPaymentModeLabel = (mode) => {
    const m = String(mode).toUpperCase();
    if (m === 'COD') return 'Cash on Delivery';
    if (mode) return 'Online Payment';
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

  const statusDetails = getStatusStyle(order.status);
  const orderStatus = String(order.status).toLowerCase();
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

  const isReturnWindowValid = () => {
    if (orderStatus !== 'delivered') return false;
    const deliveryTime = new Date(order.deliveredAt || order.updatedAt || order.createdAt);
    const currentTime = new Date();
    const diffInMs = currentTime - deliveryTime;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours <= 48;
  };

  const getDeliveryDateFormatted = () => {
    return formatDate(order.deliveredAt || order.updatedAt || order.createdAt);
  };

  const handleReturnOrder = () => {
    setIsReturnSheetVisible(true);
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

        {/* Return Video Note & Button for Cancelled Orders */}
        {orderStatus === 'cancelled' && (
          <View style={styles.sectionContainer}>
            <View style={styles.returnNoticeCard}>
              <AlertCircle size={20} color="#B06000" />
              <View style={styles.returnNoticeTextContainer}>
                <Text style={styles.returnNoticeTitle}>Return / Cancellation Details</Text>
                <Text style={styles.returnNoticeText}>
                  Please share your unboxing video on WhatsApp for validation. Mention Order ID: #{order.orderNumber}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sendVideoBtn}
                activeOpacity={0.8}
                onPress={() => {
                  const message = `Hello Shagun Beauty support, here is the unboxing video for my returned order #${order.orderNumber}.`;
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
              const imageUrl = product.banner_image || (product.images && product.images[0]);

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

              return (
                <View key={product._id || index}>
                  <TouchableOpacity
                    style={styles.itemRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (product._id) {
                        navigation.navigate('ProductDetail', { productId: product._id });
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
                        {product.name}
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
            {/* <View style={styles.paymentSubRow}>
              <Text style={styles.paymentLabel}>Payment Status: </Text>
              <Text style={[styles.paymentValue, { color: paymentStatusDetails.color }]}>
                {paymentStatusDetails.label}
              </Text>
            </View> */}
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

        {/* Cancel / Return Action Button */}
        {orderStatus !== 'cancelled' && (
          <View style={styles.actionButtonContainer}>
            {orderStatus === 'delivered' ? (
              <TouchableOpacity
                style={styles.returnButton}
                activeOpacity={0.8}
                onPress={handleReturnOrder}>
                <Text style={styles.actionButtonText}>Return Order</Text>
              </TouchableOpacity>
            ) : (
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
            )}
          </View>
        )}

      </ScrollView>

      {/* Return Order Bottom Sheet */}
      <BottomSheetModal
        visible={isReturnSheetVisible}
        onClose={() => setIsReturnSheetVisible(false)}
        showHandle={true}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Return / Replacement</Text>
          
          {isReturnWindowValid() ? (
            <>
              {/* Active Return Info */}
              <View style={[styles.infoBanner, { backgroundColor: '#E6F4EA' }]}>
                <Clock size={16} color="#137333" />
                <Text style={[styles.infoBannerText, { color: '#137333' }]}>
                  Return request window is active (48 hours)
                </Text>
              </View>
              
              <Text style={styles.sheetInstructionTitle}>Instructions for Return:</Text>
              
              <View style={styles.instructionRow}>
                <View style={styles.instructionBullet}>
                  <Text style={styles.bulletText}>1</Text>
                </View>
                <Text style={styles.instructionText}>
                  Please record an unboxing video showing the issue.
                </Text>
              </View>
              
              <View style={styles.instructionRow}>
                <View style={styles.instructionBullet}>
                  <Text style={styles.bulletText}>2</Text>
                </View>
                <Text style={styles.instructionText}>
                  Share the unboxing video and explain the issue on WhatsApp support.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.sheetSubmitButton, isCancelling && { opacity: 0.7 }]}
                activeOpacity={0.85}
                disabled={isCancelling}
                onPress={async () => {
                  if (isCancelling) return;
                  try {
                    setIsCancelling(true);
                    const res = await cancelOrder(order._id || orderId);
                    const updated = res?.data || res;
                    setOrder((prev) => (updated ? { ...prev, ...updated } : { ...prev, status: 'cancelled' }));
                    setIsReturnSheetVisible(false);
                    Alert.alert(
                      'Return Requested',
                      `Return request for Order #${order.orderNumber} submitted successfully. Please send your unboxing video on WhatsApp.`,
                      [
                        {
                          text: 'Send Video',
                          onPress: () => {
                            const message = `Hello Shagun Beauty support, here is the unboxing video for my returned order #${order.orderNumber}.`;
                            const url = `https://wa.me/919045791373?text=${encodeURIComponent(message)}`;
                            Linking.openURL(url).catch(() => {
                              Alert.alert('Error', 'WhatsApp is not installed. Please contact support.');
                            });
                          }
                        }
                      ]
                    );
                  } catch (e) {
                    console.log('Error requesting return:', e);
                    Alert.alert('Return Failed', e?.message || 'Something went wrong. Please try again.');
                  } finally {
                    setIsCancelling(false);
                  }
                }}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MessageSquare size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetSubmitButtonText}>Request Return & Send Video</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Expired Return Info */}
              <View style={[styles.infoBanner, { backgroundColor: '#FCE8E6' }]}>
                <AlertCircle size={16} color="#C5221F" />
                <Text style={[styles.infoBannerText, { color: '#C5221F' }]}>
                  Return request window is expired
                </Text>
              </View>
              
              <Text style={styles.sheetMessageText}>
                Returns are only accepted within 48 hours of delivery. This order was delivered on {getDeliveryDateFormatted()} (over 48 hours ago).
              </Text>

              <TouchableOpacity
                style={[styles.sheetSubmitButton, { backgroundColor: '#64748B' }]}
                activeOpacity={0.85}
                onPress={() => {
                  setIsReturnSheetVisible(false);
                  const message = `Hello Shagun Beauty support, I have a query regarding my delivered order #${order.orderNumber}.`;
                  const url = `https://wa.me/919045791373?text=${encodeURIComponent(message)}`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Error', 'WhatsApp is not installed. Please contact support at +91 90457 91373.');
                  });
                }}
              >
                <MessageSquare size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sheetSubmitButtonText}>Contact Support anyway</Text>
              </TouchableOpacity>
            </>
          )}
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
            Are you sure you want to cancel Order #${order.orderNumber}? The items in this order will be returned to stock.
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
              onPress={async () => {
                if (isCancelling) return;
                try {
                  setIsCancelling(true);
                  const res = await cancelOrder(order._id || orderId);
                  const updated = res?.data || res;
                  setOrder((prev) => (updated ? { ...prev, ...updated } : { ...prev, status: 'cancelled' }));
                  setIsCancelSheetVisible(false);
                  Alert.alert('Order Cancelled', `Order #${order.orderNumber} has been cancelled successfully.`);
                } catch (e) {
                  console.log('Error cancelling order:', e);
                  Alert.alert('Cancellation Failed', e?.message || 'Something went wrong. Please try again.');
                } finally {
                  setIsCancelling(false);
                }
              }}
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
});
