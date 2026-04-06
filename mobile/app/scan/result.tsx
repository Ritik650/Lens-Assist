import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Speech from 'expo-speech';
import { Colors } from '@/constants/colors';
import { getScan } from '@/services/scan';

export default function ResultScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (scanId) {
      getScan(scanId).then((s) => { setScan(s); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [scanId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={{ color: Colors.textMuted, marginTop: 16 }}>Analyzing with Claude AI...</Text>
      </View>
    );
  }

  if (!scan) return (
    <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: Colors.danger }}>Failed to load scan</Text>
    </View>
  );

  const r = scan.result || {};
  const hasAllergens = r.allergen_warnings?.length > 0;
  const hasExpiry = r.safety_info?.is_expired === true;

  function speakResult() {
    const text = buildSpeechText(r);
    setSpeaking(true);
    Speech.speak(text, { onDone: () => setSpeaking(false), onError: () => setSpeaking(false) });
  }

  function stopSpeech() {
    Speech.stop();
    setSpeaking(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.primary }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.text }}>
            {r.product_name || r.detected_type || 'Scan Result'}
          </Text>
          {r.brand && <Text style={{ color: Colors.textMuted }}>{r.brand}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 12, color: Colors.accent }}>
              {r.detected_type?.toUpperCase()} · {((r.confidence || 0) * 100).toFixed(0)}% confident
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border }}
          onPress={speaking ? stopSpeech : speakResult}
        >
          <Text style={{ fontSize: 22 }}>{speaking ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
      </View>

      {/* Critical alerts */}
      {hasAllergens && (
        <View style={{ backgroundColor: '#2A1010', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.danger }}>
          <Text style={{ color: Colors.danger, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
            🚨 ALLERGEN ALERT
          </Text>
          {r.allergen_warnings.map((w: any, i: number) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={{ color: Colors.danger, fontWeight: '700' }}>
                {w.allergen.toUpperCase()} — {w.severity}
              </Text>
              <Text style={{ color: '#FF9999', fontSize: 13 }}>Found in: {w.found_in}</Text>
            </View>
          ))}
        </View>
      )}

      {hasExpiry && (
        <View style={{ backgroundColor: '#2A1A0A', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.warning }}>
          <Text style={{ color: Colors.warning, fontWeight: '800' }}>
            ⚠️ PRODUCT EXPIRED: {r.safety_info.expiry_date}
          </Text>
        </View>
      )}

      {/* Drug info */}
      {r.drug_info && r.drug_info.generic_name && (
        <Card title="💊 Medicine Info">
          <InfoRow label="Generic Name" value={r.drug_info.generic_name} />
          <InfoRow label="Class" value={r.drug_info.drug_class} />
          <InfoRow label="Dosage" value={r.drug_info.dosage} />
          {r.drug_info.uses?.length > 0 && (
            <InfoRow label="Uses" value={r.drug_info.uses.join(', ')} />
          )}
          {r.drug_info.interactions_with_user_meds?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: Colors.warning, fontWeight: '700', marginBottom: 6 }}>⚠️ Drug Interactions</Text>
              {r.drug_info.interactions_with_user_meds.map((int: any, i: number) => (
                <View key={i} style={{ backgroundColor: Colors.surface2, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                  <Text style={{ color: Colors.warning, fontWeight: '600' }}>{int.medication} — {int.severity}</Text>
                  <Text style={{ color: Colors.text, fontSize: 13, marginTop: 4 }}>{int.description}</Text>
                  <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 4 }}>→ {int.recommendation}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Nutrition */}
      {r.nutrition && r.nutrition.calories > 0 && (
        <Card title="🍎 Nutrition">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Calories', value: r.nutrition.calories, unit: '' },
              { label: 'Protein', value: r.nutrition.protein_g, unit: 'g' },
              { label: 'Carbs', value: r.nutrition.carbs_g, unit: 'g' },
              { label: 'Fat', value: r.nutrition.fat_g, unit: 'g' },
              { label: 'Sugar', value: r.nutrition.sugar_g, unit: 'g' },
              { label: 'Fiber', value: r.nutrition.fiber_g, unit: 'g' },
            ].map(({ label, value, unit }) => (
              <View key={label} style={{ backgroundColor: Colors.surface2, borderRadius: 10, padding: 12, minWidth: 80, alignItems: 'center' }}>
                <Text style={{ color: Colors.accent, fontWeight: '800', fontSize: 18 }}>{value}{unit}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{label}</Text>
              </View>
            ))}
          </View>
          {r.nutrition.flags_for_user?.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {r.nutrition.flags_for_user.map((flag: string, i: number) => (
                <Text key={i} style={{ color: Colors.warning, fontSize: 13, marginBottom: 4 }}>⚠️ {flag}</Text>
              ))}
            </View>
          )}
          <InfoRow label="Health Score" value={`${r.nutrition.health_score}/100`} />
          <InfoRow label="Glycemic Index" value={r.nutrition.glycemic_index_estimate} />
        </Card>
      )}

      {/* Plant info */}
      {r.plant_info && (
        <Card title="🌿 Plant Info">
          <InfoRow label="Species" value={r.plant_info.species} />
          <InfoRow label="Common Name" value={r.plant_info.common_name} />
          {r.plant_info.is_poisonous && (
            <Text style={{ color: Colors.danger, fontWeight: '700', marginTop: 4 }}>
              ☠️ POISONOUS — Toxicity: {r.plant_info.toxicity_level}
            </Text>
          )}
          {r.plant_info.pet_safe === false && (
            <Text style={{ color: Colors.warning, fontWeight: '700', marginTop: 4 }}>⚠️ TOXIC TO PETS</Text>
          )}
          {r.plant_info.care_guide && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 4 }}>Care Guide</Text>
              {Object.entries(r.plant_info.care_guide).map(([k, v]: any) => (
                <Text key={k} style={{ color: Colors.text, fontSize: 13 }}>💧 {k}: {v}</Text>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Safety */}
      {r.safety_info?.hazard_warnings?.length > 0 && (
        <Card title="⚠️ Safety Warnings">
          {r.safety_info.hazard_warnings.map((w: string, i: number) => (
            <Text key={i} style={{ color: Colors.warning, fontSize: 14, marginBottom: 4 }}>• {w}</Text>
          ))}
          {r.safety_info.mixing_dangers?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: Colors.danger, fontWeight: '700', marginBottom: 6 }}>🚫 Dangerous Combinations</Text>
              {r.safety_info.mixing_dangers.map((d: string, i: number) => (
                <Text key={i} style={{ color: '#FF9999', fontSize: 13, marginBottom: 4 }}>• {d}</Text>
              ))}
            </View>
          )}
          {r.safety_info.first_aid && (
            <View style={{ marginTop: 8, backgroundColor: Colors.surface2, borderRadius: 8, padding: 10 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 4 }}>FIRST AID</Text>
              <Text style={{ color: Colors.text, fontSize: 13 }}>{r.safety_info.first_aid}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Receipt */}
      {r.receipt_info && (
        <Card title="🧾 Receipt">
          <InfoRow label="Store" value={r.receipt_info.store_name} />
          <InfoRow label="Date" value={r.receipt_info.date} />
          {r.receipt_info.items?.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: Colors.text, fontSize: 14 }}>{item.name}</Text>
              <Text style={{ color: Colors.accent, fontSize: 14 }}>₹{item.price}</Text>
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>Total</Text>
            <Text style={{ color: Colors.accent, fontWeight: '800', fontSize: 16 }}>
              {r.receipt_info.currency} {r.receipt_info.total}
            </Text>
          </View>
        </Card>
      )}

      {/* Parking */}
      {r.parking_sign && (
        <Card title="🅿️ Parking">
          <View style={{ backgroundColor: r.parking_sign.can_park_now ? '#0A2A1A' : '#2A0A0A', borderRadius: 10, padding: 14, marginBottom: 8 }}>
            <Text style={{ color: r.parking_sign.can_park_now ? Colors.success : Colors.danger, fontWeight: '800', fontSize: 18 }}>
              {r.parking_sign.can_park_now ? '✅ YES, you can park here' : '🚫 NO parking right now'}
            </Text>
          </View>
          <Text style={{ color: Colors.text }}>{r.parking_sign.restrictions}</Text>
          {r.parking_sign.time_limit && <InfoRow label="Time Limit" value={r.parking_sign.time_limit} />}
          {r.parking_sign.cost && <InfoRow label="Cost" value={r.parking_sign.cost} />}
        </Card>
      )}

      {/* Translated text */}
      {r.text_content?.translated_text && r.text_content.original_language !== r.text_content.target_language && (
        <Card title="🌐 Translation">
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 6 }}>
            {r.text_content.original_language?.toUpperCase()} → {r.text_content.target_language?.toUpperCase()}
          </Text>
          <Text style={{ color: Colors.text, fontSize: 14, lineHeight: 22 }}>{r.text_content.translated_text}</Text>
        </Card>
      )}

      {/* Recommendations */}
      {r.personalized_recommendations?.length > 0 && (
        <Card title="✨ Recommendations">
          {r.personalized_recommendations.map((rec: string, i: number) => (
            <Text key={i} style={{ color: Colors.text, fontSize: 14, marginBottom: 6 }}>• {rec}</Text>
          ))}
        </Card>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: Colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' }}
          onPress={() => router.push({ pathname: '/scan/chat', params: { scanId } })}
        >
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>💬 Ask a Question</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}
          onPress={() => router.back()}
        >
          <Text style={{ color: Colors.text, fontWeight: '600' }}>📷 New Scan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border }}>
      <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' }}>{String(value)}</Text>
    </View>
  );
}

function buildSpeechText(r: any): string {
  const parts: string[] = [];
  if (r.product_name) parts.push(`${r.product_name}.`);
  if (r.allergen_warnings?.length > 0) {
    parts.push(`WARNING: Contains your allergens: ${r.allergen_warnings.map((w: any) => w.allergen).join(', ')}.`);
  }
  if (r.drug_info?.interactions_with_user_meds?.length > 0) {
    parts.push(`Drug interaction warning with ${r.drug_info.interactions_with_user_meds.map((i: any) => i.medication).join(', ')}.`);
  }
  if (r.safety_info?.is_expired) parts.push('This product is EXPIRED.');
  if (r.personalized_recommendations?.length > 0) {
    parts.push('Recommendations: ' + r.personalized_recommendations.join('. '));
  }
  return parts.join(' ') || 'Scan complete. No major alerts.';
}
