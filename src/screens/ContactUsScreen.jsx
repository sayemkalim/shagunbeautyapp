import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Mail, MapPin, Send, MessageSquare } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';
import { submitContactQuery } from '../api/contact';

const WHATSAPP_NUMBER = '918210433552';
const HELPLINE_NUMBER = '+918210433552';
const EMAIL_ADDRESS = 'support@shagunbeauty.com';

export default function ContactUsScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isMessageFocused, setIsMessageFocused] = useState(false);

  const handleCall = () => {
    Linking.openURL(`tel:${HELPLINE_NUMBER}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate a call. Please dial +91 82104 33552 manually.');
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${EMAIL_ADDRESS}?subject=B2B Wholesale Support Query`).catch(() => {
      Alert.alert('Error', 'Mail app not found. Please email support@shagunbeauty.com.');
    });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent('Hello Shagun Beauty support team, I need help regarding wholesale products/orders.');
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed on this device.');
    });
  };

  const validateEmail = (emailStr) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(emailStr);
  };

  const handleSubmitQuery = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please enter your message.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitContactQuery({ name, email, subject: message });
      setIsSubmitting(false);
      Alert.alert(
        'Query Submitted',
        'Thank you for contacting us! Our B2B support team will reach out to you within 2-4 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setName('');
              setEmail('');
              setMessage('');
            },
          },
        ]
      );
    } catch (e) {
      console.log('Contact Us submission failed:', e);
      Alert.alert('Submission Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Header Banner */}
          <LinearGradient
            colors={['#8B5CF6', '#D946EF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}>
            <Text style={styles.bannerTitle}>How can we help you?</Text>
            <Text style={styles.bannerSubtitle}>
              Get in touch for wholesale support, order status updates, and customized B2B bulk deals.
            </Text>
          </LinearGradient>

          {/* Quick Channels Grid */}
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <View style={styles.channelsGrid}>
            <TouchableOpacity
              style={[styles.channelCard, styles.channelCardWhatsApp]}
              activeOpacity={0.8}
              onPress={handleWhatsApp}>
              <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                <MessageSquare size={20} color="#15803D" />
              </View>
              <Text style={[styles.channelName, { color: '#14532D' }]}>WhatsApp</Text>
              <Text style={styles.channelSub}>Chat Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelCard, styles.channelCardPhone]}
              activeOpacity={0.8}
              onPress={handleCall}>
              <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                <Phone size={20} color="#1D4ED8" />
              </View>
              <Text style={[styles.channelName, { color: '#1E3A8A' }]}>Call Us</Text>
              <Text style={styles.channelSub}>+91 82104 33552</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelCard, styles.channelCardEmail]}
              activeOpacity={0.8}
              onPress={handleEmail}>
              <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                <Mail size={20} color="#7E22CE" />
              </View>
              <Text style={[styles.channelName, { color: '#581C87' }]}>Email</Text>
              <Text style={styles.channelSub}>support@shagun...</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Send a Message</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isNameFocused && styles.labelFocused]}>Your Name</Text>
              <TextInput
                style={[styles.input, isNameFocused && styles.inputFocused]}
                placeholder="Enter name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isEmailFocused && styles.labelFocused]}>Email Address</Text>
              <TextInput
                style={[styles.input, isEmailFocused && styles.inputFocused]}
                placeholder="Enter email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isMessageFocused && styles.labelFocused]}>Message / Query</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, isMessageFocused && styles.inputFocused]}
                placeholder="Write your query here..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
                onFocus={() => setIsMessageFocused(true)}
                onBlur={() => setIsMessageFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButtonWrapper, isSubmitting && styles.submitButtonDisabled]}
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={handleSubmitQuery}>
              <LinearGradient
                colors={[colors.primary, '#9D4EDD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}>
                <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Sending...' : 'Submit Query'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Office Address Card */}
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <MapPin size={18} color={colors.primary} />
              <Text style={styles.addressTitle}>Corporate Office</Text>
            </View>
            <Text style={styles.addressBody}>
              Shagun Beauty & Cosmetics Warehouse,{'\n'}
              Circular Road, Lalpur, Ranchi,{'\n'}
              Jharkhand - 834001, India
            </Text>
            <Text style={styles.businessHours}>
              Business Hours: Mon - Sat (10:00 AM - 7:00 PM)
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#1A1C1E',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 4,
  },
  channelsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  channelCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  channelCardWhatsApp: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  channelCardPhone: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  channelCardEmail: {
    backgroundColor: '#FDF4FF',
    borderColor: '#E9D5FF',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  channelName: {
    fontSize: moderateScale(12),
    fontFamily: fonts.big,
  },
  channelSub: {
    fontSize: moderateScale(9),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  formTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: moderateScale(11),
    fontFamily: fonts.big,
    color: '#475569',
    marginBottom: 6,
  },
  labelFocused: {
    color: colors.primary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    height: 42,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  multilineInput: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  submitButtonWrapper: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerGradient: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: moderateScale(20),
    fontFamily: fonts.big,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 17,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: moderateScale(13),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  addressBody: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 18,
  },
  businessHours: {
    fontSize: moderateScale(10),
    fontFamily: fonts.small,
    color: '#94A3B8',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
});
