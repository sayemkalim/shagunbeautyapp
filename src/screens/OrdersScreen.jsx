import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShoppingBag, Calendar, ArrowRight } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { getOrderHistory } from '../api/order';
import { OrderCardSkeleton } from '../components/Skeleton';

const DUMMY_IMG = require('../../assets/dummy_product.png');

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);

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
    } catch (e) {
      console.log('Error fetching orders:', e);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
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

  const renderOrderItem = ({ item }) => {
    const statusDetails = getStatusStyle(item.status);
    const orderItems = item.items || [];
    const totalQty = orderItems.reduce((acc, current) => acc + (current.quantity || 1), 0);
    const totalAmount = parseFloat(item.finalTotalAmount?.$numberDecimal || item.finalTotalAmount || 0);

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
            keyExtractor={(subItem, index) => `${subItem.product?._id || index}`}
            renderItem={({ item: subItem }) => {
              const product = subItem.product || {};
              const imageSource = product.banner_image || (product.images && product.images[0])
                ? { uri: product.banner_image || product.images[0] }
                : DUMMY_IMG;
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
          <Text style={styles.qtyTotalText}>
            {totalQty} Item{totalQty !== 1 ? 's' : ''}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total: </Text>
            <Text style={styles.totalValue}>₹{Math.round(totalAmount)}</Text>
          </View>
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
          keyExtractor={(item) => item._id}
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
});
