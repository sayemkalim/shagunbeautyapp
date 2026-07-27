import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Phone, User as UserIcon } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { getUser, saveSession, getToken } from '../api/authStorage';
import { updateUserProfile } from '../api/auth';
import { Skeleton } from '../components/Skeleton';
import { moderateScale } from '../theme/responsive';

function ProfileFormSkeleton() {
  return (
    <View style={styles.content}>
      <Skeleton width="45%" height={16} radius={5} style={{ marginBottom: 24 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.inputGroup}>
          <Skeleton width="35%" height={12} radius={5} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={50} radius={6} />
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getUser();
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setPhoneNumber(user.phone || user.phoneNumber || '');
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    
    try {
      setSaving(true);
      // Optional: Call your backend API here if it exists.
      // await updateUserProfile({ name, email });
      
      // Update local storage
      const token = await getToken();
      const currentUser = await getUser();
      
      const updatedUser = {
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
      };
      
      await saveSession(token, updatedUser);
      
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.log('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <ProfileFormSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <UserIcon size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#A0A6C0"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#A0A6C0"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Number (Read-only)</Text>
            <View style={[styles.inputWrapper, styles.disabledWrapper]}>
              <Phone size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInputWithIcon, styles.disabledInputText]}
                value={phoneNumber}
                editable={false}
              />
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: { padding: 4 },
  headerTitle: { 
    fontSize: moderateScale(18), 
    fontFamily: fonts.big, 
    color: '#0F172A',
    marginLeft: 12,
  },
  content: { padding: 20 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: moderateScale(32),
    fontFamily: fonts.big,
    color: colors.primary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarName: {
    fontSize: moderateScale(20),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 4,
  },
  avatarEmail: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#0F172A',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 16,
  },
  disabledWrapper: {
    backgroundColor: '#F1F5F9',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInputWithIcon: {
    flex: 1,
    height: 50,
    fontSize: moderateScale(15),
    fontFamily: fonts.medium,
    color: '#0F172A',
  },
  disabledInputText: {
    color: '#64748B',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    height: 50,
    borderRadius: 6,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
});
