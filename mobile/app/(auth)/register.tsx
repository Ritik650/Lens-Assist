import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { Colors } from '@/constants/colors';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleRegister() {
    if (!name || !email || !password) return Alert.alert('Error', 'Fill in all fields');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      const res: any = await api.post('/auth/register', { name, email, password });
      await setAuth(res.access_token, res.user_id, res.email);
      router.replace('/(tabs)/scan');
    } catch (e: any) {
      Alert.alert('Registration failed', e.message);
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
        <Text style={{ fontSize: 32, fontWeight: '800', color: Colors.accent, textAlign: 'center', marginBottom: 8 }}>
          Create Account
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 40 }}>
          LensAssist — Team InnovAIT.
        </Text>

        <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 24, gap: 16 }}>
          {[
            { label: 'Full Name', value: name, setter: setName, type: 'default' as const },
            { label: 'Email', value: email, setter: setEmail, type: 'email-address' as const },
          ].map(({ label, value, setter, type }) => (
            <TextInput
              key={label}
              style={{ backgroundColor: Colors.surface2, color: Colors.text, borderRadius: 10, padding: 14, fontSize: 16 }}
              placeholder={label}
              placeholderTextColor={Colors.textMuted}
              value={value}
              onChangeText={setter}
              autoCapitalize="none"
              keyboardType={type}
            />
          ))}
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
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: Colors.textMuted }}>
            Already have an account? <Text style={{ color: Colors.accent }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
