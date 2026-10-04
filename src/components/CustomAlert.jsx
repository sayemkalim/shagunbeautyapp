import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
  Animated,
} from 'react-native';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';
import { moderateScale } from '../theme/responsive';

let globalShowAlert = null;
const nativeAlert = Alert.alert;

Alert.alert = (title, message, buttons, options) => {
  if (globalShowAlert) {
    if (Array.isArray(message)) {
      globalShowAlert(title, '', message);
    } else {
      globalShowAlert(title, message, buttons);
    }
  } else {
    nativeAlert(title, message, buttons, options);
  }
};

const CustomAlertContext = createContext(null);

export const useAlert = () => {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useAlert must be used within a CustomAlertProvider');
  }
  return context;
};

export const CustomAlertProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [],
  });

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showAlert = useCallback((title, message, buttons) => {
    setConfig({
      title,
      message,
      buttons: buttons || [{ text: 'OK', onPress: () => {} }],
    });
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, fadeAnim]);

  useEffect(() => {
    globalShowAlert = showAlert;
    return () => {
      globalShowAlert = null;
    };
  }, [showAlert]);

  // Determine icon and color palette based on title and message keywords
  const iconConfig = useMemo(() => {
    const text = `${config.title || ''} ${config.message || ''}`.toLowerCase();
    if (
      text.includes('incomplete') ||
      text.includes('cancel') ||
      text.includes('fail') ||
      text.includes('error') ||
      text.includes('could not') ||
      text.includes('rejected')
    ) {
      return {
        IconComponent: AlertCircle,
        color: '#E11D48',
        bg: '#FFF1F2',
        border: '#FFE4E6',
      };
    }
    if (
      text.includes('success') ||
      text.includes('confirmed') ||
      text.includes('copied') ||
      text.includes('delivered') ||
      text.includes('thank')
    ) {
      return {
        IconComponent: CheckCircle2,
        color: '#16A34A',
        bg: '#F0FDF4',
        border: '#DCFCE7',
      };
    }
    if (
      text.includes('warning') ||
      text.includes('required') ||
      text.includes('out of stock') ||
      text.includes('mandatory') ||
      text.includes('attention')
    ) {
      return {
        IconComponent: AlertTriangle,
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FEF3C7',
      };
    }
    return {
      IconComponent: Info,
      color: colors.primary,
      bg: '#F5F3FF',
      border: '#EDE9FE',
    };
  }, [config.title, config.message]);

  return (
    <CustomAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={hideAlert}>
        <TouchableWithoutFeedback onPress={hideAlert}>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}>
                {/* Modern Icon Badge */}
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: iconConfig.bg, borderColor: iconConfig.border },
                  ]}>
                  <iconConfig.IconComponent size={26} color={iconConfig.color} strokeWidth={2.2} />
                </View>

                {config.title ? (
                  <Text style={styles.titleText}>{config.title}</Text>
                ) : null}

                {config.message ? (
                  <Text style={styles.messageText}>{config.message}</Text>
                ) : null}

                {(() => {
                  const shouldStack =
                    config.buttons.length > 2 ||
                    config.buttons.some((b) => (b.text || '').length > 16);

                  return (
                    <View
                      style={[
                        styles.buttonContainer,
                        shouldStack && styles.buttonContainerVertical,
                      ]}>
                      {config.buttons.map((btn, index) => {
                        const isDestructive = btn.style === 'destructive';
                        const isCancel = btn.style === 'cancel' || btn.text.toLowerCase() === 'cancel';

                        let btnStyle = styles.primaryButton;
                        let textStyle = styles.primaryButtonText;

                        if (isCancel) {
                          btnStyle = styles.cancelButton;
                          textStyle = styles.cancelButtonText;
                        } else if (isDestructive) {
                          btnStyle = styles.destructiveButton;
                          textStyle = styles.destructiveButtonText;
                        }

                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              btnStyle,
                              shouldStack
                                ? styles.buttonStacked
                                : config.buttons.length === 1
                                ? styles.buttonSingle
                                : styles.buttonFlex,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => {
                              hideAlert();
                              if (btn.onPress) {
                                btn.onPress();
                              }
                            }}>
                            <Text style={textStyle} numberOfLines={2}>
                              {btn.text}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </CustomAlertContext.Provider>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  alertBox: {
    width: Math.min(width - 56, 360),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  titleText: {
    fontSize: moderateScale(17),
    fontFamily: fonts.big,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  messageText: {
    fontSize: moderateScale(13.5),
    fontFamily: fonts.medium,
    color: '#64748B',
    lineHeight: moderateScale(20),
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  buttonSingle: {
    width: '100%',
  },
  buttonStacked: {
    width: '100%',
  },
  buttonFlex: {
    flex: 1,
  },
  primaryButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  cancelButton: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#475569',
    textAlign: 'center',
  },
  destructiveButton: {
    height: 48,
    backgroundColor: '#E11D48',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  destructiveButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
});
