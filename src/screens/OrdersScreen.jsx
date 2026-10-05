import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShoppingBag, Calendar, ArrowRight, Check, X, CreditCard, RotateCcw } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getOrderHistory } from '../api/order';
import { OrderCardSkeleton } from '../components/Skeleton';
import BottomSheetModal from '../components/BottomSheetModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImageSource } from '../utils/imageOptimizer';

const TRACK_STORAGE_KEY = '@shagun_order_track_times';

const getLocalTrackTimes = async () => {
  try {
    const raw = await AsyncStorage.getItem(TRACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.log('Error reading local track times:', e);
    return {};
  }
};

const saveLocalTrackTimes = async (data) => {
  try {
    await AsyncStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.log('Error saving local track times:', e);
  }
};

const formatDateTime = (dateString) => {
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

const DUMMY_IMG = require('../../assets/dummy_product.png');

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

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isTrackSheetVisible, setIsTrackSheetVisible] = useState(false);
  const [activeTrackOrder, setActiveTrackOrder] = useState(null);
  const [localTrackTimes, setLocalTrackTimes] = useState({});

  useEffect(() => {
    const loadTimes = async () => {
      const times = await getLocalTrackTimes();
      setLocalTrackTimes(times);
    };
    loadTimes();
  }, []);

  const updateLocalTrackTimes = useCallback(async (ordersList) => {
    try {
      const currentTimes = await getLocalTrackTimes();
      let changed = false;

      ordersList.forEach((order) => {
        const orderId = order._id;
        const status = String(order.status || '').toLowerCase();
        const timestamp = order.updatedAt || order.createdAt || new Date().toISOString();

        if (!currentTimes[orderId]) {
          currentTimes[orderId] = {};
        }

        // Store placed time if not set
        if (!currentTimes[orderId].pending) {
          currentTimes[orderId].pending = order.createdAt || timestamp;
          changed = true;
        }

        // Store the current status time if not set yet
        if (status && !currentTimes[orderId][status]) {
          currentTimes[orderId][status] = timestamp;
          changed = true;
        }
      });

      if (changed) {
        await saveLocalTrackTimes(currentTimes);
        setLocalTrackTimes(currentTimes);
      }
    } catch (e) {
      console.log('Error updating local track times:', e);
    }
  }, []);

  const timelineStages = useMemo(() => {
    if (!activeTrackOrder) return [];
    
    const list = [];
    const orderId = activeTrackOrder._id;
    const status = String(activeTrackOrder.status || '').toLowerCase();
    const paymentStatus = String(activeTrackOrder.paymentStatus || '').toLowerCase();
    const orderLocalTimes = localTrackTimes[orderId] || {};
    
    // Always show Order Placed
    list.push({
      title: 'Order Placed',
      time: formatDateTime(orderLocalTimes.pending || activeTrackOrder.createdAt),
    });

    if (status === 'refunded' || paymentStatus === 'refunded') {
      list.push({
        title: 'Refunded',
        time: formatDateTime(activeTrackOrder.refundedAt || orderLocalTimes.refunded || activeTrackOrder.updatedAt),
        isCancelled: true,
      });
      return list;
    }

    if (status === 'return_requested') {
      list.push({
        title: 'Return Requested',
        time: formatDateTime(orderLocalTimes.return_requested || activeTrackOrder.updatedAt),
      });
      return list;
    }

    if (status === 'returned') {
      list.push({
        title: 'Returned',
        time: formatDateTime(orderLocalTimes.returned || activeTrackOrder.updatedAt),
      });
      return list;
    }
    
    if (status === 'cancelled') {
      list.push({
        title: 'Cancelled',
        time: formatDateTime(orderLocalTimes.cancelled || activeTrackOrder.updatedAt),
        isCancelled: true,
      });
      return list;
    }
    
    if (['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'].includes(status)) {
      const confirmedTimestamp = orderLocalTimes.confirmed || 
                                 orderLocalTimes.processing || 
                                 activeTrackOrder.confirmedAt || 
                                 (status === 'confirmed' || status === 'processing' ? activeTrackOrder.updatedAt : activeTrackOrder.createdAt);
                                 
      list.push({
        title: 'Order Confirmed',
        time: formatDateTime(confirmedTimestamp),
      });
    }
    
    if (['shipped', 'out_for_delivery', 'delivered'].includes(status)) {
      const shippedTimestamp = orderLocalTimes.shipped || 
                               activeTrackOrder.shippedAt || 
                               (status === 'shipped' ? activeTrackOrder.updatedAt : activeTrackOrder.createdAt);
                               
      list.push({
        title: 'Shipped',
        time: formatDateTime(shippedTimestamp),
      });
    }

    if (['out_for_delivery', 'delivered'].includes(status)) {
      const outTimestamp = orderLocalTimes.out_for_delivery || 
                           activeTrackOrder.outForDeliveryAt || 
                           (status === 'out_for_delivery' ? activeTrackOrder.updatedAt : activeTrackOrder.createdAt);
                           
      list.push({
        title: 'Out for Delivery',
        time: formatDateTime(outTimestamp),
      });
    }
    
    if (status === 'delivered') {
      const deliveredTimestamp = orderLocalTimes.delivered || 
                                 activeTrackOrder.deliveredAt || 
                                 activeTrackOrder.updatedAt;
                                 
      list.push({
        title: 'Delivered',
        time: formatDateTime(deliveredTimestamp),
      });
    }
    
    return list;
  }, [activeTrackOrder, localTrackTimes]);

  const fetchOrders = useCallback(async (showRefetchIndicator = false) => {
    try {
      if (showRefetchIndicator) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }
      setIsError(false);

      const res = await getOrderHistory();
      // getOrderHistory returns API envelope data, which has orders inside res.data (or res directly)
      // Standard list responses return: { data: [orders], total: N }
      const ordersList = res?.data || res || [];
      
      // Sort by newest first just in case backend does not
      const sorted = [...ordersList].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setOrders(sorted);
      updateLocalTrackTimes(sorted);
    } catch (e) {
      console.log('Error fetching orders:', e);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [updateLocalTrackTimes]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
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
        return { bg: '#FEF3C7', text: '#D97706', label: 'Pending' };
      default:
        return { bg: '#FEF3C7', text: '#D97706', label: status || 'Pending' };
    }
  };

  const renderOrderItem = ({ item }) => {
    const itemStatus = String(item.status || '').toLowerCase();
    const isRefunded = itemStatus === 'refunded' || String(item.paymentStatus || '').toLowerCase() === 'refunded';
    const isCancelled = itemStatus === 'cancelled' || !!item.isCancelled;
    const isReturned = itemStatus === 'returned' || itemStatus === 'return_requested';
    const isDelivered = itemStatus === 'delivered';
    const statusDetails = getStatusStyle(item.status, item.paymentStatus);
    const orderItems = item.items || [];
    const totalQty = orderItems.reduce((acc, current) => acc + (current.quantity || 1), 0);
    const totalAmount = parseFloat(item.finalTotalAmount?.$numberDecimal || item.finalTotalAmount || 0);
    const refundAmount = item.refundAmount !== undefined && item.refundAmount !== null ? parseFloat(item.refundAmount?.$numberDecimal || item.refundAmount) : null;
    const isPendingOnline = item.paymentMode === 'ONLINE' && item.paymentStatus === 'pending' && !isCancelled && !isRefunded;
    const canShowInvoice = isDelivered && !isCancelled && !isRefunded && !isReturned && !!(item.billUrl || item.billurl);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item._id, orderData: item })}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumberText}>Order #{item.orderNumber || 'N/A'}</Text>
            <View style={styles.dateRow}>
              <Calendar size={12} color="#94A3B8" />
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusDetails.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusDetails.text }]}>
              {statusDetails.label.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Card Body - Items Images Horizontal View */}
        <View style={styles.cardBody}>
          <FlatList
            data={orderItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(subItem, index) => `${subItem._id || subItem.product?._id || 'item'}-${index}`}
            renderItem={({ item: subItem }) => {
              const rawUri = resolveOrderItemImage(subItem);
              const imageSource = getImageSource(rawUri, 'THUMBNAIL', DUMMY_IMG);
              return (
                <View style={styles.productImageWrapper}>
                  <Image source={imageSource} style={styles.productImage} resizeMode="cover" />
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>x{subItem.quantity || 1}</Text>
                  </View>
                </View>
              );
            }}
          />
        </View>

        <View style={styles.divider} />

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.qtyTotalText}>
              {totalQty} Item{totalQty !== 1 ? 's' : ''}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total: </Text>
              <Text style={styles.totalValue}>₹{Math.round(totalAmount)}</Text>
            </View>
            {isRefunded && refundAmount !== null ? (
              <Text style={styles.refundAmountText}>Refund: ₹{Math.round(refundAmount)}</Text>
            ) : null}
            {isRefunded && item.refundedAt ? (
              <Text style={styles.refundedAtText}>Refunded on: {new Date(item.refundedAt).toLocaleDateString('en-GB')}</Text>
            ) : null}
          </View>

          {isRefunded ? (
            <View style={styles.refundedBadgeMini}>
              <RotateCcw size={12} color="#E11D48" style={{ marginRight: 4 }} />
              <Text style={styles.refundedBadgeMiniText}>Refunded</Text>
            </View>
          ) : isPendingOnline ? (
            <TouchableOpacity
              style={styles.completePaymentBtn}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('OrderDetail', { orderId: item._id, orderData: item, openPayment: true });
              }}>
              <CreditCard size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.completePaymentBtnText}>Complete Payment</Text>
            </TouchableOpacity>
          ) : (!isDelivered && !isCancelled && !isReturned) ? (
            <TouchableOpacity
              style={styles.trackBtn}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                setActiveTrackOrder(item);
                setIsTrackSheetVisible(true);
              }}>
              <Text style={styles.trackBtnText}>Track Order</Text>
            </TouchableOpacity>
          ) : canShowInvoice ? (
            <TouchableOpacity
              style={styles.invoiceBtn}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                const url = item.billUrl || item.billurl;
                Linking.openURL(url).catch((err) => {
                  console.log('Error opening bill URL:', err);
                  Alert.alert('Error', 'Unable to open invoice URL.');
                });
              }}>
              <Text style={styles.invoiceBtnText}>Invoice</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {isLoading || isRefetching ? (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
            <OrderCardSkeleton />
        </ScrollView>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>Failed to load order history.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={() => fetchOrders()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIconBox}>
            <ShoppingBag size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>
            When you purchase wholesale items, your order records will show up here.
          </Text>
          <TouchableOpacity
            style={styles.shopNowButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BottomTabs', { screen: 'Home' })}>
            <Text style={styles.shopNowButtonText}>Explore Products</Text>
            <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => (item._id ? `${item._id}-${index}` : `${index}`)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => fetchOrders(true)}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* ── Order Tracking Bottom Sheet ── */}
      <BottomSheetModal
        visible={isTrackSheetVisible}
        showHandle={true}
        onClose={() => {
          setIsTrackSheetVisible(false);
          setActiveTrackOrder(null);
        }}>
        <View style={styles.sheetHeader}>
          <Text style={styles.trackSheetTitle}>Track item</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => {
              setIsTrackSheetVisible(false);
              setActiveTrackOrder(null);
            }}>
            <X size={22} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {activeTrackOrder && (
          <View style={styles.trackSheetContent}>
            {/* Delivery Items List */}
            <View style={styles.itemsListContainer}>
              <Text style={styles.itemsListTitle}>In This Delivery</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemsListScroll}>
                {activeTrackOrder.items?.map((subItem, index) => {
                  const product = subItem.product || {};
                  const variantObj = (subItem.variant_sku && Array.isArray(product.variants))
                    ? product.variants.find((v) => v.sku === subItem.variant_sku || v._id === subItem.variant_sku || String(v._id) === String(subItem.variant_sku))
                    : null;

                  const rawUri = resolveOrderItemImage(subItem);
                  const imageSource = getImageSource(rawUri, 'THUMBNAIL', DUMMY_IMG);
                  return (
                    <View key={`${subItem._id || product._id || 'track'}-${index}`} style={styles.trackProductCard}>
                      <View style={styles.trackProductImageWrapper}>
                        <Image source={imageSource} style={styles.trackProductImage} resizeMode="cover" />
                        <View style={styles.trackProductQtyBadge}>
                          <Text style={styles.trackProductQtyText}>x{subItem.quantity || 1}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={styles.trackProductName}>
                        {variantObj?.name || product.name || 'Product'}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Timeline listing only completed stages */}
            <View style={styles.sheetTimelineContainer}>
              {timelineStages.map((stage, idx) => {
                const isLast = idx === timelineStages.length - 1;
                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, styles.timelineDotActive, stage.isCancelled && { backgroundColor: '#EF4444' }]}>
                        <Check size={10} color="#FFFFFF" strokeWidth={4} />
                      </View>
                      {!isLast && <View style={[styles.timelineLine, styles.timelineLineActive, stage.isCancelled && { backgroundColor: '#EF4444' }]} />}
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={[styles.timelineTitleActive, stage.isCancelled && { color: '#EF4444' }]}>
                        {stage.title}
                      </Text>
                      <Text style={styles.timelineTime}>{stage.time}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
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
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  cardBody: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  productImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  qtyBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderTopLeftRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  qtyBadgeText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  qtyTotalText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  totalValue: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#0F172A',
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
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  shopNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  shopNowButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  trackBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  invoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceBtnText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#10B981',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
    width: '100%',
  },
  trackSheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  trackSheetContent: {
    paddingTop: 4,
    paddingBottom: 24,
    width: '100%',
  },
  itemsListContainer: {
    marginBottom: 20,
    width: '100%',
  },
  itemsListTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#64748B',
    marginBottom: 10,
  },
  itemsListScroll: {
    gap: 12,
    paddingRight: 16,
  },
  trackProductCard: {
    width: 64,
    alignItems: 'center',
  },
  trackProductImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  trackProductImage: {
    width: '100%',
    height: '100%',
  },
  trackProductQtyBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderTopLeftRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  trackProductQtyText: {
    fontSize: moderateScale(8.5),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  trackProductName: {
    fontSize: moderateScale(10),
    fontFamily: fonts.medium,
    color: '#475569',
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
  },
  sheetTimelineContainer: {
    width: '100%',
    paddingHorizontal: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 64,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: -2,
    marginBottom: -2,
    zIndex: 1,
  },
  timelineLineActive: {
    backgroundColor: colors.primary,
  },
  timelineRight: {
    flex: 1,
    paddingTop: -2,
  },
  timelineTitleActive: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  timelineTitleInactive: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#94A3B8',
  },
  timelineTime: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },
  refundAmountText: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#E11D48',
    marginTop: 2,
  },
  refundedAtText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  refundedBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  refundedBadgeMiniText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#E11D48',
  },
  completePaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  completePaymentBtnText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
});
