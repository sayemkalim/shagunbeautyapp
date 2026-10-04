/**
 * ShagunBeauty
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, Text, TextInput, AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { initializeCart } from './src/store/cartStore';
import { initializeAddresses, fetchAddresses } from './src/redux/addressSlice';
import RootNavigator from './src/navigation/RootNavigator';
import { CustomAlertProvider } from './src/components/CustomAlert';

function onAppStateChange(status) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

// Cap how much the device's system font-size setting can scale our text.
// Without this, a user with a large accessibility font size breaks fixed-width
// cards/buttons across the app (overflow, clipped labels, off-screen content).
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = 1.2;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier = 1.2;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 0, // Always consider data stale so backend changes reflect instantly
      refetchOnMount: 'always', // Always fetch fresh data on screen mount / navigation
      refetchOnReconnect: 'always',
      refetchInterval: 3000, // Auto-sync active screen with backend every 3 seconds
      refetchIntervalInBackground: false, // Pause polling when app is minimized to save battery
    },
  },
});

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    initializeCart();
    store.dispatch(initializeAddresses()).then(() => {
      store.dispatch(fetchAddresses());
    });
    return () => subscription.remove();
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#FFFFFF"
            translucent={false}
          />
          <CustomAlertProvider>
            <RootNavigator />
          </CustomAlertProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
