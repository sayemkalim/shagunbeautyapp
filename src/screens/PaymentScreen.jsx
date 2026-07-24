import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Banknote, X, Smartphone } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import { selectCartTotalAmount, clearCart } from '../redux/cartSlice';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import BottomSheetModal from '../components/BottomSheetModal';

const UPI_ID = '8210433552@ybl';
const UPI_PAYEE_NAME = 'ShagunBeauty';

export default function PaymentScreen({ navigation }) {
  const dispatch = useDispatch();
  const totalAmount = useSelector(selectCartTotalAmount);

  // Selected Payment Method: 'cod' or 'online'
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [showQrModal, setShowQrModal] = useState(false);

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

  const handleOrderSuccess = (message) => {
    Alert.alert('Order Placed Successfully!', message, [
      {
        text: 'OK',
        onPress: () => {
          dispatch(clearCart());
          navigation.navigate('BottomTabs', { screen: 'Home' });
        },
      },
    ]);
  };

  const handlePayViaUpiApp = () => {
    Linking.openURL(upiUri).catch(() => {
      Alert.alert(
        'No UPI App Found',
        'Please install a UPI app like Google Pay or PhonePe, or scan the QR code with another device.'
      );
    });
  };

  const handleConfirmPayment = () => {
    setShowQrModal(false);
    handleOrderSuccess(`Your payment of ₹${totalAmount} has been received. Order placed!`);
  };

  const handlePayment = () => {
    if (paymentMethod === 'cod') {
      handleOrderSuccess('Your Cash on Delivery (COD) order has been confirmed.');
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
        <View style={{ width: 24 }} />
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
          style={styles.payButton}
          activeOpacity={0.85}
          onPress={handlePayment}>
          <Text style={styles.payButtonText}>
            {paymentMethod === 'cod' ? 'CONFIRM ORDER (COD)' : 'PROCEED TO PAY'}
          </Text>
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
        <Text style={styles.upiIdText}>UPI ID: {UPI_ID}</Text>

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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.big,
    color: '#1A1C1E',
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
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#64748B',
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 28,
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 15,
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
    fontSize: 15,
    fontFamily: fonts.big,
    color: '#1E293B',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#64748B',
    lineHeight: 16,
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
    fontSize: 14,
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
    fontSize: 18,
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
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  upiAmountValue: {
    fontSize: 28,
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
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  upiIdText: {
    fontSize: 13,
    fontFamily: fonts.big,
    color: '#1A1C1E',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
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
    fontSize: 15,
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
    fontSize: 15,
    fontFamily: fonts.big,
    color: colors.primary,
  },
});
