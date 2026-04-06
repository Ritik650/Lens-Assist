import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/auth';
import '../global.css';

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);

  useEffect(() => {
    loadAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A1628' },
          headerTintColor: '#E8F0FE',
          contentStyle: { backgroundColor: '#0A1628' },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan/result" options={{ title: 'Scan Result', headerShown: true }} />
        <Stack.Screen name="scan/chat" options={{ title: 'Ask Questions', headerShown: true }} />
        <Stack.Screen name="scan/compare" options={{ title: 'Compare Products', headerShown: true }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
