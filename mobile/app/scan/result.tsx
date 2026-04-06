import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useLanguageStore } from '@/store/language';
import { t } from '@/constants/i18n';
import { getScan } from '@/services/scan';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function ResultScreen() {
  const lang = useLanguageStore((s) => s.lang);
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
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>{t(lang, 'analyzing')}</Text>
      </View>
    );
  }

  if (!scan) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
      <Text style={styles.errorText}>Failed to load scan</Text>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={Colors.textMuted} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.resultHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultName}>
            {r.product_name || r.detected_type || 'Scan Result'}
          </Text>
          {r.brand && <Text style={styles.resultBrand}>{r.brand}</Text>}
          <View style={styles.confidenceRow}>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{r.detected_type?.toUpperCase()}</Text>
            </View>
            <Text style={styles.confidenceText}>
              {((r.confidence || 0) * 100).toFixed(0)}% confident
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.speakBtn}
          onPress={speaking ? stopSpeech : speakResult}
        >
          <Ionicons
            name={speaking ? 'volume-mute-outline' : 'volume-high-outline'}
            size={22}
            color={Colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Allergen Alert */}
      {hasAllergens && (
        <View style={styles.allergenAlert}>
          <View style={styles.alertTitleRow}>
            <Ionicons name="warning" size={18} color={Colors.danger} />
            <Text style={styles.alertTitle}>ALLERGEN ALERT</Text>
          </View>
          {r.allergen_warnings.map((w: any, i: number) => (
            <View key={i} style={styles.allergenItem}>
              <Text style={styles.allergenName}>{w.allergen.toUpperCase()} — {w.severity}</Text>
              <Text style={styles.allergenFoundIn}>Found in: {w.found_in}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Expiry */}
      {hasExpiry && (
        <View style={styles.expiryAlert}>
          <Ionicons name="time" size={16} color={Colors.warning} />
          <Text style={styles.expiryText}>PRODUCT EXPIRED: {r.safety_info.expiry_date}</Text>
        </View>
      )}

      {/* Drug info */}
      {r.drug_info?.generic_name && (
        <Card title="Medicine Info" icon="medical" iconColor="#EC4899">
          <InfoRow label="Generic Name" value={r.drug_info.generic_name} />
          <InfoRow label="Class" value={r.drug_info.drug_class} />
          <InfoRow label="Dosage" value={r.drug_info.dosage} />
          {r.drug_info.uses?.length > 0 && (
            <InfoRow label="Uses" value={r.drug_info.uses.join(', ')} />
          )}
          {r.drug_info.interactions_with_user_meds?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="warning-outline" size={14} color={Colors.warning} />
                <Text style={styles.warningLabel}>Drug Interactions</Text>
              </View>
              {r.drug_info.interactions_with_user_meds.map((int: any, i: number) => (
                <View key={i} style={styles.interactionCard}>
                  <Text style={styles.interactionTitle}>{int.medication} — {int.severity}</Text>
                  <Text style={styles.interactionDesc}>{int.description}</Text>
                  <Text style={styles.interactionRec}>{int.recommendation}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Nutrition */}
      {r.nutrition?.calories > 0 && (
        <Card title="Nutrition" icon="nutrition" iconColor="#F97316">
          <View style={styles.nutritionGrid}>
            {[
              { label: 'Calories', value: r.nutrition.calories, unit: '' },
              { label: 'Protein', value: r.nutrition.protein_g, unit: 'g' },
              { label: 'Carbs', value: r.nutrition.carbs_g, unit: 'g' },
              { label: 'Fat', value: r.nutrition.fat_g, unit: 'g' },
              { label: 'Sugar', value: r.nutrition.sugar_g, unit: 'g' },
              { label: 'Fiber', value: r.nutrition.fiber_g, unit: 'g' },
            ].map(({ label, value, unit }) => (
              <View key={label} style={styles.nutritionCell}>
                <Text style={styles.nutritionValue}>{value}{unit}</Text>
                <Text style={styles.nutritionLabel}>{label}</Text>
              </View>
            ))}
          </View>
          {r.nutrition.flags_for_user?.map((flag: string, i: number) => (
            <View key={i} style={styles.nutritionFlag}>
              <Ionicons name="warning-outline" size={13} color={Colors.warning} />
              <Text style={styles.nutritionFlagText}>{flag}</Text>
            </View>
          ))}
          <InfoRow label="Health Score" value={`${r.nutrition.health_score}/100`} />
          <InfoRow label="Glycemic Index" value={r.nutrition.glycemic_index_estimate} />
        </Card>
      )}

      {/* Plant info */}
      {r.plant_info && (
        <Card title="Plant Info" icon="leaf" iconColor="#16A34A">
          <InfoRow label="Species" value={r.plant_info.species} />
          <InfoRow label="Common Name" value={r.plant_info.common_name} />
          {r.plant_info.is_poisonous && (
            <View style={styles.poisonRow}>
              <Ionicons name="skull-outline" size={14} color={Colors.danger} />
              <Text style={styles.poisonText}>POISONOUS — Toxicity: {r.plant_info.toxicity_level}</Text>
            </View>
          )}
          {r.plant_info.pet_safe === false && (
            <View style={styles.poisonRow}>
              <Ionicons name="paw-outline" size={14} color={Colors.warning} />
              <Text style={[styles.poisonText, { color: Colors.warning }]}>TOXIC TO PETS</Text>
            </View>
          )}
          {r.plant_info.care_guide && (
            <View style={{ marginTop: 8, gap: 4 }}>
              <Text style={styles.careLabel}>Care Guide</Text>
              {Object.entries(r.plant_info.care_guide).map(([k, v]: any) => (
                <View key={k} style={{ flexDirection: 'row', gap: 6 }}>
                  <Ionicons name="water-outline" size={13} color={Colors.accent} />
                  <Text style={styles.careText}>{k}: {v}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Safety */}
      {r.safety_info?.hazard_warnings?.length > 0 && (
        <Card title="Safety Warnings" icon="shield-outline" iconColor={Colors.warning}>
          {r.safety_info.hazard_warnings.map((w: string, i: number) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
              <Text style={styles.safetyText}>{w}</Text>
            </View>
          ))}
          {r.safety_info.mixing_dangers?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                <Ionicons name="close-circle" size={14} color={Colors.danger} />
                <Text style={styles.dangerLabel}>Dangerous Combinations</Text>
              </View>
              {r.safety_info.mixing_dangers.map((d: string, i: number) => (
                <Text key={i} style={styles.mixDanger}>• {d}</Text>
              ))}
            </View>
          )}
          {r.safety_info.first_aid && (
            <View style={styles.firstAidCard}>
              <Text style={styles.firstAidLabel}>FIRST AID</Text>
              <Text style={styles.firstAidText}>{r.safety_info.first_aid}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Receipt */}
      {r.receipt_info && (
        <Card title="Receipt" icon="receipt-outline" iconColor="#7C3AED">
          <InfoRow label="Store" value={r.receipt_info.store_name} />
          <InfoRow label="Date" value={r.receipt_info.date} />
          {r.receipt_info.items?.map((item: any, i: number) => (
            <View key={i} style={styles.receiptRow}>
              <Text style={styles.receiptItem}>{item.name}</Text>
              <Text style={styles.receiptPrice}>₹{item.price}</Text>
            </View>
          ))}
          <View style={styles.receiptTotal}>
            <Text style={styles.receiptTotalLabel}>Total</Text>
            <Text style={styles.receiptTotalValue}>{r.receipt_info.currency} {r.receipt_info.total}</Text>
          </View>
        </Card>
      )}

      {/* Parking */}
      {r.parking_sign && (
        <Card title="Parking" icon="car-sport-outline" iconColor="#16A34A">
          <View style={[styles.parkingResult, { backgroundColor: r.parking_sign.can_park_now ? Colors.successBg : Colors.dangerBg }]}>
            <Ionicons
              name={r.parking_sign.can_park_now ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={r.parking_sign.can_park_now ? Colors.success : Colors.danger}
            />
            <Text style={[styles.parkingText, { color: r.parking_sign.can_park_now ? Colors.success : Colors.danger }]}>
              {r.parking_sign.can_park_now ? 'YES, you can park here' : 'NO parking right now'}
            </Text>
          </View>
          <Text style={styles.parkingRestrictions}>{r.parking_sign.restrictions}</Text>
          {r.parking_sign.time_limit && <InfoRow label="Time Limit" value={r.parking_sign.time_limit} />}
          {r.parking_sign.cost && <InfoRow label="Cost" value={r.parking_sign.cost} />}
        </Card>
      )}

      {/* Translation */}
      {r.text_content?.translated_text && r.text_content.original_language !== r.text_content.target_language && (
        <Card title="Translation" icon="language-outline" iconColor="#6366F1">
          <Text style={styles.translationLangs}>
            {r.text_content.original_language?.toUpperCase()} → {r.text_content.target_language?.toUpperCase()}
          </Text>
          <Text style={styles.translationText}>{r.text_content.translated_text}</Text>
        </Card>
      )}

      {/* Recommendations */}
      {r.personalized_recommendations?.length > 0 && (
        <Card title="Recommendations" icon="sparkles-outline" iconColor={Colors.accent}>
          {r.personalized_recommendations.map((rec: string, i: number) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.accent} />
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.askBtn}
          onPress={() => router.push({ pathname: '/scan/chat', params: { scanId } })}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.askBtnText}>{t(lang, 'askQuestion')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newScanBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="camera-outline" size={18} color={Colors.text} />
          <Text style={styles.newScanText}>{t(lang, 'newScan')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Card({ title, icon, iconColor, children }: { title: string; icon: IoniconName; iconColor: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <View style={[cardStyles.iconBg, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={cardStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <View style={cardStyles.infoRow}>
      <Text style={cardStyles.infoLabel}>{label}</Text>
      <Text style={cardStyles.infoValue}>{String(value)}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryBg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 15, marginTop: 4 },
  errorText: { color: Colors.danger, fontSize: 16, marginTop: 8 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, marginTop: 52 },
  backText: { color: Colors.textMuted, fontSize: 15 },

  resultHeader: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  resultName: { fontSize: 20, fontWeight: '800', color: Colors.text },
  resultBrand: { color: Colors.textMuted, marginTop: 2, fontSize: 14 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  typePill: { backgroundColor: Colors.accentBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.accentBorder },
  typePillText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  confidenceText: { color: Colors.textMuted, fontSize: 12 },
  speakBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accentBorder,
  },

  allergenAlert: {
    backgroundColor: Colors.dangerBg, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.dangerBorder, gap: 8,
  },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { color: Colors.danger, fontWeight: '800', fontSize: 15 },
  allergenItem: { gap: 2 },
  allergenName: { color: Colors.danger, fontWeight: '700', fontSize: 14 },
  allergenFoundIn: { color: Colors.danger + 'BB', fontSize: 13 },

  expiryAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warningBg, borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.warning + '40',
  },
  expiryText: { color: Colors.warning, fontWeight: '700', fontSize: 14 },

  warningLabel: { color: Colors.warning, fontWeight: '700', fontSize: 14 },
  dangerLabel: { color: Colors.danger, fontWeight: '700', fontSize: 14 },
  interactionCard: {
    backgroundColor: Colors.surface2, borderRadius: 10, padding: 12, marginBottom: 8, gap: 4,
  },
  interactionTitle: { color: Colors.warning, fontWeight: '600', fontSize: 14 },
  interactionDesc: { color: Colors.text, fontSize: 13 },
  interactionRec: { color: Colors.accent, fontSize: 13 },

  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  nutritionCell: {
    backgroundColor: Colors.surface2, borderRadius: 10, padding: 12,
    minWidth: 80, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  nutritionValue: { color: Colors.accent, fontWeight: '800', fontSize: 18 },
  nutritionLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  nutritionFlag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nutritionFlagText: { color: Colors.warning, fontSize: 13 },

  poisonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  poisonText: { color: Colors.danger, fontWeight: '700', fontSize: 14 },
  careLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  careText: { color: Colors.text, fontSize: 13 },

  safetyText: { color: Colors.text, fontSize: 14, flex: 1 },
  mixDanger: { color: Colors.danger + 'CC', fontSize: 13, marginBottom: 4 },
  firstAidCard: {
    marginTop: 10, backgroundColor: Colors.surface2, borderRadius: 10, padding: 12, gap: 4,
  },
  firstAidLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  firstAidText: { color: Colors.text, fontSize: 13 },

  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptItem: { color: Colors.text, fontSize: 14 },
  receiptPrice: { color: Colors.accent, fontSize: 14 },
  receiptTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 10,
  },
  receiptTotalLabel: { color: Colors.text, fontWeight: '700' },
  receiptTotalValue: { color: Colors.accent, fontWeight: '800', fontSize: 16 },

  parkingResult: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  parkingText: { fontWeight: '800', fontSize: 16 },
  parkingRestrictions: { color: Colors.text, fontSize: 14 },

  translationLangs: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  translationText: { color: Colors.text, fontSize: 14, lineHeight: 22 },

  recText: { color: Colors.text, fontSize: 14, flex: 1 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  askBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 15,
  },
  askBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  newScanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  newScanText: { color: Colors.text, fontWeight: '600', fontSize: 15 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { color: Colors.textMuted, fontSize: 13 },
  infoValue: { color: Colors.text, fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});
