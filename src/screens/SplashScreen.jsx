import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Linking } from 'react-native';
import { getToken } from '../api/authStorage';

const extractProductId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/product\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
};

const SplashScreen = ({ navigation, route }) => {
  useEffect(() => {
    let isMounted = true;

    const goNext = async () => {
      const token = await getToken();
      if (!isMounted) {
        return;
      }

      // Check if launched via deep link URL on cold start
      let deepLinkProductId = route?.params?.productId;
      if (!deepLinkProductId) {
        try {
          const initialUrl = await Linking.getInitialURL();
          deepLinkProductId = extractProductId(initialUrl);
        } catch (e) {
          // ignore
        }
      }

      if (token) {
        navigation.replace('BottomTabs');
        if (deepLinkProductId) {
          navigation.navigate('ProductDetail', { productId: deepLinkProductId });
        }
      } else {
        navigation.replace('SignIn', {
          pendingProductId: deepLinkProductId,
        });
      }
    };

    const timer = setTimeout(goNext, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation, route]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/SBL.png')}
        style={styles.logo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 600,
    height: 600,
    resizeMode: 'contain',
  },
});

export default SplashScreen;
