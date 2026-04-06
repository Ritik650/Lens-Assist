import { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { api } from '@/services/api';

export default function CompareScreen() {
  const { scanAId, scanBId } = useLocalSearchParams<{ scanAId: string; scanBId: string }>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function compare() {
    if (!scanAId || !scanBId) return Alert.alert('Error', 'Two scan IDs required');
    setLoading(true);
    try {
      const res = await api.post('/scan/compare', { scan_a_id: scanAId, scan_b_id: scanBId });
      setResult(res);
    } catch (e: any) {
      Alert.alert('Compare failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.primary }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 4 }}>Compare Products</Text>
      <Text style={{ color: Colors.textMuted, marginBottom: 24 }}>AI-powered side-by-side comparison</Text>

      {!result && (
        <TouchableOpacity
          style={{ backgroundColor: Colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
          onPress={compare}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.primary} />
            : <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16 }}>Compare Now</Text>
          }
        </TouchableOpacity>
      )}

      {result && (
        <>
          {/* Winner */}
          <View style={{
            backgroundColor: Colors.surface,
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
            borderWidth: 2,
            borderColor: Colors.accent,
            alignItems: 'center',
          }}>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 6 }}>WINNER</Text>
            <Text style={{ fontSize: 40, fontWeight: '900', color: Colors.accent }}>
              Product {result.winner}
            </Text>
            <Text style={{ color: Colors.text, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
              {result.reason}
            </Text>
          </View>

          {/* Health recommendation */}
          {result.health_recommendation && (
            <View style={{ backgroundColor: '#0A2A1A', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.success + '60' }}>
              <Text style={{ color: Colors.success, fontWeight: '700', marginBottom: 4 }}>💚 For You</Text>
              <Text style={{ color: Colors.text, lineHeight: 22 }}>{result.health_recommendation}</Text>
            </View>
          )}

          {/* Comparison table */}
          {result.comparison?.length > 0 && (
            <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ color: Colors.text, fontWeight: '700', marginBottom: 12 }}>Comparison</Text>
              {/* Header */}
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ flex: 2, color: Colors.textMuted, fontSize: 12, fontWeight: '700' }}>CATEGORY</Text>
                <Text style={{ flex: 1.5, color: Colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>A</Text>
                <Text style={{ flex: 1.5, color: Colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>B</Text>
              </View>
              {result.comparison.map((row: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                  <Text style={{ flex: 2, color: Colors.textMuted, fontSize: 13 }}>{row.category}</Text>
                  <Text style={{ flex: 1.5, color: row.better === 'A' ? Colors.accent : Colors.text, fontSize: 13, textAlign: 'center', fontWeight: row.better === 'A' ? '700' : '400' }}>
                    {row.product_a}
                  </Text>
                  <Text style={{ flex: 1.5, color: row.better === 'B' ? Colors.accent : Colors.text, fontSize: 13, textAlign: 'center', fontWeight: row.better === 'B' ? '700' : '400' }}>
                    {row.product_b}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.warning + '60' }}>
              <Text style={{ color: Colors.warning, fontWeight: '700', marginBottom: 8 }}>⚠️ Warnings</Text>
              {result.warnings.map((w: string, i: number) => (
                <Text key={i} style={{ color: Colors.text, fontSize: 14, marginBottom: 4 }}>• {w}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: Colors.border }}
            onPress={() => router.back()}
          >
            <Text style={{ color: Colors.text }}>← Back</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
