// Force hot reload cache reset
import React, { useState, useRef } from 'react';
import {
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
import { ArrowLeft } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { EyeIcon, EyeOffIcon } from '../components/icons';
import { moderateScale } from '../theme/responsive';

export default function ForgotPinScreen({ navigation, route }) {
  // Get email from route params if passed
  const initialEmail = route?.params?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState('email'); // 'email' | 'reset' | 'success'
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // Reset PIN inputs
  const [tempPin, setTempPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showTempPin, setShowTempPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const emailInputRef = useRef(null);

  const handleEmailSubmit = () => {
    if (isEmailValid) {
      // Mock sending temporary PIN to email
      console.log(`Sending temporary PIN to ${email}`);
      setStep('reset');
    }
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isTempPinComplete = tempPin.length === 4;
  const isNewPinComplete = newPin.length === 4;
  const isConfirmPinComplete = confirmPin.length === 4;
  const doPinsMatch = newPin === confirmPin;

  const handleResetPin = () => {
    if (isTempPinComplete && isNewPinComplete && isConfirmPinComplete && doPinsMatch) {
      setStep('success');
    }
  };

  const handleBack = () => {
    if (step === 'email') {
      navigation.goBack();
    } else if (step === 'reset') {
      setStep('email');
      setTempPin('');
      setNewPin('');
      setConfirmPin('');
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
        {/* Top Navigation Row */}
        {step !== 'success' && (
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step !== 'success' && (
            <View style={styles.logoWrapper}>
              <Image source={require('../../assets/SBL.png')} style={styles.logo} />
            </View>
          )}

          {/* STEP 1: Email Verification */}
          {step === 'email' && (
            <View style={styles.container}>
              <Text style={styles.title}>Forgot PIN?</Text>
              <Text style={styles.subtitle}>
                No worries! Enter your registered email address. We will send a temporary PIN to reset your account.
              </Text>

              <Text style={styles.label}>Email Address</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => emailInputRef.current?.focus()}
                style={[
                  styles.emailInputContainer,
                  isEmailFocused && styles.emailInputContainerActive,
                ]}
              >
                <TextInput
                  ref={emailInputRef}
                  style={styles.emailInput}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, !isEmailValid && styles.disabledButton]}
                activeOpacity={0.8}
                onPress={handleEmailSubmit}
                disabled={!isEmailValid}
              >
                <Text style={styles.primaryButtonText}>Send Temporary PIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: Reset PIN using Temporary PIN */}
          {step === 'reset' && (
            <View style={styles.container}>
              <Text style={styles.title}>Reset PIN</Text>
              <Text style={styles.subtitle}>
                Enter the temporary PIN sent to {email} to set up your new PIN.
              </Text>

              {/* Temporary PIN section */}
              <Text style={styles.label}>Temporary PIN</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={tempPin}
                  onChangeText={(text) => setTempPin(text.replace(/[^0-9]/g, ''))}
                  secureTextEntry={!showTempPin}
                  placeholder="Enter temporary PIN"
                  placeholderTextColor={colors.inputPlaceholder}
                />
                <TouchableOpacity
                  style={styles.eyeButtonInner}
                  onPress={() => setShowTempPin((v) => !v)}
                  activeOpacity={0.7}
                >
                  {showTempPin ? (
                    <EyeOffIcon size={22} color={colors.primary} />
                  ) : (
                    <EyeIcon size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* New PIN section */}
              <Text style={styles.label}>New PIN</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={newPin}
                  onChangeText={(text) => setNewPin(text.replace(/[^0-9]/g, ''))}
                  secureTextEntry={!showNewPin}
                  placeholder="Enter 4-digit new PIN"
                  placeholderTextColor={colors.inputPlaceholder}
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
              </View>

              {/* Confirm PIN section */}
              <Text style={styles.label}>Confirm New PIN</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={confirmPin}
                  onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, ''))}
                  secureTextEntry={!showConfirmPin}
                  placeholder="Confirm 4-digit PIN"
                  placeholderTextColor={colors.inputPlaceholder}
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
              </View>

              {isConfirmPinComplete && !doPinsMatch && (
                <Text style={styles.errorText}>PINs do not match</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!isTempPinComplete || !isNewPinComplete || !isConfirmPinComplete || !doPinsMatch) &&
                    styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={handleResetPin}
                disabled={!isTempPinComplete || !isNewPinComplete || !isConfirmPinComplete || !doPinsMatch}
              >
                <Text style={styles.primaryButtonText}>Update PIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Reset Success */}
          {step === 'success' && (
            <View style={[styles.container, styles.successContainer]}>
              <View style={styles.successIconCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>

              <Text style={styles.successTitle}>PIN Reset Successful!</Text>
              <Text style={styles.successSubtitle}>
                Your new security PIN has been updated successfully. You can now login with your
                new PIN.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={() => navigation.replace('SignIn', { email })}
              >
                <Text style={styles.primaryButtonText}>Back to Login</Text>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 24,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 12,
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
  label: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: colors.text,
    letterSpacing: 0.5,
  },
  emailInputContainer: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  emailInputContainerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  emailInput: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(16),
    color: colors.text,
    fontFamily: fonts.medium,
  },
  passwordInputContainer: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(16),
    color: colors.text,
    fontFamily: fonts.medium,
  },
  eyeButtonInner: {
    padding: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    marginTop: 8,
    marginLeft: 4,
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
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkMark: {
    fontSize: moderateScale(36),
    color: '#15803D',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: moderateScale(24),
    fontFamily: fonts.big,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: moderateScale(15),
    fontFamily: fonts.small,
    color: '#475569',
    textAlign: 'center',
    lineHeight: moderateScale(22),
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});
