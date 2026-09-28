import React, { useState, useRef, useEffect } from 'react';
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
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Headphones } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { EyeIcon, EyeOffIcon } from '../components/icons';
import { moderateScale } from '../theme/responsive';
import { requestForgotPinOtp, verifyResetOtp, resetPin } from '../api/auth';
import { saveSession } from '../api/authStorage';
import { clearCart, initializeCart } from '../redux/cartSlice';

export default function ForgotPinScreen({ navigation, route }) {
  const dispatch = useDispatch();

  // Initial phone number from route params (clean out +91 if present)
  const initialPhone = (route?.params?.phone || '')
    .replace(/^\+91/, '')
    .replace(/[^0-9]/g, '');

  // Step state: 'phone' (Step 1) | 'otp' (Step 2) | 'newPin' (Step 3) | 'success'
  const [step, setStep] = useState('phone');

  // Step 1: Phone
  const [phone, setPhone] = useState(initialPhone);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [noEmailFound, setNoEmailFound] = useState(false);
  const phoneInputRef = useRef(null);

  // Step 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [focusedOtpIndex, setFocusedOtpIndex] = useState(null);
  const [timer, setTimer] = useState(60);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Step 3: New PIN
  const [resetToken, setResetToken] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isNewPinFocused, setIsNewPinFocused] = useState(false);
  const [isConfirmPinFocused, setIsConfirmPinFocused] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const newPinRef = useRef(null);
  const confirmPinRef = useRef(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // Validation flags
  const isPhoneValid = phone.trim().length === 10;
  const isOtpComplete = otp.every((d) => d.trim() !== '');
  const isNewPinValid = /^\d{4}$/.test(newPin);
  const isConfirmPinValid = /^\d{4}$/.test(confirmPin);
  const doPinsMatch = newPin === confirmPin;
  const canSubmitPin = isNewPinValid && isConfirmPinValid && doPinsMatch && !isResettingPin;

  // ----------------------------------------------------
  // STEP 1 HANDLERS: Request OTP
  // ----------------------------------------------------
  const handleRequestOtp = async () => {
    if (!isPhoneValid || isRequestingOtp) return;
    setPhoneError('');
    setNoEmailFound(false);
    setIsRequestingOtp(true);

    try {
      const data = await requestForgotPinOtp(phone);
      const emailReceived = data?.email || 'your registered email';
      setMaskedEmail(emailReceived);
      setStep('otp');
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setTimeout(() => {
        otpRefs[0]?.current?.focus();
      }, 200);
    } catch (err) {
      const errMsg = err?.message || 'Something went wrong. Please try again.';
      setPhoneError(errMsg);
      if (
        errMsg.toLowerCase().includes('email') ||
        errMsg.toLowerCase().includes('not found') ||
        errMsg.toLowerCase().includes('registered')
      ) {
        setNoEmailFound(true);
      }
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // ----------------------------------------------------
  // STEP 2 HANDLERS: Enter & Verify OTP + Resend
  // ----------------------------------------------------
  const handleOtpChange = (text, index) => {
    setOtpError('');
    const clean = text.replace(/[^0-9]/g, '');

    // Handle paste of multiple digits
    if (clean.length > 1) {
      const pastedDigits = clean.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedDigits.forEach((digit, idx) => {
        if (idx < 6) newOtp[idx] = digit;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(pastedDigits.length, 5);
      otpRefs[nextFocus]?.current?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = clean.slice(0, 1);
    setOtp(newOtp);

    // Auto-focus next box
    if (clean && index < 5) {
      otpRefs[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      setOtpError('');
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs[index - 1]?.current?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResendingOtp) return;
    setOtpError('');
    setIsResendingOtp(true);

    try {
      const data = await requestForgotPinOtp(phone);
      const emailReceived = data?.email || maskedEmail || 'your email';
      setMaskedEmail(emailReceived);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        otpRefs[0]?.current?.focus();
      }, 100);
    } catch (err) {
      setOtpError(err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (!isOtpComplete || isVerifyingOtp) return;
    setOtpError('');
    setIsVerifyingOtp(true);

    try {
      const data = await verifyResetOtp(phone, otpString);
      if (!data?.resetToken) {
        throw new Error('Verification failed. No reset token received.');
      }
      setResetToken(data.resetToken);
      setStep('newPin');
      setPinError('');
      setTimeout(() => {
        newPinRef.current?.focus();
      }, 200);
    } catch (err) {
      setOtpError(err?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsResendingOtp(false);
      setIsVerifyingOtp(false);
    }
  };

  // ----------------------------------------------------
  // STEP 3 HANDLERS: Reset PIN & Auto-Login
  // ----------------------------------------------------
  const handleResetPin = async () => {
    if (!canSubmitPin) return;
    setPinError('');
    setIsResettingPin(true);

    try {
      const cleanNewPin = String(newPin || '').trim();
      const data = await resetPin({
        resetToken: String(resetToken || '').trim(),
        newPin: cleanNewPin,
      });

      const token = data?.token;
      const userObj = data?.user || {
        id: data?.id || data?._id,
        name: data?.name,
        phone: data?.phone,
        email: data?.email,
      };

      if (token) {
        try {
          await saveSession(token, userObj);
        } catch (storageErr) {
          console.warn('Session save storage warning:', storageErr);
        }

        try {
          dispatch(clearCart());
          dispatch(initializeCart());
        } catch (cartErr) {
          console.warn('Cart initialization warning:', cartErr);
        }
      }

      // Directly replace screen to Home (BottomTabs)
      navigation.replace('BottomTabs');
    } catch (err) {
      setPinError(err?.message || 'Failed to reset PIN. Please try again.');
    } finally {
      setIsResettingPin(false);
    }
  };

  // Back button handling per step
  const handleBack = () => {
    if (step === 'phone') {
      navigation.goBack();
    } else if (step === 'otp') {
      setStep('phone');
      setOtpError('');
    } else if (step === 'newPin') {
      setStep('otp');
      setPinError('');
      setNewPin('');
      setConfirmPin('');
    } else if (step === 'success') {
      navigation.replace('BottomTabs');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -15 : 0}
      >
        {/* Top Header Row */}
        {step !== 'success' && (
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {step === 'phone' && 'Forgot PIN'}
              {step === 'otp' && 'OTP Verification'}
              {step === 'newPin' && 'Reset PIN'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step !== 'success' && (
            <View style={styles.logoWrapper}>
              <Image source={require('../../assets/SBL.png')} style={styles.logo} />
            </View>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 1: Phone Number Input                         */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 'phone' && (
            <View style={styles.container}>
              <Text style={styles.title}>Forgot PIN?</Text>
              <Text style={styles.subtitle}>
                Enter your registered mobile number to receive a 6-digit OTP on your verified email.
              </Text>

              <Text style={styles.label}>Registered Mobile Number</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => phoneInputRef.current?.focus()}
                style={[
                  styles.phoneInputContainer,
                  isPhoneFocused && styles.phoneInputContainerActive,
                ]}
              >
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
                    setPhoneError('');
                    setNoEmailFound(false);
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                />
              </TouchableOpacity>

              {!!phoneError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#EF4444" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{phoneError}</Text>
                </View>
              )}

              {noEmailFound && (
                <View style={styles.supportBanner}>
                  <Headphones size={20} color="#6366F1" />
                  <View style={styles.supportTextContainer}>
                    <Text style={styles.supportTitle}>Need Help?</Text>
                    <Text style={styles.supportSubtitle}>
                      No email address is registered with this account. Please contact customer support for assistance.
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.supportButton}
                      onPress={() => navigation.navigate('ContactUs')}
                    >
                      <Text style={styles.supportButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!isPhoneValid || isRequestingOtp) && styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={handleRequestOtp}
                disabled={!isPhoneValid || isRequestingOtp}
              >
                {isRequestingOtp ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginTouch}
                activeOpacity={0.7}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backToLoginText}>
                  Remember your PIN? <Text style={styles.backToLoginBold}>Login here</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 2: Enter & Verify 6-Digit Email OTP            */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 'otp' && (
            <View style={styles.container}>
              <Text style={styles.title}>Enter Email OTP</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit verification code to{' '}
                <Text style={styles.emailHighlight}>{maskedEmail || 'your email'}</Text>
              </Text>

              <Text style={styles.label}>6-Digit OTP Code</Text>

              {/* 6 OTP Boxes */}
              <View style={styles.otpGrid}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={otpRefs[index]}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                      focusedOtpIndex === index ? styles.otpBoxFocused : null,
                    ]}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? 6 : 1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    selectTextOnFocus={true}
                    onFocus={() => setFocusedOtpIndex(index)}
                    onBlur={() => setFocusedOtpIndex(null)}
                  />
                ))}
              </View>

              {!!otpError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#EF4444" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{otpError}</Text>
                </View>
              )}

              {/* Resend OTP Row */}
              <View style={styles.resendRow}>
                {timer > 0 ? (
                  <Text style={styles.timerText}>
                    Resend code in <Text style={styles.timerBold}>{timer}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendOtp}
                    disabled={isResendingOtp}
                    activeOpacity={0.7}
                  >
                    {isResendingOtp ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <View style={styles.resendContent}>
                        <RefreshCw size={15} color={colors.primary} style={styles.inlineIconMargin} />
                        <Text style={styles.resendButtonText}>Resend OTP</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!isOtpComplete || isVerifyingOtp) && styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={handleVerifyOtp}
                disabled={!isOtpComplete || isVerifyingOtp}
              >
                {isVerifyingOtp ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginTouch}
                activeOpacity={0.7}
                onPress={() => {
                  setStep('phone');
                  setOtpError('');
                }}
              >
                <Text style={styles.editPhoneLink}>Change mobile number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 3: Create New 4-Digit PIN                     */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 'newPin' && (
            <View style={styles.container}>
              <Text style={styles.title}>Create New PIN</Text>
              <Text style={styles.subtitle}>
                Set up a new 4-digit security PIN for your account to login securely in future.
              </Text>

              {/* New PIN Input */}
              <Text style={styles.label}>Enter New 4-Digit PIN</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => newPinRef.current?.focus()}
                style={[
                  styles.pinFieldContainer,
                  isNewPinFocused && styles.phoneInputContainerActive,
                ]}
              >
                <TextInput
                  ref={newPinRef}
                  style={styles.pinField}
                  placeholder="Enter 4-digit PIN"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={newPin}
                  onChangeText={(val) => {
                    setNewPin(val.replace(/[^0-9]/g, '').slice(0, 4));
                    setPinError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={!showNewPin}
                  onFocus={() => setIsNewPinFocused(true)}
                  onBlur={() => setIsNewPinFocused(false)}
                />
                <TouchableOpacity
                  style={styles.eyeButtonInner}
                  onPress={() => setShowNewPin((v) => !v)}
                  activeOpacity={0.7}
                >
                  {showNewPin ? (
                    <EyeOffIcon size={22} color={colors.primary} />
                  ) : (
                    <EyeIcon size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Confirm PIN Input */}
              <Text style={styles.label}>Confirm New 4-Digit PIN</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => confirmPinRef.current?.focus()}
                style={[
                  styles.pinFieldContainer,
                  isConfirmPinFocused && styles.phoneInputContainerActive,
                ]}
              >
                <TextInput
                  ref={confirmPinRef}
                  style={styles.pinField}
                  placeholder="Re-enter 4-digit PIN"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={confirmPin}
                  onChangeText={(val) => {
                    setConfirmPin(val.replace(/[^0-9]/g, '').slice(0, 4));
                    setPinError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={!showConfirmPin}
                  onFocus={() => setIsConfirmPinFocused(true)}
                  onBlur={() => setIsConfirmPinFocused(false)}
                />
                <TouchableOpacity
                  style={styles.eyeButtonInner}
                  onPress={() => setShowConfirmPin((v) => !v)}
                  activeOpacity={0.7}
                >
                  {showConfirmPin ? (
                    <EyeOffIcon size={22} color={colors.primary} />
                  ) : (
                    <EyeIcon size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>

              {confirmPin.length === 4 && !doPinsMatch && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#EF4444" style={styles.errorIcon} />
                  <Text style={styles.errorText}>PINs do not match. Please verify.</Text>
                </View>
              )}

              {!!pinError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#EF4444" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{pinError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !canSubmitPin && styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={handleResetPin}
                disabled={!canSubmitPin}
              >
                {isResettingPin ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset PIN & Login</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* STEP 4: Success Screen                             */}
          {/* ══════════════════════════════════════════════════ */}
          {step === 'success' && (
            <View style={[styles.container, styles.successContainer]}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={52} color="#16A34A" />
              </View>

              <Text style={styles.successTitle}>PIN Reset Successful!</Text>
              <Text style={styles.successSubtitle}>
                Your security PIN has been updated successfully and you are now logged in.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={() => navigation.replace('BottomTabs')}
              >
                <Text style={styles.primaryButtonText}>Go to Home</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 32,
  },
  logoWrapper: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  logo: {
    width: 340,
    height: 140,
    resizeMode: 'contain',
  },
  container: {
    width: '100%',
  },
  title: {
    fontSize: moderateScale(26),
    fontFamily: fonts.big,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.small,
    color: '#64748B',
    lineHeight: moderateScale(20),
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  emailHighlight: {
    fontFamily: fonts.big,
    color: colors.primary,
  },
  inlineIconMargin: {
    marginRight: 6,
  },
  label: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: moderateScale(13.5),
    fontFamily: fonts.medium,
    color: colors.text,
    letterSpacing: 0.2,
  },
  phoneInputContainer: {
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  phoneInputContainerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countryCodeContainer: {
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 14,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(15.5),
    color: colors.text,
    fontFamily: fonts.medium,
  },
  pinFieldContainer: {
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  pinField: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(15.5),
    color: colors.text,
    fontFamily: fonts.medium,
    letterSpacing: 2,
  },
  eyeButtonInner: {
    padding: 8,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    fontSize: moderateScale(20),
    fontFamily: fonts.big,
    color: colors.text,
  },
  otpBoxFilled: {
    backgroundColor: colors.background,
    borderColor: '#CBD5E1',
  },
  otpBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  timerText: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  timerBold: {
    color: colors.primary,
    fontFamily: fonts.big,
  },
  resendButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
  },
  resendContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: moderateScale(12.5),
    fontFamily: fonts.medium,
    lineHeight: moderateScale(17),
  },
  supportBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  supportTextContainer: {
    flex: 1,
  },
  supportTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#3730A3',
    marginBottom: 4,
  },
  supportSubtitle: {
    fontSize: moderateScale(12.5),
    fontFamily: fonts.small,
    color: '#4338CA',
    lineHeight: moderateScale(17),
    marginBottom: 10,
  },
  supportButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12.5),
    fontFamily: fonts.big,
  },
  primaryButton: {
    marginTop: 24,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: colors.inputPlaceholder,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: moderateScale(15.5),
    fontFamily: fonts.big,
    color: colors.white,
    letterSpacing: 0.3,
  },
  backToLoginTouch: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.small,
    color: '#64748B',
  },
  backToLoginBold: {
    color: colors.primary,
    fontFamily: fonts.big,
    textDecorationLine: 'underline',
  },
  editPhoneLink: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.medium,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 48,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: moderateScale(24),
    fontFamily: fonts.big,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.small,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: moderateScale(22),
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});
