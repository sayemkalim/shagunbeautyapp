import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { getToken } from '../api/authStorage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    let isMounted = true;

    const goNext = async () => {
      const token = await getToken();
      if (!isMounted) {
        return;
      }
      navigation.replace(token ? 'BottomTabs' : 'SignIn');
    };

    const timer = setTimeout(goNext, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation]);

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
