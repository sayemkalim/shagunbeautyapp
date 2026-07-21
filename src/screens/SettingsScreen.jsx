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
import { clearSession } from '../api/authStorage';

const MENU_ITEMS = [
  { id: '1', title: 'Account Settings', subtitle: 'Manage personal profile, email & number' },
  { id: '2', title: 'Saved Addresses', subtitle: 'Manage delivery and service locations' },
  { id: '3', title: 'Payment Details', subtitle: 'Manage saved UPI accounts and cards' },
  { id: '4', title: 'App Notifications', subtitle: 'Adjust promotional & order notifications' },
  { id: '5', title: 'Privacy & Security', subtitle: 'Change PIN or manage account access' },
];

export default function SettingsScreen({ navigation }) {
  const handleLogout = async () => {
    await clearSession();
    navigation.replace('SignIn');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Badge */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <View>
            <Text style={styles.userName}>Sayem Kalim</Text>
            <Text style={styles.userPhone}>+91 98765 43210</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} activeOpacity={0.7}>
              <View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0 (3) • Shagun Beauty</Text>
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
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: fonts.big,
    fontSize: 20,
  },
  userName: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: colors.text,
  },
  userPhone: {
    fontSize: 13,
    fontFamily: fonts.small,
    color: '#64748B',
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: fonts.small,
    color: '#64748B',
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    color: '#94A3B8',
    fontFamily: fonts.medium,
  },
  logoutButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoutButtonText: {
    fontSize: 15,
    fontFamily: fonts.big,
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fonts.small,
    color: '#94A3B8',
  },
});
