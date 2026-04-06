import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useProfileStore } from '@/store/profile';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';
import { getScanHistory } from '@/services/scan';

export default function DashboardScreen() {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [prof, scans, exp] = await Promise.all([
          api.get('/profile'),
          getScanHistory(5),
          api.get('/expenses/summary'),
        ]);
        setProfile(prof as any);
        setRecentScans((scans as any[]).slice(0, 5));
        setExpenses(exp);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  const alertCount = (profile?.allergies?.length ?? 0) + (profile?.conditions?.length ?? 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.primary }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={{ fontSize: 13, color: Colors.textMuted }}>Welcome back</Text>
      <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 24 }}>
        {profile?.name ?? 'User'} 👋
      </Text>

      {/* Alert card if user has health data */}
      {alertCount > 0 && (
        <View style={{ backgroundColor: '#2A1A1A', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.danger + '40' }}>
          <Text style={{ color: Colors.danger, fontWeight: '700', marginBottom: 4 }}>⚠️ Active Health Alerts</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
            {profile?.allergies?.length} allergens · {profile?.conditions?.length} conditions tracked
          </Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: Colors.accent, borderRadius: 14, padding: 18, alignItems: 'center' }}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <Text style={{ fontSize: 28 }}>📷</Text>
          <Text style={{ color: Colors.primary, fontWeight: '700', marginTop: 6 }}>Scan Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}
          onPress={() => router.push('/(tabs)/tools')}
        >
          <Text style={{ fontSize: 28 }}>🔧</Text>
          <Text style={{ color: Colors.text, fontWeight: '700', marginTop: 6 }}>Tools</Text>
        </TouchableOpacity>
      </View>

      {/* Expenses */}
      {expenses && expenses.total > 0 && (
        <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>EXPENSES THIS MONTH</Text>
          <Text style={{ color: Colors.accent, fontSize: 28, fontWeight: '800' }}>₹{expenses.total?.toFixed(0)}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {Object.entries(expenses.by_category || {}).map(([cat, amt]: any) => (
              <View key={cat} style={{ backgroundColor: Colors.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{cat}</Text>
                <Text style={{ color: Colors.text, fontWeight: '700' }}>₹{amt?.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent scans */}
      <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>RECENT SCANS</Text>
      {recentScans.length === 0 ? (
        <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
          <Text style={{ color: Colors.textMuted }}>No scans yet. Try scanning something!</Text>
        </View>
      ) : (
        recentScans.map((scan) => (
          <TouchableOpacity
            key={scan.id}
            style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            onPress={() => router.push({ pathname: '/scan/result', params: { scanId: scan.id } })}
          >
            <Text style={{ fontSize: 28 }}>{typeEmoji(scan.detected_type)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '600' }}>{scan.product_name || scan.detected_type || 'Unknown'}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{new Date(scan.created_at).toLocaleDateString()}</Text>
            </View>
            {scan.result?.allergen_warnings?.length > 0 && (
              <Text style={{ color: Colors.danger, fontSize: 18 }}>⚠️</Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

function typeEmoji(type: string) {
  const map: Record<string, string> = {
    medicine: '💊', food: '🏷️', document: '📄', chemical: '🧪',
    plant: '🌿', insect: '🕷️', currency: '💱', receipt: '🧾',
    clothing: '👔', skincare: '🧴', exercise: '🏋️', parking_sign: '🅿️',
  };
  return map[type] || '📷';
}
