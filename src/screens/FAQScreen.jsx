import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = ['All', 'Orders', 'Payments', 'Shipping', 'Refunds'];

const FAQ_DATA = [
  {
    id: '1',
    category: 'Orders',
    q: 'Is there a Minimum Order Value (MOV)?',
    a: 'No, there is no minimum order value. You can place an order of any amount, big or small. However, orders below ₹2,000 will attract a delivery charge of ₹50.',
  },
  {
    id: '2',
    category: 'Payments',
    q: 'Which payment methods are accepted?',
    a: 'We accept Cash on Delivery (COD), UPI (Google Pay, PhonePe, Paytm), and major credit/debit cards during the checkout process.',
  },
  {
    id: '3',
    category: 'Shipping',
    q: 'How long does delivery take?',
    a: 'Standard shipping takes 3-5 business days across India. Orders are processed within 24 hours of placement.',
  },
  {
    id: '4',
    category: 'Orders',
    q: 'How do bulk price tiers work?',
    a: 'Higher quantities unlock lower unit prices. For example, buying 3+ or 6+ units of a single product triggers additional bulk discounts automatically.',
  },
  {
    id: '5',
    category: 'Shipping',
    q: 'Are there any shipping charges?',
    a: 'Delivery is absolutely free for all orders above ₹2,000. For orders below ₹2,000, a flat shipping fee of ₹50 is applied.',
  },
  {
    id: '6',
    category: 'Refunds',
    q: 'Can I cancel or return my order?',
    a: 'Orders can be cancelled before dispatch. Returns are only accepted if you receive damaged or defective stock. Please note that a continuous, unedited unboxing video of the parcel immediately upon delivery is mandatory to claim any returns or replacements. You must inform support within 48 hours of delivery.',
  },
];

const getCategoryDetails = (category) => {
  const cat = String(category).toLowerCase();
  switch (cat) {
    case 'orders':
      return { color: '#8B5CF6', bg: '#F5F3FF' };
    case 'payments':
      return { color: '#10B981', bg: '#ECFDF5' };
    case 'shipping':
      return { color: '#3B82F6', bg: '#EFF6FF' };
    case 'refunds':
      return { color: '#F97316', bg: '#FFF5ED' };
    default:
      return { color: '#64748B', bg: '#F8FAFC' };
  }
};

export default function FAQScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((faq) => {
      const matchesSearch =
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

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
        <Text style={styles.headerTitle}>FAQs</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
          <Search size={18} color={isSearchFocused ? colors.primary : '#94A3B8'} style={styles.searchIcon} />
          <TextInput
            placeholder="Search FAQs..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>
      </View>

      {/* Category Selector */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            if (isSelected) {
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setExpandedId(null);
                  }}>
                  <LinearGradient
                    colors={[colors.primary, '#9D4EDD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.categoryBadgeActive}>
                    <Text style={styles.categoryTextActive}>{cat}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={cat}
                style={styles.categoryBadge}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedCategory(cat);
                  setExpandedId(null);
                }}>
                <Text style={styles.categoryText}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* FAQ Items List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredFaqs.length === 0 ? (
          <View style={styles.emptyState}>
            <HelpCircle size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No matches found</Text>
            <Text style={styles.emptySubtext}>Try searching with different keywords.</Text>
          </View>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            const catDetails = getCategoryDetails(faq.category);
            return (
              <View
                key={faq.id}
                style={[
                  styles.faqCard,
                  { borderLeftColor: catDetails.color },
                  isExpanded && styles.faqCardExpanded,
                ]}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(faq.id)}>
                  <View style={styles.faqQuestionBlock}>
                    <View style={[styles.faqCategoryPill, { backgroundColor: catDetails.bg }]}>
                      <Text style={[styles.faqCategoryText, { color: catDetails.color }]}>
                        {faq.category.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={18} color={colors.primary} />
                  ) : (
                    <ChevronDown size={18} color="#94A3B8" />
                  )}
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  searchBarFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    fontFamily: fonts.medium,
    color: '#0F172A',
    paddingVertical: 0,
  },
  categoryScrollContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryBadgeActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.big,
    fontSize: moderateScale(12),
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  faqCardExpanded: {
    borderColor: colors.primary,
    backgroundColor: '#FAF5FF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  faqQuestionBlock: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  faqCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  faqCategoryText: {
    fontSize: moderateScale(9),
    fontFamily: fonts.big,
    letterSpacing: 0.5,
  },
  faqQuestion: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.big,
    color: '#0F172A',
    lineHeight: 19,
  },
  faqAnswerContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  faqAnswer: {
    fontSize: moderateScale(12.5),
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: moderateScale(15),
    fontFamily: fonts.big,
    color: '#334155',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: moderateScale(12),
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 4,
  },
});
