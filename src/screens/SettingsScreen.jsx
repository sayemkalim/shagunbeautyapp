import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import {
  User,
  MapPin,
  ShoppingBag,
  Truck,
  HelpCircle,
  PhoneCall,
  ShieldCheck,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

import colors from '../theme/colors';
import fonts from '../theme/typography';
import { clearSession, getUser } from '../api/authStorage';
import { clearCart } from '../redux/cartSlice';
import { moderateScale } from '../theme/responsive';

export default function SettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  const loadUser = async () => {
    const currentUser = await getUser();
    if (currentUser) {
      setUser(currentUser);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          dispatch(clearCart());
          navigation.replace('SignIn');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── User Header Profile Card ── */}
        <View style={styles.userHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'SU'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user?.name || 'Shagun User'}</Text>
            </View>
            <Text style={styles.userEmail}>{user?.email || 'helpshagunbeauty@gmail.com'}</Text>
          </View>
        </View>

        {/* ── Section: Account ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.redAccentBar} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <View style={styles.sectionCardGroup}>
            <TouchableOpacity 
              style={styles.menuItem} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EditProfile')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <User size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>Your Profile</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.noBorderItem]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Address')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <MapPin size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>Manage Address</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section: Orders ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.redAccentBar} />
            <Text style={styles.sectionTitle}>Orders</Text>
          </View>

          <View style={styles.sectionCardGroup}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Orders')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <ShoppingBag size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>My Orders</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.noBorderItem]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ShippingDelivery')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <Truck size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>Shipping & Delivery</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section: Support & Help ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.redAccentBar} />
            <Text style={styles.sectionTitle}>Support & Help</Text>
          </View>

          <View style={styles.sectionCardGroup}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('FAQ')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <HelpCircle size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>FAQs</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.noBorderItem]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ContactUs')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <PhoneCall size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>Contact Us</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section: Legal ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoAccent}>Legal</Text>
          </View>

          <View style={styles.sectionCardGroup}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PrivacyPolicy')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <ShieldCheck size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>Privacy Policy</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.noBorderItem]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TermsConditions')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconBox}>
                  <FileText size={19} color="#1E293B" />
                </View>
                <Text style={styles.menuText}>Terms & Conditions</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Log Out Item Card ── */}
        <TouchableOpacity
          style={styles.logoutCard}
          activeOpacity={0.75}
          onPress={handleLogout}>
          <View style={styles.menuLeft}>
            <View style={styles.logoutIconBox}>
              <LogOut size={19} color="#EF4444" />
            </View>
            <Text style={styles.logoutText}>Log out</Text>
          </View>
          <ChevronRight size={18} color="#F87171" />
        </TouchableOpacity>

        {/* Version Footer */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerTitle}>SHAGUN BEAUTY</Text>
          <Text style={styles.footerVersion}>Version 1.2.0</Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* User Header Profile Card */
  userHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: moderateScale(21),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  verifiedText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  userEmail: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
  },

  /* Section Styling */
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 4,
  },
  redAccentBar: {
    width: 3.5,
    height: 15,
    backgroundColor: colors.primary,
    borderRadius: 3,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  sectionTitleNoAccent: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#0F172A',
    letterSpacing: 0.2,
    marginLeft: 2,
  },
  sectionCardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },

  /* Menu Items */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  noBorderItem: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: '#0F172A',
  },

  /* Logout Item Card */
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 6,
    marginBottom: 20,
  },
  logoutIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#EF4444',
  },

  /* Version Footer */
  footerInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  footerTitle: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  footerVersion: {
    fontSize: moderateScale(11),
    fontFamily: fonts.medium,
    color: '#CBD5E1',
    marginTop: 2,
  },
});
