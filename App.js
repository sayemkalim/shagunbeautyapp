/**
 * ShagunBeauty
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { initializeCart } from './src/redux/cartSlice';
import RootNavigator from './src/navigation/RootNavigator';
import { CustomAlertProvider } from './src/components/CustomAlert';

// Cap how much the device's system font-size setting can scale our text.
// Without this, a user with a large accessibility font size breaks fixed-width
// cards/buttons across the app (overflow, clipped labels, off-screen content).
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = 1.2;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier = 1.2;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    store.dispatch(initializeCart());
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
