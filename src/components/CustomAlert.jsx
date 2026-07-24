import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import colors from '../theme/colors';
import fonts from '../theme/typography';

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

  const showAlert = useCallback((title, message, buttons) => {
    setConfig({
      title,
      message,
      buttons: buttons || [{ text: 'OK', onPress: () => {} }],
    });
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    globalShowAlert = showAlert;
    return () => {
      globalShowAlert = null;
    };
  }, [showAlert]);

  return (
    <CustomAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideAlert}>
        <TouchableWithoutFeedback onPress={hideAlert}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.alertBox}>
                {config.title ? (
                  <Text style={styles.titleText}>{config.title}</Text>
                ) : null}
                
                {config.message ? (
                  <Text style={styles.messageText}>{config.message}</Text>
                ) : null}

                <View style={styles.buttonContainer}>
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
                          config.buttons.length > 2 ? { width: '100%', marginBottom: 8 } : { flex: 1 }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          hideAlert();
                          if (btn.onPress) {
                            btn.onPress();
                          }
                        }}>
                        <Text style={textStyle}>{btn.text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </CustomAlertContext.Provider>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  alertBox: {
    width: width - 48,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  titleText: {
    fontSize: 16,
    fontFamily: fonts.big,
    color: '#0F172A',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  primaryButton: {
    height: 44,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
  cancelButton: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#0F172A',
  },
  destructiveButton: {
    height: 44,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  destructiveButtonText: {
    fontSize: 14,
    fontFamily: fonts.big,
    color: '#FFFFFF',
  },
});
