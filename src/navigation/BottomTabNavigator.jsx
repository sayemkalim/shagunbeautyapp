import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { selectCartTotalQuantity } from '../redux/cartSlice';
import HomeScreen from '../screens/HomeScreen';
import BrandsScreen from '../screens/BrandsScreen';
import CartScreen from '../screens/CartScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {
  HomeTabIcon,
  BrandTabIcon,
  BagTabIcon,
  ProfileTabIcon,
} from '../components/icons';
import colors from '../theme/colors';
import fonts from '../theme/typography';

const Tab = createBottomTabNavigator();

// Centered layout container that renders a custom indicator line at the top edge of the tab bar when active
const TabIconWrapper = ({ children, focused }) => {
  return (
    <View style={styles.iconWrapper}>
      {focused && <View style={styles.topIndicator} />}
      {children}
    </View>
  );
};

const HomeTabBarIcon = ({ color, size, focused }) => (
  <TabIconWrapper focused={focused}>
    <HomeTabIcon color={color} size={size} />
  </TabIconWrapper>
);
const BrandTabBarIcon = ({ color, size, focused }) => (
  <TabIconWrapper focused={focused}>
    <BrandTabIcon color={color} size={size} />
  </TabIconWrapper>
);
const BagTabBarIcon = ({ color, size, focused }) => (
  <TabIconWrapper focused={focused}>
    <BagTabIcon color={color} size={size} />
  </TabIconWrapper>
);
const ProfileTabBarIcon = ({ color, size, focused }) => (
  <TabIconWrapper focused={focused}>
    <ProfileTabIcon color={color} size={size} />
  </TabIconWrapper>
);

export default function BottomTabNavigator() {
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#000000',
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 76,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarButton: (props) => (
          <TouchableOpacity {...props} activeOpacity={0.9} />
        ),
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: HomeTabBarIcon,
        }}
      />
      <Tab.Screen
        name="Brands"
        component={BrandsScreen}
        options={{
          tabBarLabel: 'Brands',
          tabBarIcon: BrandTabBarIcon,
        }}
      />
      <Tab.Screen
        name="Bag"
        component={CartScreen}
        options={{
          tabBarLabel: 'Bag',
          tabBarIcon: BagTabBarIcon,
          tabBarBadge: cartTotalQuantity > 0 ? cartTotalQuantity : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 10,
            fontFamily: fonts.big,
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ProfileTabBarIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  topIndicator: {
    position: 'absolute',
    top: -15, // perfectly aligns with the top edge border line of the tab bar
    width: 80,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
