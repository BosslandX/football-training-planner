import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';

const SERVER_URL = __DEV__
  ? 'http://10.0.2.2:3000' // Android emulator -> localhost
  : 'https://your-production-url.com'; // Replace with deployed URL

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'export-png':
          handleExportPNG(data.payload);
          break;
        case 'export-pdf':
          handleExportPDF(data.payload);
          break;
        case 'save-session':
          handleSaveSession(data.payload);
          break;
      }
    } catch (err) {
      console.error('Message handling error:', err);
    }
  };

  const handleExportPNG = async (base64Data: string) => {
    try {
      const RNFS = require('react-native-fs');
      const Share = require('react-native-share').default;

      const path = `${RNFS.CachesDirectoryPath}/training_${Date.now()}.png`;
      await RNFS.writeFile(path, base64Data, 'base64');

      await Share.open({
        url: `file://${path}`,
        type: 'image/png',
        title: 'Trainingsplan exportieren',
      });
    } catch (err) {
      Alert.alert('Export Fehler', 'PNG konnte nicht gespeichert werden.');
    }
  };

  const handleExportPDF = async (exportData: any) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const RNFS = require('react-native-fs');
        const Share = require('react-native-share').default;

        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const path = `${RNFS.CachesDirectoryPath}/training_${Date.now()}.pdf`;
          await RNFS.writeFile(path, base64, 'base64');
          await Share.open({
            url: `file://${path}`,
            type: 'application/pdf',
            title: 'Trainingsplan PDF exportieren',
          });
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      Alert.alert('Export Fehler', 'PDF konnte nicht erstellt werden. Ist der Server erreichbar?');
    }
  };

  const handleSaveSession = async (sessionData: any) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('lastSession', JSON.stringify(sessionData));
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // Inject bridge code into WebView
  const injectedJS = `
    (function() {
      // Override export functions to communicate with React Native
      window.ReactNativeBridge = {
        exportPNG: function(base64) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'export-png',
            payload: base64
          }));
        },
        exportPDF: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'export-pdf',
            payload: data
          }));
        },
        saveSession: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'save-session',
            payload: data
          }));
        },
        isReactNative: true
      };
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#16213e" />

      {/* Native header bar */}
      <View style={styles.header}>
        {canGoBack && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => webViewRef.current?.goBack()}
          >
            <Text style={styles.headerBtnText}>← Zurück</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>⚽ Trainingsplaner</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => webViewRef.current?.reload()}
        >
          <Text style={styles.headerBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* WebView with the training planner */}
      <WebView
        ref={webViewRef}
        source={{ uri: SERVER_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>⚽ Lade Trainingsplaner...</Text>
          </View>
        )}
        // Allow touch events for drag & drop
        scrollEnabled={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        // Performance
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3a5e',
  },
  headerTitle: {
    color: '#eee',
    fontSize: 16,
    fontWeight: '600',
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0f3460',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2a3a5e',
  },
  headerBtnText: {
    color: '#eee',
    fontSize: 14,
  },
  webview: {
    flex: 1,
    backgroundColor: '#111',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#eee',
    fontSize: 18,
  },
});
