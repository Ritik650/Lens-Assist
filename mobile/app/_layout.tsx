import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/auth';
import { useLanguageStore } from '@/store/language';
import '../global.css';

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const loadLang = useLanguageStore((s) => s.loadLang);

  useEffect(() => {
    loadAuth();
    loadLang();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F0FDF4' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan/result" options={{ headerShown: false }} />
        <Stack.Screen name="scan/chat" options={{ headerShown: false }} />
        <Stack.Screen name="scan/compare" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
