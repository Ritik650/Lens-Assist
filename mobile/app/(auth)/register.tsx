import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useLanguageStore } from '@/store/language';
import { Colors } from '@/constants/colors';
import { t } from '@/constants/i18n';

export default function RegisterScreen() {
  const lang = useLanguageStore((s) => s.lang);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBg}>
            <Ionicons name="eye" size={36} color={Colors.accent} />
          </View>
          <Text style={styles.appName}>{t(lang, 'appName')}</Text>
          <Text style={styles.tagline}>Team InnovAIT · Hackathon 2026</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t(lang, 'fullName')}
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t(lang, 'email')}
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t(lang, 'password')}
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <Text style={styles.btnText}>{t(lang, 'creatingAccount')}</Text>
              : (
                <View style={styles.btnInner}>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>{t(lang, 'register')}</Text>
                </View>
              )
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.switchWrap}>
          <Text style={styles.switchText}>
            Already have an account?{' '}
            <Text style={styles.switchLink}>{t(lang, 'signIn')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.primaryBg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.accentBg, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: Colors.accentBorder,
  },
  appName: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tagline: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24, gap: 14,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface2, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.text, fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 4 },

  btn: {
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  switchWrap: { marginTop: 24, alignItems: 'center' },
  switchText: { color: Colors.textMuted, fontSize: 14 },
  switchLink: { color: Colors.accent, fontWeight: '700' },
});
