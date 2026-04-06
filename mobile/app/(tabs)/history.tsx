import { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useLanguageStore } from '@/store/language';
import { t } from '@/constants/i18n';
import { getScanHistory } from '@/services/scan';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function typeIcon(type: string): { name: IoniconName; color: string } {
  const map: Record<string, { name: IoniconName; color: string }> = {
    medicine:     { name: 'medical',       color: '#EC4899' },
    prescription: { name: 'document-text', color: '#8B5CF6' },
    lab_report:   { name: 'analytics',     color: '#3B82F6' },
    pill_id:      { name: 'search',        color: '#F43F5E' },
    food:         { name: 'nutrition',     color: '#F97316' },
    menu:         { name: 'restaurant',    color: '#EAB308' },
    plate:        { name: 'fast-food',     color: '#F59E0B' },
    produce:      { name: 'leaf',          color: '#22C55E' },
    beverage:     { name: 'cafe',          color: '#06B6D4' },
    chemical:     { name: 'flask',         color: '#DC2626' },
    plant:        { name: 'leaf',          color: '#16A34A' },
    insect:       { name: 'bug',           color: '#78350F' },
    expiry:       { name: 'time',          color: '#D97706' },
    skincare:     { name: 'sparkles',      color: '#DB2777' },
    receipt:      { name: 'receipt',       color: '#7C3AED' },
    document:     { name: 'newspaper',     color: '#1D4ED8' },
    handwriting:  { name: 'pencil',        color: '#0369A1' },
    parking_sign: { name: 'car-sport',     color: '#16A34A' },
    currency:     { name: 'cash',          color: '#B45309' },
    business_card:{ name: 'person-circle', color: '#0891B2' },
    clothing:     { name: 'shirt',         color: '#0EA5E9' },
    exercise:     { name: 'fitness',       color: '#F97316' },
    skin:         { name: 'scan-circle',   color: '#EC4899' },
    pet_product:  { name: 'paw',           color: '#92400E' },
    dashboard:    { name: 'speedometer',   color: '#DC2626' },
    travel:       { name: 'airplane',      color: '#6366F1' },
  };
  return map[type] || { name: 'camera-outline', color: Colors.textMuted };
}

export default function HistoryScreen() {
  const lang = useLanguageStore((s) => s.lang);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
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
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t(lang, 'historyTitle')}</Text>
            <Text style={styles.subtitle}>{scans.length} scans recorded</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={14} color={Colors.accent} />
            <Text style={styles.badgeText}>All Time</Text>
          </View>
        </View>
      }
      data={scans}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={Colors.accent}
        />
      }
      renderItem={({ item, index }) => {
        const icon = typeIcon(item.detected_type || item.scan_mode);
        return (
          <TouchableOpacity
            style={[styles.card, index === 0 && { marginTop: 0 }]}
            onPress={() => router.push({ pathname: '/scan/result', params: { scanId: item.id } })}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBg, { backgroundColor: icon.color + '15' }]}>
              <Ionicons name={icon.name} size={22} color={icon.color} />
            </View>
            <View style={styles.info}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product_name || item.detected_type || 'Unknown item'}
              </Text>
              <Text style={styles.itemMeta}>
                {item.scan_mode} · {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            <View style={styles.rightCol}>
              {item.result?.allergen_warnings?.length > 0 && (
                <View style={styles.alertBadge}>
                  <Ionicons name="warning" size={11} color={Colors.danger} />
                  <Text style={styles.alertBadgeText}>{item.result.allergen_warnings.length}</Text>
                </View>
              )}
              {item.confidence && (
                <Text style={styles.conf}>{(item.confidence * 100).toFixed(0)}%</Text>
              )}
              <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="camera-outline" size={40} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>{t(lang, 'noScansYet')}</Text>
          <Text style={styles.emptySub}>Start by scanning any object</Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Ionicons name="scan-outline" size={16} color="#fff" />
            <Text style={styles.startBtnText}>{t(lang, 'startScanning')}</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.primaryBg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentBg, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.accentBorder,
  },
  badgeText: { color: Colors.accent, fontWeight: '700', fontSize: 12 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  iconBg: { width: 48, height: 48, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  itemName: { color: Colors.text, fontWeight: '600', fontSize: 15 },
  itemMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.dangerBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.dangerBorder,
  },
  alertBadgeText: { color: Colors.danger, fontSize: 11, fontWeight: '700' },
  conf: { color: Colors.textMuted, fontSize: 12 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    marginBottom: 4,
  },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: Colors.textMuted, fontSize: 14 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
    backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
