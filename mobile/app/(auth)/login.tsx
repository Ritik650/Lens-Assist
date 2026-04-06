import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Error', 'Fill in all fields');
    setLoading(true);
    try {
      const res: any = await api.post('/auth/login', { email, password });
      await setAuth(res.access_token, res.user_id, res.email);
      router.replace('/(tabs)/scan');
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 36, fontWeight: '800', color: Colors.accent, textAlign: 'center', marginBottom: 8 }}>
          LensAssist
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 48 }}>
          AI Vision for the Physical World
        </Text>

        <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 24, gap: 16 }}>
          <TextInput
            style={{ backgroundColor: Colors.surface2, color: Colors.text, borderRadius: 10, padding: 14, fontSize: 16 }}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={{ backgroundColor: Colors.surface2, color: Colors.text, borderRadius: 10, padding: 14, fontSize: 16 }}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={{ backgroundColor: Colors.accent, borderRadius: 10, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: Colors.textMuted }}>
            Don't have an account? <Text style={{ color: Colors.accent }}>Register</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
