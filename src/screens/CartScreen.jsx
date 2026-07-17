import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import fonts from '../theme/typography';

const CART_ITEMS = [
  { id: '1', name: 'M·A·C Matte Lipstick (Ruby Woo)', qty: 1, price: '₹2,150' },
  { id: '2', name: 'L\'Oréal Glycolic Bright Serum', qty: 1, price: '₹899' },
];

export default function CartScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {CART_ITEMS.map((item) => (
          <View key={item.id} style={styles.cartCard}>
            <View style={styles.cardInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
            <View style={styles.quantityControls}>
              <TouchableOpacity style={styles.qtyButton} activeOpacity={0.8}>
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.qty}</Text>
              <TouchableOpacity style={styles.qtyButton} activeOpacity={0.8}>
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Bill Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item Total</Text>
            <Text style={styles.summaryValue}>₹3,049</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes & Delivery</Text>
            <Text style={styles.summaryValue}>₹250</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹3,299</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.checkoutButton} activeOpacity={0.8}>
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.big,
    color: colors.text,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  cartCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontFamily: fonts.big,
    color: colors.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyButtonText: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: colors.text,
  },
  qtyText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: colors.text,
    marginHorizontal: 12,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 15,
    fontFamily: fonts.big,
    color: colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: fonts.small,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: fonts.big,
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: colors.primary,
  },
  checkoutButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: colors.white,
  },
});
