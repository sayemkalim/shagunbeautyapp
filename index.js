/**
 * @format
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Global Text & TextInput font scaling protection for React 19 / React Native 0.86
// Prevents device system font-size/accessibility settings from breaking app layouts across all screens
try {
  const TextModule = require('react-native/Libraries/Text/Text');
  const OriginalText = TextModule.default;
  if (OriginalText && !OriginalText.__isWrapped) {
    const WrappedText = React.forwardRef(function CustomText(props, ref) {
      return React.createElement(OriginalText, {
        maxFontSizeMultiplier: 1.15,
        ...props,
        ref,
      });
    });
    WrappedText.__isWrapped = true;
    Object.assign(WrappedText, OriginalText);
    TextModule.default = WrappedText;
  }

  const TextInputModule = require('react-native/Libraries/Components/TextInput/TextInput');
  const OriginalTextInput = TextInputModule.default;
  if (OriginalTextInput && !OriginalTextInput.__isWrapped) {
    const WrappedTextInput = React.forwardRef(function CustomTextInput(props, ref) {
      return React.createElement(OriginalTextInput, {
        maxFontSizeMultiplier: 1.15,
        ...props,
        ref,
      });
    });
    WrappedTextInput.__isWrapped = true;
    Object.assign(WrappedTextInput, OriginalTextInput);
    TextInputModule.default = WrappedTextInput;
  }
} catch (e) {
  console.log('Failed to wrap Text/TextInput defaultProps:', e);
}

AppRegistry.registerComponent(appName, () => App);

