import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/auth';
import { useLanguageStore } from '@/store/language';
import { useThemeStore } from '@/store/theme';
import '../global.css';

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const loadLang = useLanguageStore((s) => s.loadLang);
  const { loadTheme, isDark } = useThemeStore();

  useEffect(() => {
    loadAuth();
    loadLang();
    loadTheme();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? '#0F172A' : '#F0FDF4' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan/result" options={{ headerShown: false }} />
        <Stack.Screen name="scan/chat" options={{ headerShown: false }} />
        <Stack.Screen name="scan/compare" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
