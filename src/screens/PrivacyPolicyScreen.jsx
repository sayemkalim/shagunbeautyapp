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
import { ChevronLeft, Eye, ShieldCheck, UserCheck } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

export default function PrivacyPolicyScreen({ navigation }) {
  const sections = [
    {
      id: 1,
      icon: <UserCheck size={20} color={colors.primary} />,
      title: '1. Information We Collect',
      content:
        'We collect information necessary to establish business accounts and process wholesale transactions. This includes your business name, contact details (name, email address, phone number), billing and delivery addresses, and business credentials such as registration numbers. We also log your search patterns and transaction histories within the app.',
    },
    {
      id: 2,
      icon: <Eye size={20} color={colors.primary} />,
      title: '2. How We Use Information',
      content:
        'Your information is used solely to facilitate B2B ordering and deliveries, provide responsive customer support, calculate tax/invoice details, notify you about order statuses, and occasionally share promotions or new inventory announcements tailored to your cosmetics and beauty store preferences.',
    },
    {
      id: 3,
      icon: <ShieldCheck size={20} color={colors.primary} />,
      title: '3. Data Security & Storage',
      content:
        'We implement strict electronic safeguards and encryption standards to protect your business records. Account passwords and PIN numbers are salted and hashed on secure cloud servers. Remember that security is also your responsibility: keep your Shagun Beauty PIN confidential and change it periodically.',
    },
    {
      id: 4,
      icon: <Eye size={20} color={colors.primary} />,
      title: '4. Third-Party Sharing',
      content:
        'We do not sell or rent business data to third parties. We share delivery addresses and billing details with trusted courier/logistics companies to fulfil shipments, and payment tokens with secured third-party gateway providers to facilitate card/net-banking/UPI payments.',
    },
    {
      id: 5,
      icon: <ShieldCheck size={20} color={colors.primary} />,
      title: '5. Your Control & Privacy Rights',
      content:
        'You have the right to access, update, or correct your business information at any time through the Profile screen. You can contact support if you wish to request total deletion of your profile and business registry details from Shagun Beauty networks.',
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
          <Text style={styles.introTitle}>Shagun Beauty Privacy Statement</Text>
          <Text style={styles.introDescription}>
            We value your business privacy. This policy outlines how Shagun Beauty B2B processes and protects your company and personal identifiers.
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
            For any queries or concerns regarding data processing practices, please contact us at privacy@shagunbeauty.com.
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
