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
import { ChevronLeft, FileText, Scale, ShieldAlert } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

export default function TermsConditionsScreen({ navigation }) {
  const sections = [
    {
      id: 1,
      icon: <Scale size={20} color={colors.primary} />,
      title: '1. Business Relationship & Eligibility',
      content:
        'Shagun Beauty is a B2B (Business-to-Business) wholesale platform. By registering and purchasing products through this application, you certify that you are representing a valid business entity, retail shop, or salon enterprise. You agree to provide a valid business registration number or equivalent local business documentation if requested by Shagun Beauty administration.',
    },
    {
      id: 2,
      icon: <FileText size={20} color={colors.primary} />,
      title: '2. Account Security & Pin Usage',
      content:
        'Your profile security is safeguarded by your account phone number and security PIN. You are solely responsible for maintaining the confidentiality of your credentials. Any transaction or order placed through your authenticated account is assumed to be authorized by you. Shagun Beauty is not liable for unauthorized access resulting from user negligence.',
    },
    {
      id: 3,
      icon: <Scale size={20} color={colors.primary} />,
      title: '3. Pricing, Ordering & Wholesale Terms',
      content:
        'All prices listed in the application are wholesale prices and are subject to change without prior notice based on supplier pricing and tax dynamics. Bulk orders are subject to availability. Minimum order values (MOV) may apply to qualify for specific wholesale discounts or free shipping, as displayed during checkouts.',
    },
    {
      id: 4,
      icon: <ShieldAlert size={20} color={colors.primary} />,
      title: '4. Limitation of Liability & Returns',
      content:
        'Products sold on this platform are for retail or professional salon distribution. We make every effort to verify product quality, but we disclaim any warranties, express or implied, regarding commercial viability. Returns and refunds are strictly governed by our Refund & Cancellation policies. Please note that to claim a return or replacement for any damaged or missing items, customers must record a continuous, unedited unboxing video of the parcel immediately upon delivery. Return requests without video proof will not be accepted. Shagun Beauty holds no liability for indirect or consequential damages.',
    },
    {
      id: 5,
      icon: <FileText size={20} color={colors.primary} />,
      title: '5. Intellectual Property Rights',
      content:
        'All trademarks, logos, photographs, brand catalog items, and product descriptors shown in the Shagun Beauty app are the intellectual property of their respective manufacturers or Shagun Beauty. Users are strictly prohibited from copying, scraping, or utilizing app assets for independent e-commerce ventures without written consent.',
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
          <Text style={styles.introTitle}>Shagun Beauty Terms of Service</Text>
          <Text style={styles.introDescription}>
            Please read these terms carefully before using our mobile application. By accessing or purchasing from Shagun Beauty, you agree to be bound by these Terms of Service.
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

        {/* Footer legal text */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            For any queries regarding our Terms of Service or general wholesale policies, please reach out to helpshagunbeauty@gmail.com.
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
  lastUpdated: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#E0C3FC',
    letterSpacing: 1.2,
    marginBottom: 8,
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
