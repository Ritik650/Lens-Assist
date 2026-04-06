import { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getScanHistory } from '@/services/scan';

export default function HistoryScreen() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    try {
      const data = await getScanHistory(50);
      setScans(data as any[]);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: Colors.primary }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.text }}>Scan History</Text>
          <Text style={{ color: Colors.textMuted }}>{scans.length} scans</Text>
        </View>
      }
      data={scans}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Colors.accent} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border }}
          onPress={() => router.push({ pathname: '/scan/result', params: { scanId: item.id } })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 28 }}>{typeEmoji(item.detected_type)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 15 }}>
                {item.product_name || item.detected_type || 'Unknown item'}
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {item.scan_mode} · {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            {item.result?.allergen_warnings?.length > 0 && (
              <View style={{ backgroundColor: Colors.danger + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: Colors.danger, fontSize: 12, fontWeight: '700' }}>
                  ⚠️ {item.result.allergen_warnings.length}
                </Text>
              </View>
            )}
            {item.confidence && (
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                {(item.confidence * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
          <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '600' }}>No scans yet</Text>
          <Text style={{ color: Colors.textMuted, marginTop: 8 }}>Start by scanning any object</Text>
        </View>
      }
    />
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
