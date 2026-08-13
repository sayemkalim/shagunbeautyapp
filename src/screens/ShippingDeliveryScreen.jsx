import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, Truck, Package, Clock, ShieldAlert, Info } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

export default function ShippingDeliveryScreen({ navigation }) {
  const sections = [
    {
      id: 1,
      icon: <Clock size={20} color={colors.primary} />,
      title: '1. Processing & Dispatch Timeline',
      content:
        'All orders are processed and dispatched from our centralized warehouse within 24 business hours of payment/order confirmation. Dispatch activities are paused on Sundays and national public holidays, resuming on the next business day.',
    },
    {
      id: 2,
      icon: <Truck size={20} color={colors.primary} />,
      title: '2. Shipping Charges & Free Delivery',
      content:
        'We offer FREE standard delivery across India for all wholesale orders of ₹2,000 and above. For orders below ₹2,000, a flat shipping fee of ₹50 is applied at the time of checkout. Any additional delivery charges for remote locations will be explicitly shown during payment.',
    },
    {
      id: 3,
      icon: <Package size={20} color={colors.primary} />,
      title: '3. Estimated Delivery Times',
      content:
        'Standard delivery usually takes 3 to 5 business days for major metropolitan areas and capital cities, and 5 to 7 business days for regional and suburban locations. Delivery times are estimates and may occasionally be affected by local logistics delays, weather conditions, or heavy festive loads.',
    },
    {
      id: 4,
      icon: <Info size={20} color={colors.primary} />,
      title: '4. Order Tracking & Delivery Status',
      content:
        'Once your shipment leaves our facility, tracking details (including the AWB and logistics provider link) will be updated on your order page. You can track your packages in real-time under the "My Orders" tab or through the dispatch SMS alerts.',
    },
    {
      id: 5,
      icon: <ShieldAlert size={20} color={colors.primary} />,
      title: '5. Damage Claims & Unboxing Requirement',
      content:
        'IMPORTANT: In order to request a replacement, exchange, or refund for items damaged during transit, missing items, or wrong products, you must record a single, continuous, unedited unboxing video of the package showing the shipping label and contents as they are opened. Claims without unedited video proof will not be accepted.',
    },
  ];

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
        <Text style={styles.headerTitle}>Shipping & Delivery</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Beautiful Gradient Intro Card */}
        <LinearGradient
          colors={[colors.primary, '#8b2fc9', '#a24cdb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.introCard}>
          <Text style={styles.introTitle}>Shipping & Delivery Policy</Text>
          <Text style={styles.introDescription}>
            We partner with premier courier and logistics services to deliver your cosmetics and beauty wholesale orders quickly and securely.
          </Text>
        </LinearGradient>

        {/* Sections */}
        {sections.map((sec) => (
          <View key={sec.id} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>{sec.icon}</View>
              <Text style={styles.sectionTitle}>{sec.title}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.sectionContent}>{sec.content}</Text>
          </View>
        ))}

        {/* Footer info text */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            For specific shipping requests or courier preferences, please contact our logistics support team at helpshagunbeauty@gmail.com.
          </Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  introCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  introTitle: {
    fontSize: moderateScale(20),
    fontFamily: fonts.big,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: moderateScale(24),
  },
  introDescription: {
    fontSize: moderateScale(13),
    fontFamily: fonts.small,
    color: '#F1E4FF',
    lineHeight: moderateScale(18),
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  sectionContent: {
    fontSize: moderateScale(13),
    fontFamily: fonts.small,
    color: '#475569',
    lineHeight: moderateScale(20),
    textAlign: 'justify',
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  footerText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: moderateScale(16),
  },
});
