import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import SignInScreen from '../screens/SignInScreen';
import ForgotPinScreen from '../screens/ForgotPinScreen';
import BottomTabNavigator from './BottomTabNavigator';
import ProductsScreen from '../screens/ProductsScreen';
import SearchScreen from '../screens/SearchScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import AddressScreen from '../screens/AddressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import ShippingDeliveryScreen from '../screens/ShippingDeliveryScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import FAQScreen from '../screens/FAQScreen';
import ContactUsScreen from '../screens/ContactUsScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [
    'https://shagunbeauty-f00bd.web.app',
    'shagunbeauty://',
  ],

  config: {
    screens: {
      ProductDetail: 'product/:productId',

      Splash: 'splash',
      SignIn: 'signin',
      ForgotPin: 'forgot-pin',
      BottomTabs: 'home',
      Products: 'products',
      Search: 'search',
      Address: 'address',
      EditProfile: 'profile',
      Checkout: 'checkout',
      Payment: 'payment',
      TermsConditions: 'terms',
      PrivacyPolicy: 'privacy',
      ShippingDelivery: 'shipping',
      Orders: 'orders',
      OrderDetail: 'order/:orderId',
      FAQ: 'faq',
      ContactUs: 'contact',
    },
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="ForgotPin" component={ForgotPinScreen} />
        <Stack.Screen name="BottomTabs" component={BottomTabNavigator} />
        <Stack.Screen name="Products" component={ProductsScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
        />
        <Stack.Screen name="Address" component={AddressScreen} />
        <Stack.Screen name="EditProfile" component={ProfileScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen
          name="TermsConditions"
          component={TermsConditionsScreen}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
        />
        <Stack.Screen
          name="ShippingDelivery"
          component={ShippingDeliveryScreen}
        />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
        <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}