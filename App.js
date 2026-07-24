/**
 * ShagunBeauty
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { initializeCart } from './src/redux/cartSlice';
import RootNavigator from './src/navigation/RootNavigator';
import { CustomAlertProvider } from './src/components/CustomAlert';

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
