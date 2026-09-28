import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MapPin,
  Trash2,
  Edit2,
  Plus,
  Check,
  CheckCircle2,
  Target,
  ChevronRight,
} from 'lucide-react-native';

import colors from '../theme/colors';
import fonts from '../theme/typography';
import { getUser } from '../api/authStorage';
import { Skeleton } from '../components/Skeleton';
import { moderateScale } from '../theme/responsive';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../api/address';
import { store } from '../redux/store';
import { fetchAddresses as fetchReduxAddresses } from '../redux/addressSlice';

function AddressListSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 6,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width={120} height={14} radius={5} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Skeleton width={30} height={30} radius={15} />
              <Skeleton width={30} height={30} radius={15} />
            </View>
          </View>
          <Skeleton width="90%" height={12} radius={5} style={{ marginTop: 12 }} />
          <Skeleton width="60%" height={12} radius={5} style={{ marginTop: 6 }} />
          <Skeleton width="45%" height={12} radius={5} style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );
}

export default function AddressScreen({ route, navigation }) {
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null); // null when adding new
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (formPincode.trim().length === 6) {
      fetchPincodeDetails(formPincode.trim());
    }
  }, [formPincode]);

  const fetchPincodeDetails = async (pin) => {
    try {
      setFetchingPincode(true);
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        setFormCity(postOffice.District || postOffice.Block || '');
        setFormState(postOffice.State || '');
      }
    } catch (error) {
      console.log('Error fetching pincode details:', error);
    } finally {
      setFetchingPincode(false);
    }
  };

  useEffect(() => {
    loadUserAndAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserAndAddresses = async () => {
    try {
      setLoading(true);
      const currentUser = await getUser();
      if (!currentUser) {
        Alert.alert('Authentication Required', 'Please sign in to manage your addresses.', [
          { text: 'OK', onPress: () => navigation.replace('SignIn') }
        ]);
        return;
      }
      setUser(currentUser);
      
      let fetchedAddresses = [];
      try {
        fetchedAddresses = await getUserAddresses(currentUser.id);
        setAddresses(fetchedAddresses || []);
      } catch (err) {
        if (err?.statusCode === 404 || err?.status === 404) {
          setAddresses([]);
        } else {
          Alert.alert('Error', err?.message || 'Could not fetch addresses.');
        }
      }

      // Check route parameters
      const { editAddress, openAdd } = route?.params || {};
      if (editAddress) {
        const found = (fetchedAddresses || []).find(a => a._id === editAddress._id || a._id === editAddress.id);
        openEditForm(found || editAddress);
      } else if (openAdd) {
        openAddForm();
      }
    } catch (error) {
      console.error('Error loading profile or addresses:', error);
      Alert.alert('Error', 'Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async (userId) => {
    try {
      const data = await getUserAddresses(userId);
      setAddresses(data || []);
    } catch (error) {
      // API documentation states 404 can be returned with empty array if no address
      if (error?.statusCode === 404 || error?.status === 404) {
        setAddresses([]);
      } else {
        Alert.alert('Error', error?.message || 'Could not fetch addresses.');
      }
    }
  };

  const openAddForm = () => {
    setEditingAddress(null);
    setFormName('');
    setFormMobile('');
    setFormPincode('');
    setFormAddress('');
    setFormCity('');
    setFormState('');
    setFormIsPrimary(addresses.length === 0); // first address defaults to primary
    setIsFormOpen(true);
  };

  const openEditForm = (addr) => {
    setEditingAddress(addr);
    setFormName(addr.name || '');
    setFormMobile(addr.mobile || '');
    setFormPincode(addr.pincode || '');
    setFormAddress(addr.address || '');
    setFormCity(addr.city || '');
    setFormState(addr.state || '');
    setFormIsPrimary(addr.isPrimary || false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAddress(null);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      let Geolocation;
      try {
        const geoModule = require('@react-native-community/geolocation');
        Geolocation = geoModule.default || geoModule;
        if (typeof Geolocation.getCurrentPosition !== 'function') {
           throw new Error('Not linked');
        }
      } catch (e) {
        setLoadingLocation(false);
        Alert.alert(
          'GPS Module Missing',
          'Please rebuild the app to enable precise GPS. Would you like to use internet-based (approximate) location instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use IP Location', onPress: runIpGeolocationFallback }
          ]
        );
        return;
      }
      
      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLoadingLocation(false);
          Alert.alert(
            'Permission Denied',
            'GPS permission is required for precise location. Would you like to use internet-based (approximate) location instead?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use IP Location', onPress: runIpGeolocationFallback }
            ]
          );
          return;
        }
      } else if (Platform.OS === 'ios') {
        Geolocation.requestAuthorization();
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
               headers: { 'User-Agent': 'ShagunBeautyApp/1.0' }
            });
            const data = await response.json();
            if (data && data.address) {
              if (data.address.postcode) setFormPincode(data.address.postcode);
              const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
              if (city) setFormCity(city);
              if (data.address.state) setFormState(data.address.state);
            }
          } catch (geoError) {
             setLoadingLocation(false);
             Alert.alert('Geocoding Error', 'Failed to convert coordinates to address. Try again.');
          } finally {
            setLoadingLocation(false);
          }
        },
        (error) => {
          setLoadingLocation(false);
          Alert.alert(
            'GPS Failed',
            `Could not get precise location (${error.message}). Please ensure your device GPS/Location is turned on. Use approximate internet location instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use IP Location', onPress: runIpGeolocationFallback }
            ]
          );
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    } catch (err) {
      setLoadingLocation(false);
      Alert.alert('Unexpected Error', err.message);
    }
  };

  const runIpGeolocationFallback = async () => {
    try {
      setLoadingLocation(true);
      const res = await fetch('http://ip-api.com/json/');
      const data = await res.json();
      if (data && data.status === 'success') {
        if (data.zip) setFormPincode(data.zip);
        if (data.city) setFormCity(data.city);
        if (data.regionName) setFormState(data.regionName);
      } else {
        Alert.alert('Location Error', 'Could not detect location automatically.');
      }
    } catch(e) {
      Alert.alert('Location Error', 'Could not detect location automatically.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const validateForm = () => {
    if (!formName.trim()) return 'Name is required.';
    if (!formMobile.trim()) return 'Mobile number is required.';
    if (formMobile.trim().length < 10) return 'Mobile number should be at least 10 digits.';
    if (!formPincode.trim()) return 'Pincode is required.';
    if (formPincode.trim().length !== 6) return 'Pincode must be exactly 6 digits.';
    if (!formAddress.trim()) return 'Address details are required.';
    if (!formCity.trim()) return 'City is required.';
    if (!formState.trim()) return 'State is required.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    try {
      setSubmitting(true);
      const addressData = {
        name: formName.trim(),
        mobile: formMobile.trim(),
        pincode: formPincode.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        isPrimary: formIsPrimary,
      };

      if (editingAddress) {
        await updateAddress(editingAddress._id, addressData);
        Alert.alert('Success', 'Address updated successfully.');
      } else {
        await createAddress(addressData);
        Alert.alert('Success', 'Address added successfully.');
      }
      
      closeForm();
      store.dispatch(fetchReduxAddresses());
      if (user) {
        await fetchAddresses(user.id);
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to save address.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAddress(id);
              store.dispatch(fetchReduxAddresses());
              if (user) {
                await fetchAddresses(user.id);
              }
              Alert.alert('Deleted', 'Address deleted successfully.');
            } catch (error) {
              Alert.alert('Error', error?.message || 'Failed to delete address.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderAddressCard = (item) => {
    return (
      <View key={item._id} style={styles.addressCard}>
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.nameText}>{item.name}</Text>
            {item.isPrimary && (
              <View style={styles.primaryBadge}>
                <CheckCircle2 size={11} color="#047857" />
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            )}
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editActionButton]}
              onPress={() => openEditForm(item)}
              activeOpacity={0.7}>
              <Edit2 size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => handleDelete(item._id)}
              activeOpacity={0.7}>
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.addressText}>{item.address}</Text>
        <Text style={styles.cityStateText}>
          {item.city}, {item.state} - <Text style={styles.pincodeText}>{item.pincode}</Text>
        </Text>
        
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Mobile: </Text>
          <Text style={styles.mobileValue}>{item.mobile}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* ── Screen Header ── */}
      <View style={[styles.header, { justifyContent: 'flex-start' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isFormOpen) {
              closeForm();
            } else {
              navigation.goBack();
            }
          }}
          activeOpacity={0.7}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { marginLeft: 12 }]}>
          {isFormOpen ? (editingAddress ? 'EDIT ADDRESS' : 'ADD NEW ADDRESS') : 'Manage Addresses'}
        </Text>
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <AddressListSkeleton />
           <AddressListSkeleton />
        </ScrollView>
      ) : isFormOpen ? (
        /* ── Create / Edit Form Layout ── */
        <KeyboardAvoidingView
          style={[styles.flex, { backgroundColor: '#F8FAFC' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
          <ScrollView
            contentContainerStyle={styles.formContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            {/* Contact Details Card */}
            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>Contact Details</Text>
              
              <TextInput
                style={styles.cardTextInput}
                placeholder="Name*"
                placeholderTextColor="#A0A6C0"
                value={formName}
                onChangeText={setFormName}
              />

              <TextInput
                style={styles.cardTextInput}
                placeholder="Mobile No*"
                placeholderTextColor="#A0A6C0"
                keyboardType="numeric"
                maxLength={15}
                value={formMobile}
                onChangeText={setFormMobile}
              />
            </View>

            {/* Address Card */}
            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>Address</Text>
              
              {/* Geolocation Trigger */}
              <TouchableOpacity 
                style={styles.locRow} 
                onPress={handleUseCurrentLocation} 
                disabled={loadingLocation}
                activeOpacity={0.7}>
                <View style={styles.locRowLeft}>
                  <Target size={18} color={colors.primary} />
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                  ) : (
                    <Text style={styles.locText}>Use my current Location</Text>
                  )}
                </View>
                <ChevronRight size={18} color={colors.primary} />
              </TouchableOpacity>

              {/* Pin Code Input */}
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={styles.cardTextInput}
                  placeholder="Pin Code*"
                  placeholderTextColor="#A0A6C0"
                  keyboardType="numeric"
                  maxLength={6}
                  value={formPincode}
                  onChangeText={setFormPincode}
                />
                {fetchingPincode && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ position: 'absolute', right: 16, top: 16 }}
                  />
                )}
              </View>

              {/* Address locality/building/street Input */}
              <TextInput
                style={[styles.cardTextInput, styles.multilineInput]}
                placeholder="Address (locality,building,street)*"
                placeholderTextColor="#A0A6C0"
                multiline={true}
                numberOfLines={3}
                value={formAddress}
                onChangeText={setFormAddress}
              />
              <Text style={styles.orangeHelperText}>*Please update society/apartment details</Text>

              {/* City & State Grid Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <TextInput
                    style={[styles.cardTextInput, fetchingPincode && { opacity: 0.7 }]}
                    placeholder="City / District*"
                    placeholderTextColor="#A0A6C0"
                    value={formCity}
                    onChangeText={setFormCity}
                    editable={!fetchingPincode}
                  />
                </View>
                <View style={styles.gridCol}>
                  <TextInput
                    style={[styles.cardTextInput, fetchingPincode && { opacity: 0.7 }]}
                    placeholder="State*"
                    placeholderTextColor="#A0A6C0"
                    value={formState}
                    onChangeText={setFormState}
                    editable={!fetchingPincode}
                  />
                </View>
              </View>
            </View>

            {/* Primary Address Switch */}
            {/* Primary Address Checkbox */}
            <TouchableOpacity 
              style={styles.checkboxContainer}
              activeOpacity={0.8}
              onPress={() => setFormIsPrimary(!formIsPrimary)}>
              <View style={[styles.checkbox, formIsPrimary && styles.checkboxChecked]}>
                {formIsPrimary && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxTitle}>Set as Primary Address</Text>
                <Text style={styles.checkboxDesc}>
                  Use this address as the default shipping location.
                </Text>
              </View>
            </TouchableOpacity>

          </ScrollView>

          {/* Fixed Footer for Actions */}
          <View style={styles.formFooter}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={closeForm} 
              disabled={submitting}
              activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSubmit} 
              disabled={submitting}
              activeOpacity={0.8}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : addresses.length === 0 ? (
        /* ── Empty State Layout ── */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MapPin size={40} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Addresses Found</Text>
          <Text style={styles.emptyDescription}>
            Looks like you haven't added any shipping addresses yet. Add one now to place orders quickly.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={openAddForm}
            activeOpacity={0.8}>
            {/* <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} /> */}
            <Text style={styles.emptyAddButtonText}>Add New Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Addresses List View ── */
        <View style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listSubtitle}>
                {addresses.length} saved address{addresses.length > 1 ? 'es' : ''}
              </Text>
            </View>
            {addresses.map(renderAddressCard)}
          </ScrollView>

          {/* Sticky Bottom Add Address Button */}
          <View style={styles.listFooter}>
            <TouchableOpacity
              style={styles.bottomAddButton}
              onPress={openAddForm}
              activeOpacity={0.8}>
              {/* <Plus size={18} color={colors.primary} style={{ marginRight: 6 }} /> */}
              <Text style={styles.bottomAddButtonText}>ADD NEW ADDRESS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderText: {
    marginTop: 12,
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  
  /* Header Styles */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  /* Empty State Styles */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: moderateScale(14),
    fontFamily: fonts.small,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyAddButtonText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },

  /* List Styles */
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  listSubtitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#1E293B',
  },

  /* Address Card Styles */
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  nameText: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  primaryBadgeText: {
    fontSize: moderateScale(10),
    fontFamily: fonts.big,
    color: '#047857',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionButton: {
    backgroundColor: colors.primary + '15',
  },
  deleteActionButton: {
    backgroundColor: '#FEF2F2',
  },
  addressText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: '#0F172A',
    lineHeight: moderateScale(20),
    marginBottom: 4,
  },
  cityStateText: {
    fontSize: moderateScale(13),
    fontFamily: fonts.small,
    color: '#1E293B',
    marginBottom: 12,
  },
  pincodeText: {
    fontFamily: fonts.medium,
    color: '#0F172A',
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  mobileLabel: {
    fontSize: moderateScale(13),
    fontFamily: fonts.small,
    color: '#1E293B',
  },
  mobileValue: {
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#0F172A',
  },

  /* Form Styles */
  formContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: moderateScale(16),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 16,
  },
  cardTextInput: {
    height: 50,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 16,
    color: '#0F172A',
    fontFamily: fonts.medium,
    fontSize: moderateScale(14),
    marginBottom: 16,
  },
  multilineInput: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  orangeHelperText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.small,
    color: '#D97706',
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  locRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridCol: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    padding: 16,
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxTitle: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 2,
  },
  checkboxDesc: {
    fontSize: moderateScale(12),
    fontFamily: fonts.small,
    color: '#64748B',
    lineHeight: moderateScale(16),
  },
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  listFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bottomAddButton: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  bottomAddButtonText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: colors.primary,
  },
});
