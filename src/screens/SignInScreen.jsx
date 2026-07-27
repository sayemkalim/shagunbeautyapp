import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { GoogleIcon, EyeIcon, EyeOffIcon } from '../components/icons';
import { loginWithPhone, verifyLogin, registerUser } from '../api/auth';
import { saveSession } from '../api/authStorage';
import { clearCart, initializeCart } from '../redux/cartSlice';
import { moderateScale } from '../theme/responsive';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function SignInScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const [phone, setPhone] = useState(route?.params?.phone || '');
  const [pin, setPin] = useState(['', '', '', '']);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'pin'
  const [mode, setMode] = useState('login'); // 'login' | 'register' — which endpoint the PIN step calls
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPincodeFocused, setIsPincodeFocused] = useState(false);
  const [focusedPinIndex, setFocusedPinIndex] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const phoneInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const pincodeInputRef = useRef(null);

  const pinRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  const handleBackPress = () => {
    setStep('phone');
    setPin(['', '', '', '']);
    setName('');
    setEmail('');
    setPincode('');
    setErrorMessage('');
  };

  const handlePhoneSubmit = async () => {
    if (!isPhoneValid || isCheckingPhone) {
      return;
    }
    setErrorMessage('');
    setIsCheckingPhone(true);
    try {
      const data = await loginWithPhone(`+91${phone}`);
      const isNewUser = !!data.is_new_user;
      setMode(isNewUser ? 'register' : 'login');
      setStep('pin');
      if (isNewUser) {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);
      } else {
        setTimeout(() => {
          pinRefs[0].current?.focus();
        }, 100);
      }
    } catch (err) {
      setErrorMessage(
        err?.message || 'Something went wrong.',
      );
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handlePinChange = (text, index) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newPin = [...pin];
    newPin[index] = cleanText.substring(0, 1);
    setPin(newPin);

    // Auto-focus next cell
    if (cleanText && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (pin[index] === '' && index > 0) {
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        pinRefs[index - 1].current?.focus();
      } else {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
    }
  };

  const isPhoneValid = phone.length >= 10;
  const isPinComplete = pin.every(digit => digit !== '');
  const isNameValid = name.trim().length > 0;
  const isEmailValid = isValidEmail(email);
  const isPincodeValid = /^\d{6}$/.test(pincode);
  const isRegisterFormValid =
    mode !== 'register' || (isNameValid && isEmailValid && isPincodeValid);
  const canSubmit = isPinComplete && isRegisterFormValid && !isSubmittingPin;

  const handleLogin = async () => {
    if (!canSubmit) {
      return;
    }
    setErrorMessage('');
    setIsSubmittingPin(true);
    const fullPhone = `+91${phone}`;
    const pinValue = pin.join('');
    try {
      const data =
        mode === 'register'
          ? await registerUser({
              phoneNumber: fullPhone,
              pin: pinValue,
              name: name.trim(),
              email: email.trim(),
            })
          : await verifyLogin(fullPhone, pinValue);
      await saveSession(data.token, {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      dispatch(clearCart());
      await dispatch(initializeCart());
      navigation.replace('BottomTabs');
    } catch (err) {
      setErrorMessage(
        err?.message || 'Something went wrong.',
      );
    } finally {
      setIsSubmittingPin(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -15 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/SBL.png')}
              style={styles.logo}
            />
          </View>

          {step === 'phone' ? (
            <View style={styles.container}>
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.subtitle}>
                Login or signup using your mobile number and security PIN
              </Text>

              <Text style={styles.label}>Mobile Number</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => phoneInputRef.current?.focus()}
                style={[
                  styles.phoneInputContainer,
                  isPhoneFocused && styles.phoneInputContainerActive
                ]}>
                <View style={styles.countryCodeContainer} pointerEvents="none">
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={styles.divider} pointerEvents="none" />
                <TextInput
                  ref={phoneInputRef}
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val.replace(/[^0-9]/g, ''));
                    setErrorMessage('');
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                />
              </TouchableOpacity>

              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!isPhoneValid || isCheckingPhone) && styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={handlePhoneSubmit}
                disabled={!isPhoneValid || isCheckingPhone}>
                {isCheckingPhone ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.googleButton} activeOpacity={0.85}>
                <GoogleIcon size={22} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.container}>
              <Text style={styles.title}>
                {mode === 'register' ? 'Create PIN' : 'Enter PIN'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'register'
                  ? 'Tell us a bit about you and set a 4-digit security PIN'
                  : 'Please enter your 4-digit security PIN to login'}
              </Text>

              {mode === 'register' && (
                <>
                  <Text style={styles.label}>
                    Full Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => nameInputRef.current?.focus()}
                    style={[
                      styles.phoneInputContainer,
                      isNameFocused && styles.phoneInputContainerActive,
                    ]}>
                    <TextInput
                      ref={nameInputRef}
                      style={styles.phoneInput}
                      placeholder="Your full name"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={name}
                      onChangeText={(val) => {
                        setName(val);
                        setErrorMessage('');
                      }}
                      autoCapitalize="words"
                      onFocus={() => setIsNameFocused(true)}
                      onBlur={() => setIsNameFocused(false)}
                    />
                  </TouchableOpacity>

                  <Text style={styles.label}>
                    Email <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => emailInputRef.current?.focus()}
                    style={[
                      styles.phoneInputContainer,
                      isEmailFocused && styles.phoneInputContainerActive,
                    ]}>
                    <TextInput
                      ref={emailInputRef}
                      style={styles.phoneInput}
                      placeholder="example@email.com"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        setErrorMessage('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                    />
                  </TouchableOpacity>

                  <Text style={styles.label}>
                    Pincode <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => pincodeInputRef.current?.focus()}
                    style={[
                      styles.phoneInputContainer,
                      isPincodeFocused && styles.phoneInputContainerActive,
                    ]}>
                    <TextInput
                      ref={pincodeInputRef}
                      style={styles.phoneInput}
                      placeholder="e.g. 400001"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={pincode}
                      onChangeText={(val) => {
                        setPincode(val.replace(/[^0-9]/g, ''));
                        setErrorMessage('');
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      onFocus={() => setIsPincodeFocused(true)}
                      onBlur={() => setIsPincodeFocused(false)}
                    />
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.label}>Enter PIN</Text>

              <View style={styles.pinSection}>
                <View style={styles.pinRow}>
                  {pin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={pinRefs[index]}
                      style={[
                        styles.pinInput,
                        digit ? styles.pinInputFilled : null,
                        focusedPinIndex === index ? styles.pinInputFocused : null
                      ]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(text) => {
                        handlePinChange(text, index);
                        setErrorMessage('');
                      }}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      secureTextEntry={!showPin}
                      selectTextOnFocus={true}
                      onFocus={() => setFocusedPinIndex(index)}
                      onBlur={() => setFocusedPinIndex(null)}
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPin(v => !v)}
                  activeOpacity={0.7}>
                  {showPin ? <EyeOffIcon size={24} color={colors.primary} /> : <EyeIcon size={24} color={colors.primary} />}
                </TouchableOpacity>
              </View>

              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !canSubmit && styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={!canSubmit}>
                {isSubmittingPin ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'register' ? 'Create Account' : 'Login'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.linksRow}>
                <TouchableOpacity
                  onPress={handleBackPress}
                  activeOpacity={0.7}
                  style={styles.linkButton}>
                  <Text style={styles.linkText}>Edit phone number</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    navigation.navigate('ForgotPin');
                  }}
                  style={styles.linkButton}>
                  <Text style={styles.linkText}>Forgot PIN?</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {step === 'phone' && (
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 340,
    height: 160,
    resizeMode: 'contain',
  },
  container: {
    width: '100%',
  },
  title: {
    fontSize: moderateScale(28),
    fontFamily: fonts.big,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: moderateScale(14),
    fontFamily: fonts.small,
    color: '#334155',
    lineHeight: moderateScale(20),
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 8,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#EF4444',
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    marginTop: 12,
    textAlign: 'center',
  },
  label: {
    marginTop: 36,
    marginBottom: 10,
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: colors.text,
    letterSpacing: 0.5,
  },
  required: {
    color: '#EF4444',
  },
  phoneInputContainer: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  phoneInputContainerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  countryCodeContainer: {
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: moderateScale(16),
    fontFamily: fonts.medium,
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(49, 83, 232, 0.6)',
    marginHorizontal: 15,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(16),
    color: colors.text,
    fontFamily: fonts.medium,
  },
  pinSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  pinRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyeButton: {
    width: 48,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  pinInput: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    fontSize: moderateScale(22),
    fontFamily: fonts.big,
    color: colors.text,
  },
  pinInputFilled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  pinInputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    marginTop: 28,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: colors.inputPlaceholder,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: colors.white,
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(49, 83, 232, 0.3)',
  },
  dividerText: {
    fontSize: moderateScale(14),
    color: '#334155',
    marginHorizontal: 16,
    fontFamily: fonts.medium,
  },
  googleButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: '#475569',
  },

  termsContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.background,
  },
  termsText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.small,
    color: '#475569',
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.medium,
  },
});
