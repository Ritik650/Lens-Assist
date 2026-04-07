import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Linking, Animated, Vibration,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLanguageStore } from '@/store/language';
import { t } from '@/constants/i18n';
import { getScan } from '@/services/scan';
import { streamScanSummary, analyzeFamilyScan } from '@/services/stream';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type SafetyLevel = 'safe' | 'caution' | 'danger';

export default function ResultScreen() {
  const C = useColors();
  const lang = useLanguageStore((s) => s.lang);
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Streaming AI summary
  const [summary, setSummary] = useState('');
  const [summaryDone, setSummaryDone] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Voice
  const [speaking, setSpeaking] = useState(false);
  const [autoReadDone, setAutoReadDone] = useState(false);

  // Family analysis
  const [familyResults, setFamilyResults] = useState<any[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'you' | string>('you');

  // Animated pulse for danger
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isOffline = scanId?.startsWith('offline_') ?? false;

  useEffect(() => {
    if (!scanId) return;

    if (isOffline) {
      // Offline scans are stored in AsyncStorage by offlineAnalyze service
      AsyncStorage.getItem('lens_offline_scans').then(raw => {
        if (raw) {
          const scans: any[] = JSON.parse(raw);
          const found = scans.find(s => s.id === scanId);
          if (found) setScan(found);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
      return;
    }

    getScan(scanId).then((s) => {
      setScan(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [scanId]);

  // Start streaming summary once scan is loaded (skip for offline scans)
  useEffect(() => {
    if (!scan || summaryLoading || summaryDone) return;
    if (isOffline) { setSummaryDone(true); return; }
    setSummaryLoading(true);

    const stop = streamScanSummary(
      scanId!,
      (chunk) => setSummary(prev => prev + chunk),
      () => { setSummaryDone(true); setSummaryLoading(false); },
      () => { setSummaryDone(true); setSummaryLoading(false); },
    );
    return stop;
  }, [scan]);

  // Trigger danger pulse animation + haptics
  useEffect(() => {
    if (!scan) return;
    const r = scan.result || {};
    const isCritical = r.allergen_warnings?.some((w: any) => w.severity === 'anaphylactic') ||
      r.drug_info?.interactions_with_user_meds?.some((i: any) => i.severity === 'severe');

    if (isCritical) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate([0, 400, 100, 400]);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [scan]);

  // Auto-read summary with TTS when streaming is done
  useEffect(() => {
    if (summaryDone && summary && !autoReadDone) {
      setAutoReadDone(true);
      Speech.speak(summary, {
        rate: 0.9,
        onDone: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
      setSpeaking(true);
    }
  }, [summaryDone]);

  // Load family analysis (not available for offline scans)
  useEffect(() => {
    if (!scanId || isOffline) return;
    setFamilyLoading(true);
    analyzeFamilyScan(scanId)
      .then(results => {
        setFamilyResults(results);
        setFamilyLoading(false);
      })
      .catch(() => setFamilyLoading(false));
  }, [scanId]);

  const stopSpeech = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  const readAloud = useCallback(() => {
    if (speaking) { stopSpeech(); return; }
    const text = summary || buildSpeechText(scan?.result || {});
    setSpeaking(true);
    Speech.speak(text, { rate: 0.9, onDone: () => setSpeaking(false), onError: () => setSpeaking(false) });
  }, [speaking, summary, scan]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.primaryBg }]}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={[styles.loadingText, { color: C.textMuted }]}>{t(lang, 'analyzing')}</Text>
      </View>
    );
  }

  if (!scan) return (
    <View style={[styles.center, { backgroundColor: C.primaryBg }]}>
      <Ionicons name="alert-circle-outline" size={48} color={C.danger} />
      <Text style={[styles.errorText, { color: C.danger }]}>Failed to load scan</Text>
    </View>
  );

  const r = scan.result || {};
  const hasAllergens = r.allergen_warnings?.length > 0;
  const hasExpiry = r.safety_info?.is_expired === true;
  const isAnaphylactic = r.allergen_warnings?.some((w: any) => w.severity === 'anaphylactic');
  const isCriticalDrug = r.drug_info?.interactions_with_user_meds?.some((i: any) => i.severity === 'severe');
  const isCritical = isAnaphylactic || isCriticalDrug;
  const hasCrossWarnings = r.cross_scan_warnings?.length > 0;
  const hasFamilyResults = familyResults.length > 0;

  const overallSafety: SafetyLevel = isCritical || isAnaphylactic ? 'danger'
    : (hasAllergens || hasExpiry) ? 'caution' : 'safe';

  const safetyConfig = {
    safe:    { icon: 'checkmark-circle' as IoniconName, color: C.success,  bg: C.successBg,  label: 'SAFE' },
    caution: { icon: 'warning'         as IoniconName, color: C.warning,  bg: C.warningBg,  label: 'CAUTION' },
    danger:  { icon: 'close-circle'    as IoniconName, color: C.danger,   bg: C.dangerBg,   label: 'DANGER' },
  }[overallSafety];

  const tabs = ['you', ...familyResults.map(m => m.name)];

  function emergencySOS() {
    const msg = encodeURIComponent(
      `EMERGENCY: I may have been exposed to ${r.allergen_warnings?.map((w: any) => w.allergen).join(', ')}. ` +
      `I am scanning with LensAssist. Please call me immediately.`
    );
    Linking.openURL(`sms:?body=${msg}`);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.primaryBg }]}
      contentContainerStyle={styles.content}
    >
      {/* Back nav */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={C.textMuted} />
        <Text style={[styles.backText, { color: C.textMuted }]}>Back</Text>
      </TouchableOpacity>

      {/* Overall safety badge */}
      <Animated.View style={[
        styles.safetyBadge,
        { backgroundColor: safetyConfig.bg, transform: [{ scale: pulseAnim }] },
      ]}>
        <Ionicons name={safetyConfig.icon} size={22} color={safetyConfig.color} />
        <Text style={[styles.safetyLabel, { color: safetyConfig.color }]}>
          {safetyConfig.label}
        </Text>
        <Text style={[styles.safetyProduct, { color: safetyConfig.color + 'BB' }]} numberOfLines={1}>
          {r.product_name || r.detected_type || 'Scanned Item'}
        </Text>
      </Animated.View>

      {/* Emergency SOS — shown on critical alerts */}
      {isCritical && (
        <TouchableOpacity style={styles.sosBtn} onPress={emergencySOS} activeOpacity={0.85}>
          <View style={styles.sosBtnInner}>
            <Ionicons name="call" size={20} color="#fff" />
            <View>
              <Text style={styles.sosBtnTitle}>EMERGENCY SOS</Text>
              <Text style={styles.sosBtnSub}>Send alert SMS · One tap</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>
      )}

      {/* Result header */}
      <View style={[styles.resultHeader, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultName, { color: C.text }]} numberOfLines={2}>
            {r.product_name || r.detected_type || 'Scan Result'}
          </Text>
          {r.brand && <Text style={[styles.resultBrand, { color: C.textMuted }]}>{r.brand}</Text>}
          <View style={styles.confidenceRow}>
            <View style={[styles.typePill, { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}>
              <Text style={[styles.typePillText, { color: C.accent }]}>{r.detected_type?.toUpperCase()}</Text>
            </View>
            <Text style={[styles.confidenceText, { color: C.textMuted }]}>
              {((r.confidence || 0) * 100).toFixed(0)}% confident
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.speakBtn, { backgroundColor: speaking ? C.accentBg : C.surface2, borderColor: C.border }]}
          onPress={readAloud}
        >
          <Ionicons
            name={speaking ? 'volume-mute' : 'volume-high-outline'}
            size={22}
            color={speaking ? C.accent : C.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Family tabs */}
      {hasFamilyResults && (
        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { backgroundColor: C.accent, borderColor: C.accent }]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={tab === 'you' ? 'person' : 'people'}
                  size={12}
                  color={activeTab === tab ? '#fff' : C.textMuted}
                />
                <Text style={[styles.tabText, activeTab === tab && { color: '#fff', fontWeight: '700' }]}>
                  {tab === 'you' ? 'You' : tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Family member result card */}
          {activeTab !== 'you' && !familyLoading && (
            <FamilyMemberCard
              result={familyResults.find(m => m.name === activeTab)}
              C={C}
            />
          )}
          {familyLoading && (
            <View style={[styles.familyLoading, { backgroundColor: C.surface, borderColor: C.border }]}>
              <ActivityIndicator color={C.accent} size="small" />
              <Text style={[styles.familyLoadingText, { color: C.textMuted }]}>
                Analyzing for family members...
              </Text>
            </View>
          )}
        </View>
      )}

      {/* AI Streaming Summary */}
      {(summary || summaryLoading) && activeTab === 'you' && (
        <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.accentBorder }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.aiDot, { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}>
              <Ionicons name="flash" size={12} color={C.accent} />
            </View>
            <Text style={[styles.summaryTitle, { color: C.text }]}>Claude AI Summary</Text>
            {summaryLoading && <ActivityIndicator color={C.accent} size="small" />}
          </View>
          <Text style={[styles.summaryText, { color: C.textSecondary }]}>
            {summary}
            {summaryLoading && <Text style={{ color: C.accent }}>▌</Text>}
          </Text>
        </View>
      )}

      {/* Show detail sections only for "You" tab */}
      {activeTab === 'you' && (
        <>
          {/* Cross-scan warnings (scan memory) */}
          {hasCrossWarnings && (
            <View style={[styles.crossWarnCard, { backgroundColor: C.surface, borderColor: C.warning + '50' }]}>
              <View style={styles.crossWarnHeader}>
                <Ionicons name="git-network" size={16} color={C.warning} />
                <Text style={[styles.crossWarnTitle, { color: C.warning }]}>Scan Memory Alert</Text>
              </View>
              {r.cross_scan_warnings.map((w: any, i: number) => {
                const text = typeof w === 'string' ? w : (w.description || w.recommendation || w.warning_type || JSON.stringify(w));
                return (
                  <View key={i} style={styles.crossWarnItem}>
                    <Ionicons name="link" size={13} color={C.textMuted} />
                    <Text style={[styles.crossWarnText, { color: C.textSecondary }]}>{text}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Allergen Alert */}
          {hasAllergens && (
            <View style={[styles.allergenAlert, { backgroundColor: C.dangerBg, borderColor: C.dangerBorder }]}>
              <View style={styles.alertTitleRow}>
                <Ionicons name="warning" size={18} color={C.danger} />
                <Text style={[styles.alertTitle, { color: C.danger }]}>ALLERGEN ALERT</Text>
              </View>
              {r.allergen_warnings.map((w: any, i: number) => (
                <View key={i} style={styles.allergenItem}>
                  <Text style={[styles.allergenName, { color: C.danger }]}>{w.allergen.toUpperCase()} — {w.severity}</Text>
                  <Text style={[styles.allergenFoundIn, { color: C.danger + 'BB' }]}>Found in: {w.found_in}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Expiry */}
          {hasExpiry && (
            <View style={[styles.expiryAlert, { backgroundColor: C.warningBg, borderColor: C.warningBorder }]}>
              <Ionicons name="time" size={16} color={C.warning} />
              <Text style={[styles.expiryText, { color: C.warning }]}>
                PRODUCT EXPIRED: {r.safety_info.expiry_date}
              </Text>
            </View>
          )}

          {/* Drug info */}
          {r.drug_info?.generic_name && (
            <Card title="Medicine Info" icon="medical" iconColor="#EC4899" C={C}>
              <InfoRow label="Generic Name" value={r.drug_info.generic_name} C={C} />
              <InfoRow label="Class" value={r.drug_info.drug_class} C={C} />
              <InfoRow label="Dosage" value={r.drug_info.dosage} C={C} />
              {r.drug_info.uses?.length > 0 && <InfoRow label="Uses" value={r.drug_info.uses.join(', ')} C={C} />}
              {r.drug_info.interactions_with_user_meds?.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="warning-outline" size={14} color={C.warning} />
                    <Text style={[styles.warningLabel, { color: C.warning }]}>Drug Interactions</Text>
                  </View>
                  {r.drug_info.interactions_with_user_meds.map((int: any, i: number) => (
                    <View key={i} style={[styles.interactionCard, { backgroundColor: C.surface2 }]}>
                      <Text style={[styles.interactionTitle, { color: C.warning }]}>{int.medication} — {int.severity}</Text>
                      <Text style={[styles.interactionDesc, { color: C.text }]}>{int.description}</Text>
                      <Text style={[styles.interactionRec, { color: C.accent }]}>{int.recommendation}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}

          {/* Nutrition */}
          {r.nutrition?.calories > 0 && (
            <Card title="Nutrition" icon="nutrition" iconColor="#F97316" C={C}>
              <View style={styles.nutritionGrid}>
                {[
                  { label: 'Calories', value: r.nutrition.calories, unit: '' },
                  { label: 'Protein', value: r.nutrition.protein_g, unit: 'g' },
                  { label: 'Carbs', value: r.nutrition.carbs_g, unit: 'g' },
                  { label: 'Fat', value: r.nutrition.fat_g, unit: 'g' },
                  { label: 'Sugar', value: r.nutrition.sugar_g, unit: 'g' },
                  { label: 'Fiber', value: r.nutrition.fiber_g, unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <View key={label} style={[styles.nutritionCell, { backgroundColor: C.surface2, borderColor: C.border }]}>
                    <Text style={[styles.nutritionValue, { color: C.accent }]}>{value}{unit}</Text>
                    <Text style={[styles.nutritionLabel, { color: C.textMuted }]}>{label}</Text>
                  </View>
                ))}
              </View>
              {r.nutrition.flags_for_user?.map((flag: string, i: number) => (
                <View key={i} style={styles.nutritionFlag}>
                  <Ionicons name="warning-outline" size={13} color={C.warning} />
                  <Text style={[styles.nutritionFlagText, { color: C.warning }]}>{flag}</Text>
                </View>
              ))}
              <InfoRow label="Health Score" value={`${r.nutrition.health_score}/100`} C={C} />
            </Card>
          )}

          {/* Plant info */}
          {r.plant_info && (
            <Card title="Plant Info" icon="leaf" iconColor="#16A34A" C={C}>
              <InfoRow label="Species" value={r.plant_info.species} C={C} />
              <InfoRow label="Common Name" value={r.plant_info.common_name} C={C} />
              {r.plant_info.is_poisonous && (
                <View style={styles.poisonRow}>
                  <Ionicons name="skull-outline" size={14} color={C.danger} />
                  <Text style={[styles.poisonText, { color: C.danger }]}>
                    POISONOUS — Toxicity: {r.plant_info.toxicity_level}
                  </Text>
                </View>
              )}
              {r.plant_info.pet_safe === false && (
                <View style={styles.poisonRow}>
                  <Ionicons name="paw-outline" size={14} color={C.warning} />
                  <Text style={[styles.poisonText, { color: C.warning }]}>TOXIC TO PETS</Text>
                </View>
              )}
            </Card>
          )}

          {/* Safety */}
          {r.safety_info?.hazard_warnings?.length > 0 && (
            <Card title="Safety Warnings" icon="shield-outline" iconColor={C.warning} C={C}>
              {r.safety_info.hazard_warnings.map((w: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="alert-circle-outline" size={14} color={C.warning} />
                  <Text style={[styles.safetyText, { color: C.text }]}>{w}</Text>
                </View>
              ))}
              {r.safety_info.first_aid && (
                <View style={[styles.firstAidCard, { backgroundColor: C.surface2 }]}>
                  <Text style={[styles.firstAidLabel, { color: C.textMuted }]}>FIRST AID</Text>
                  <Text style={[styles.firstAidText, { color: C.text }]}>{r.safety_info.first_aid}</Text>
                </View>
              )}
            </Card>
          )}

          {/* Receipt */}
          {r.receipt_info && (
            <Card title="Receipt" icon="receipt-outline" iconColor="#7C3AED" C={C}>
              <InfoRow label="Store" value={r.receipt_info.store_name} C={C} />
              <InfoRow label="Date" value={r.receipt_info.date} C={C} />
              {r.receipt_info.items?.map((item: any, i: number) => (
                <View key={i} style={styles.receiptRow}>
                  <Text style={[styles.receiptItem, { color: C.text }]}>{item.name}</Text>
                  <Text style={[styles.receiptPrice, { color: C.accent }]}>₹{item.price}</Text>
                </View>
              ))}
              <View style={[styles.receiptTotal, { borderTopColor: C.border }]}>
                <Text style={[styles.receiptTotalLabel, { color: C.text }]}>Total</Text>
                <Text style={[styles.receiptTotalValue, { color: C.accent }]}>
                  {r.receipt_info.currency} {r.receipt_info.total}
                </Text>
              </View>
            </Card>
          )}

          {/* Parking */}
          {r.parking_sign && (
            <Card title="Parking" icon="car-sport-outline" iconColor="#16A34A" C={C}>
              <View style={[styles.parkingResult, {
                backgroundColor: r.parking_sign.can_park_now ? C.successBg : C.dangerBg,
              }]}>
                <Ionicons
                  name={r.parking_sign.can_park_now ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={r.parking_sign.can_park_now ? C.success : C.danger}
                />
                <Text style={[styles.parkingText, {
                  color: r.parking_sign.can_park_now ? C.success : C.danger,
                }]}>
                  {r.parking_sign.can_park_now ? 'YES — You can park here' : 'NO — No parking now'}
                </Text>
              </View>
              <Text style={[styles.parkingRestrictions, { color: C.text }]}>{r.parking_sign.restrictions}</Text>
              {r.parking_sign.time_limit && <InfoRow label="Time Limit" value={r.parking_sign.time_limit} C={C} />}
            </Card>
          )}

          {/* Translation */}
          {r.text_content?.translated_text && r.text_content.original_language !== r.text_content.target_language && (
            <Card title="Translation" icon="language-outline" iconColor="#6366F1" C={C}>
              <Text style={[styles.translationLangs, { color: C.textMuted }]}>
                {r.text_content.original_language?.toUpperCase()} → {r.text_content.target_language?.toUpperCase()}
              </Text>
              <Text style={[styles.translationText, { color: C.text }]}>{r.text_content.translated_text}</Text>
            </Card>
          )}

          {/* Recommendations */}
          {r.personalized_recommendations?.length > 0 && (
            <Card title="Recommendations" icon="sparkles-outline" iconColor={C.accent} C={C}>
              {r.personalized_recommendations.map((rec: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={C.accent} />
                  <Text style={[styles.recText, { color: C.text }]}>{rec}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.askBtn, { backgroundColor: C.accent }]}
          onPress={() => router.push({ pathname: '/scan/chat', params: { scanId } })}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.askBtnText}>{t(lang, 'askQuestion')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.newScanBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="camera-outline" size={18} color={C.text} />
          <Text style={[styles.newScanText, { color: C.text }]}>{t(lang, 'newScan')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function FamilyMemberCard({ result, C }: { result: any; C: any }) {
  if (!result) return null;
  const levelColor = result.safety_level === 'safe' ? C.success
    : result.safety_level === 'danger' ? C.danger : C.warning;
  const levelIcon: IoniconName = result.safety_level === 'safe' ? 'checkmark-circle'
    : result.safety_level === 'danger' ? 'close-circle' : 'warning';

  return (
    <View style={[styles.familyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Ionicons name={levelIcon} size={22} color={levelColor} />
        <Text style={[styles.familyMemberName, { color: C.text }]}>{result.name}</Text>
        <View style={[styles.familyLevelBadge, { backgroundColor: levelColor + '20' }]}>
          <Text style={[styles.familyLevelText, { color: levelColor }]}>
            {(result.safety_level || 'unknown').toUpperCase()}
          </Text>
        </View>
      </View>
      {result.primary_concern && (
        <Text style={[styles.familyConcer, { color: C.textSecondary }]}>{result.primary_concern}</Text>
      )}
      {result.allergen_alerts?.length > 0 && (
        <View style={styles.familyAlerts}>
          {result.allergen_alerts.map((a: string, i: number) => (
            <View key={i} style={[styles.familyAlertChip, { backgroundColor: C.dangerBg, borderColor: C.dangerBorder }]}>
              <Text style={[styles.familyAlertText, { color: C.danger }]}>{a}</Text>
            </View>
          ))}
        </View>
      )}
      {result.recommendation && (
        <Text style={[styles.familyRec, { color: C.textMuted }]}>{result.recommendation}</Text>
      )}
    </View>
  );
}

function Card({ title, icon, iconColor, children, C }: {
  title: string; icon: IoniconName; iconColor: string; children: React.ReactNode; C: any;
}) {
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBg, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.cardTitle, { color: C.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, C }: { label: string; value: any; C: any }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: C.border }]}>
      <Text style={[styles.infoLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: C.text }]}>{String(value)}</Text>
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
    parts.push(`Drug interaction warning.`);
  }
  if (r.safety_info?.is_expired) parts.push('This product is EXPIRED.');
  if (r.personalized_recommendations?.length > 0) {
    parts.push('Recommendation: ' + r.personalized_recommendations[0]);
  }
  return parts.join(' ') || 'Scan complete. No major alerts.';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, marginTop: 4 },
  errorText: { fontSize: 16, marginTop: 8 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, marginTop: 52 },
  backText: { fontSize: 15 },

  safetyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, marginBottom: 14,
  },
  safetyLabel: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  safetyProduct: { flex: 1, fontSize: 13, fontWeight: '500' },

  sosBtn: {
    backgroundColor: '#DC2626', borderRadius: 14, marginBottom: 14,
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  sosBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  sosBtnTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sosBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  resultHeader: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14,
    borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  resultName: { fontSize: 20, fontWeight: '800' },
  resultBrand: { marginTop: 2, fontSize: 14 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  typePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  typePillText: { fontSize: 11, fontWeight: '700' },
  confidenceText: { fontSize: 12 },
  speakBtn: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },

  tabsWrap: { marginBottom: 14 },
  tabsRow: { gap: 8, paddingBottom: 10 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: '#CBD5E1',
  },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  familyCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 4,
  },
  familyLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 1,
  },
  familyLoadingText: { fontSize: 13 },
  familyMemberName: { fontSize: 16, fontWeight: '700', flex: 1 },
  familyLevelBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  familyLevelText: { fontSize: 11, fontWeight: '700' },
  familyConcer: { fontSize: 14, marginBottom: 8 },
  familyAlerts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  familyAlertChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  familyAlertText: { fontSize: 12, fontWeight: '600' },
  familyRec: { fontSize: 13, fontStyle: 'italic' },

  summaryCard: {
    borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiDot: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  summaryText: { fontSize: 14, lineHeight: 22 },

  crossWarnCard: {
    borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, gap: 8,
  },
  crossWarnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  crossWarnTitle: { fontSize: 14, fontWeight: '700' },
  crossWarnItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  crossWarnText: { fontSize: 13, flex: 1, lineHeight: 19 },

  allergenAlert: {
    borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, gap: 8,
  },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { fontWeight: '800', fontSize: 15 },
  allergenItem: { gap: 2 },
  allergenName: { fontWeight: '700', fontSize: 14 },
  allergenFoundIn: { fontSize: 13 },

  expiryAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1,
  },
  expiryText: { fontWeight: '700', fontSize: 14 },

  card: {
    borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontWeight: '700', fontSize: 15 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  warningLabel: { fontWeight: '700', fontSize: 14 },
  interactionCard: { borderRadius: 10, padding: 12, marginBottom: 8, gap: 4 },
  interactionTitle: { fontWeight: '600', fontSize: 14 },
  interactionDesc: { fontSize: 13 },
  interactionRec: { fontSize: 13 },

  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  nutritionCell: { borderRadius: 10, padding: 12, minWidth: 80, alignItems: 'center', borderWidth: 1 },
  nutritionValue: { fontWeight: '800', fontSize: 18 },
  nutritionLabel: { fontSize: 11, marginTop: 2 },
  nutritionFlag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nutritionFlagText: { fontSize: 13 },

  poisonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  poisonText: { fontWeight: '700', fontSize: 14 },

  safetyText: { fontSize: 14, flex: 1 },
  firstAidCard: { marginTop: 10, borderRadius: 10, padding: 12, gap: 4 },
  firstAidLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  firstAidText: { fontSize: 13 },

  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptItem: { fontSize: 14 },
  receiptPrice: { fontSize: 14 },
  receiptTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, marginTop: 8, paddingTop: 10 },
  receiptTotalLabel: { fontWeight: '700' },
  receiptTotalValue: { fontWeight: '800', fontSize: 16 },

  parkingResult: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 10 },
  parkingText: { fontWeight: '800', fontSize: 16 },
  parkingRestrictions: { fontSize: 14 },

  translationLangs: { fontSize: 12, marginBottom: 8 },
  translationText: { fontSize: 14, lineHeight: 22 },

  recText: { fontSize: 14, flex: 1 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  askBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
  },
  askBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  newScanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, borderWidth: 1,
  },
  newScanText: { fontWeight: '600', fontSize: 15 },
});
