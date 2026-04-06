import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useProfileStore } from '@/store/profile';
import { useLanguageStore } from '@/store/language';
import { t } from '@/constants/i18n';
import { api } from '@/services/api';
import { getScanHistory } from '@/services/scan';

const QUICK_SCANS = [
  { icon: 'medical' as const,       label: 'Medicine',  mode: 'medicine',     color: '#EC4899' },
  { icon: 'nutrition' as const,     label: 'Food',      mode: 'food',         color: '#F97316' },
  { icon: 'car-sport' as const,     label: 'Parking',   mode: 'parking_sign', color: '#16A34A' },
  { icon: 'leaf' as const,          label: 'Plant',     mode: 'plant',        color: '#15803D' },
  { icon: 'flask' as const,         label: 'Chemical',  mode: 'chemical',     color: '#DC2626' },
  { icon: 'receipt' as const,       label: 'Receipt',   mode: 'receipt',      color: '#7C3AED' },
];

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  medicine:     { icon: 'medical',       color: '#EC4899' },
  food:         { icon: 'nutrition',     color: '#F97316' },
  document:     { icon: 'document-text', color: '#3B82F6' },
  chemical:     { icon: 'flask',         color: '#DC2626' },
  plant:        { icon: 'leaf',          color: '#16A34A' },
  insect:       { icon: 'bug',           color: '#92400E' },
  currency:     { icon: 'cash',          color: '#D97706' },
  receipt:      { icon: 'receipt',       color: '#7C3AED' },
  clothing:     { icon: 'shirt',         color: '#0EA5E9' },
  skincare:     { icon: 'sparkles',      color: '#EC4899' },
  exercise:     { icon: 'fitness',       color: '#F97316' },
  parking_sign: { icon: 'car-sport',     color: '#16A34A' },
};

function typeIcon(type: string) {
  return TYPE_ICON[type] || { icon: 'camera', color: Colors.accent };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardScreen() {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const lang = useLanguageStore((s) => s.lang);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any>(null);
  const [totalScans, setTotalScans] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [prof, scans, exp] = await Promise.all([
          api.get('/profile'),
          getScanHistory(20),
          api.get('/expenses/summary'),
        ]);
        setProfile(prof as any);
        const all = scans as any[];
        setTotalScans(all.length);
        setRecentScans(all.slice(0, 4));
        setExpenses(exp);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  const allergenCount = profile?.allergies?.length ?? 0;
  const conditionCount = profile?.conditions?.length ?? 0;
  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t(lang, 'goodMorning')
    : hour < 17 ? t(lang, 'goodAfternoon') : t(lang, 'goodEvening');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{profile?.name ?? 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.avatarText}>{(profile?.name ?? 'U')[0].toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Health alert */}
      {(allergenCount > 0 || conditionCount > 0) && (
        <View style={styles.alertBanner}>
          <View style={styles.alertLeft}>
            <View style={styles.alertIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.alertTitle}>{t(lang, 'healthProfile')}</Text>
              <Text style={styles.alertSub}>
                {allergenCount} allergen{allergenCount !== 1 ? 's' : ''} · {conditionCount} {t(lang, 'healthProfileSub').split('·')[1]?.trim()}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.alertLink}>{t(lang, 'edit')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label={t(lang, 'totalScans')} value={String(totalScans)} iconName="camera" color={Colors.accent} />
        <StatCard label={t(lang, 'allergens')} value={String(allergenCount)} iconName="warning" color="#EC4899" />
        <StatCard
          label={t(lang, 'expenses')}
          value={expenses?.total > 0 ? `₹${Math.round(expenses.total)}` : '—'}
          iconName="wallet"
          color="#7C3AED"
        />
      </View>

      {/* Main CTA */}
      <TouchableOpacity style={styles.scanCTA} onPress={() => router.push('/(tabs)/scan')} activeOpacity={0.88}>
        <View>
          <Text style={styles.scanCTATitle}>{t(lang, 'scanSomething')}</Text>
          <Text style={styles.scanCTASub}>{t(lang, 'scanSubtitle')}</Text>
        </View>
        <View style={styles.scanCTAIconWrap}>
          <Ionicons name="scan" size={28} color={Colors.white} />
        </View>
      </TouchableOpacity>

      {/* Quick scan */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t(lang, 'quickScan')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tools')}>
          <Text style={styles.seeAll}>{t(lang, 'allTools')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {QUICK_SCANS.map(qs => (
          <TouchableOpacity
            key={qs.mode}
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(tabs)/scan', params: { mode: qs.mode } })}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIconBg, { backgroundColor: qs.color + '15' }]}>
              <Ionicons name={qs.icon} size={24} color={qs.color} />
            </View>
            <Text style={styles.quickLabel}>{qs.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recent scans */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t(lang, 'recentScans')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
          <Text style={styles.seeAll}>{t(lang, 'seeAll')}</Text>
        </TouchableOpacity>
      </View>

      {recentScans.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="camera-outline" size={36} color={Colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>{t(lang, 'noScansYet')}</Text>
          <Text style={styles.emptySub}>Tap Scan to analyse any object instantly</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.emptyBtnText}>{t(lang, 'startScanning')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentScans.map((scan) => {
          const { icon, color } = typeIcon(scan.detected_type);
          const hasAlert = scan.result?.allergen_warnings?.length > 0;
          const isExpired = scan.result?.safety_info?.is_expired;
          return (
            <TouchableOpacity
              key={scan.id}
              style={styles.scanRow}
              onPress={() => router.push({ pathname: '/scan/result', params: { scanId: scan.id } })}
              activeOpacity={0.75}
            >
              <View style={[styles.scanRowIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={22} color={color} />
              </View>
              <View style={styles.scanRowInfo}>
                <Text style={styles.scanRowTitle} numberOfLines={1}>
                  {scan.product_name || scan.detected_type || 'Unknown'}
                </Text>
                <Text style={styles.scanRowSub}>{scan.scan_mode} · {timeAgo(scan.created_at)}</Text>
              </View>
              {(hasAlert || isExpired) ? (
                <View style={styles.alertPill}>
                  <Ionicons name="warning" size={11} color={Colors.danger} />
                  <Text style={styles.alertPillText}>{isExpired ? t(lang, 'expired') : t(lang, 'alert')}</Text>
                </View>
              ) : (
                <View style={styles.safePill}>
                  <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
                  <Text style={styles.safePillText}>{t(lang, 'safe')}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, iconName, color }: { label: string; value: string; iconName: any; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryBg },
  content: { padding: 20, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: Colors.text, marginTop: 2 },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.accentBg,
    borderWidth: 2, borderColor: Colors.accentBorder, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: Colors.accent, fontWeight: '800', fontSize: 18 },

  alertBanner: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.borderGreen, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentBg, justifyContent: 'center', alignItems: 'center' },
  alertTitle: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  alertSub: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  alertLink: { color: Colors.accent, fontWeight: '600', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  scanCTA: {
    backgroundColor: Colors.accent, borderRadius: 18, padding: 20, marginBottom: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  scanCTATitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  scanCTASub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  scanCTAIconWrap: {
    width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2 },
  seeAll: { color: Colors.accent, fontSize: 13, fontWeight: '600' },

  quickRow: { gap: 10, paddingBottom: 4, marginBottom: 24 },
  quickCard: {
    alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16,
    padding: 14, width: 82, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickIconBg: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel: { color: Colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.accentBg, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  emptyBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  scanRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
    gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  scanRowIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scanRowInfo: { flex: 1 },
  scanRowTitle: { color: Colors.text, fontWeight: '600', fontSize: 15 },
  scanRowSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  alertPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.dangerBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.dangerBorder,
  },
  alertPillText: { color: Colors.danger, fontSize: 10, fontWeight: '700' },
  safePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.successBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.borderGreen,
  },
  safePillText: { color: Colors.success, fontSize: 10, fontWeight: '700' },
});
