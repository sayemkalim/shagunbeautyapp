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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, MapPin, ShoppingBag, FileText } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getOrderDetails } from '../api/order';

export default function OrderDetailScreen({ navigation, route }) {
  const { orderId, orderData } = route.params || {};
  const [order, setOrder] = useState(orderData || null);
  const [isLoading, setIsLoading] = useState(!orderData);
  const [isError, setIsError] = useState(false);

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
  const items = order.items || [];
  const address = order.address || {};
  const totalAmount = parseFloat(order.totalAmount?.$numberDecimal || order.totalAmount || 0);
  const shippingCost = parseFloat(order.shippingCost?.$numberDecimal || order.shippingCost || 0);
  const discountedTotal = parseFloat(order.discountedTotalAmount?.$numberDecimal || order.discountedTotalAmount || 0);
  const finalTotalAmount = parseFloat(order.finalTotalAmount?.$numberDecimal || order.finalTotalAmount || 0);

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
        <TouchableOpacity
          style={styles.receiptButton}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Generating Receipt', 'Your receipt is being generated and will download shortly.')}>
          <FileText size={16} color={colors.primary} />
          <Text style={styles.receiptButtonText}>Receipt</Text>
        </TouchableOpacity>
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
                  <View style={styles.itemRow}>
                    <View style={styles.itemImageWrapper}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.placeholderContainer}>
                          <ShoppingBag size={24} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemBrand}>{brandName || 'Brand'}</Text>
                      <Text numberOfLines={2} style={styles.itemName}>
                        {product.name}
                      </Text>
                      <Text style={styles.itemQtyPrice}>
                        Qty: {qty} • {actualUnitPrice > unitPrice ? (
                          <Text style={styles.strikethroughText}>₹{actualUnitPrice}</Text>
                        ) : null}{actualUnitPrice > unitPrice ? ' ' : ''}₹{unitPrice} / unit
                      </Text>
                    </View>
                    <View style={styles.itemPriceCol}>
                      {actualTotalPrice > itemPrice ? (
                        <Text style={styles.strikethroughTotal}>₹{Math.round(actualTotalPrice)}</Text>
                      ) : null}
                      <Text style={styles.itemTotalPrice}>₹{Math.round(itemPrice)}</Text>
                    </View>
                  </View>
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

        {/* Price Calculations */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={[styles.card, styles.cardPadding]}>
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
        </View>

      </ScrollView>
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
    color: '#94A3B8',
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
    padding: 16,
    alignItems: 'center',
  },
  itemImageWrapper: {
    width: 60,
    height: 60,
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
    color: '#475569',
    marginTop: 2,
  },
  itemQtyPrice: {
    fontSize: moderateScale(12),
    fontFamily: fonts.small,
    color: '#94A3B8',
    marginTop: 4,
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemTotalPrice: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
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
    color: '#475569',
    lineHeight: 18,
  },
  addressPincode: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
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
    color: '#64748B',
  },
  paymentValue: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
  },
  paymentValueCode: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#475569',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  billValue: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
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
    color: '#64748B',
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
    color: '#94A3B8',
  },
  strikethroughTotal: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
});
