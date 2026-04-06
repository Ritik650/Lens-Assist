import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useLanguageStore } from '@/store/language';
import { t } from '@/constants/i18n';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Tool {
  icon: IoniconName;
  label: string;
  desc: string;
  mode: string;
  category: string;
  color: string;
}

const ALL_TOOLS: Tool[] = [
  { icon: 'medical',          label: 'Medicine Scanner',      desc: 'Identify drugs, dosage & interactions',        mode: 'medicine',      category: 'Health',    color: '#EC4899' },
  { icon: 'document-text',    label: 'Prescription OCR',      desc: 'Digitize handwritten prescriptions',           mode: 'prescription',  category: 'Health',    color: '#8B5CF6' },
  { icon: 'analytics',        label: 'Lab Report Analyzer',   desc: 'Understand blood tests in plain language',     mode: 'lab_report',    category: 'Health',    color: '#3B82F6' },
  { icon: 'search',           label: 'Pill Identifier',       desc: 'Identify unknown pills by shape & imprint',   mode: 'pill_id',       category: 'Health',    color: '#F43F5E' },
  { icon: 'nutrition',        label: 'Food Label Scanner',    desc: 'Allergens, nutrition & dietary compliance',   mode: 'food',          category: 'Food',      color: '#F97316' },
  { icon: 'restaurant',       label: 'Menu Translator',       desc: 'Translate & filter menus for your diet',      mode: 'menu',          category: 'Food',      color: '#EAB308' },
  { icon: 'fast-food',        label: 'Plate Calorie Scan',    desc: 'Estimate calories from a meal photo',         mode: 'plate',         category: 'Food',      color: '#F59E0B' },
  { icon: 'leaf',             label: 'Produce Identifier',    desc: 'Freshness check & nutrition for produce',     mode: 'produce',       category: 'Food',      color: '#22C55E' },
  { icon: 'cafe',             label: 'Beverage Analyzer',     desc: 'Sugar & caffeine check for drinks',           mode: 'beverage',      category: 'Food',      color: '#06B6D4' },
  { icon: 'flask',            label: 'Chemical Checker',      desc: 'Dangerous mixing warnings & first aid',       mode: 'chemical',      category: 'Safety',    color: '#DC2626' },
  { icon: 'leaf',             label: 'Plant Identifier',      desc: 'Poisonous plants & pet safety alerts',        mode: 'plant',         category: 'Safety',    color: '#16A34A' },
  { icon: 'bug',              label: 'Insect / Bug ID',       desc: 'Venomous detection & bite treatment',         mode: 'insect',        category: 'Safety',    color: '#78350F' },
  { icon: 'time',             label: 'Expiry Detector',       desc: 'Parse expiry dates & warn if expired',        mode: 'expiry',        category: 'Safety',    color: '#D97706' },
  { icon: 'sparkles',         label: 'Cosmetics Analyzer',    desc: 'Harmful ingredients & skin suitability',      mode: 'skincare',      category: 'Safety',    color: '#DB2777' },
  { icon: 'receipt',          label: 'Receipt Scanner',       desc: 'Extract itemized expenses & categorize',      mode: 'receipt',       category: 'Daily',     color: '#7C3AED' },
  { icon: 'newspaper',        label: 'Document Analyzer',     desc: 'Highlight risky clauses in contracts',        mode: 'document',      category: 'Daily',     color: '#1D4ED8' },
  { icon: 'pencil',           label: 'Handwriting to Text',   desc: 'Convert notes & whiteboard to digital text',  mode: 'handwriting',   category: 'Daily',     color: '#0369A1' },
  { icon: 'car-sport',        label: 'Parking Sign Decoder',  desc: 'Instant "Can I park here?" answer',           mode: 'parking_sign',  category: 'Daily',     color: '#16A34A' },
  { icon: 'cash',             label: 'Currency Identifier',   desc: 'Foreign notes with live exchange rates',      mode: 'currency',      category: 'Daily',     color: '#B45309' },
  { icon: 'person-circle',    label: 'Business Card Scan',    desc: 'Save contact details in one tap',             mode: 'business_card', category: 'Daily',     color: '#0891B2' },
  { icon: 'shirt',            label: 'Clothing Label',        desc: 'Care instructions & fabric breakdown',        mode: 'clothing',      category: 'Lifestyle', color: '#0EA5E9' },
  { icon: 'fitness',          label: 'Exercise Form Check',   desc: 'Posture analysis & injury prevention',        mode: 'exercise',      category: 'Lifestyle', color: '#F97316' },
  { icon: 'scan-circle',      label: 'Skin Condition Screen', desc: 'Track moles & skin concerns over time',       mode: 'skin',          category: 'Lifestyle', color: '#EC4899' },
  { icon: 'paw',              label: 'Pet Food Safety',       desc: 'Check if food is safe for your pet',          mode: 'pet_product',   category: 'Lifestyle', color: '#92400E' },
  { icon: 'speedometer',      label: 'Dashboard Lights',      desc: 'Decode warning lights & urgency level',       mode: 'dashboard',     category: 'Lifestyle', color: '#DC2626' },
  { icon: 'airplane',         label: 'Travel Companion',      desc: 'Translate signs & cultural context abroad',   mode: 'travel',        category: 'Lifestyle', color: '#6366F1' },
];

const CATEGORIES = ['All', 'Health', 'Food', 'Safety', 'Daily', 'Lifestyle'];

const FEATURED_MODES = ['medicine', 'food', 'parking_sign', 'plant', 'receipt', 'chemical'];

export default function ToolsScreen() {
  const lang = useLanguageStore((s) => s.lang);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const featured = ALL_TOOLS.filter(tool => FEATURED_MODES.includes(tool.mode));

  const filtered = useMemo(() => {
    return ALL_TOOLS.filter(tool => {
      const matchCat = activeCategory === 'All' || tool.category === activeCategory;
      const matchQ = !query || tool.label.toLowerCase().includes(query.toLowerCase()) || tool.desc.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [query, activeCategory]);

  function openTool(mode: string) {
    router.push({ pathname: '/(tabs)/scan', params: { mode } });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t(lang, 'toolsTitle')}</Text>
          <Text style={styles.subtitle}>{t(lang, 'toolsSubtitle')}</Text>
        </View>
        <View style={styles.aiBadge}>
          <Ionicons name="flash" size={12} color={Colors.accent} />
          <Text style={styles.aiBadgeText}>Claude AI</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t(lang, 'searchTools')}
          placeholderTextColor={Colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, activeCategory === cat && styles.pillActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.pillText, activeCategory === cat && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured quick access */}
        {!query && activeCategory === 'All' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="flash" size={11} color={Colors.textMuted} /> {t(lang, 'quickAccess')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {featured.map(tool => (
                <TouchableOpacity
                  key={tool.mode}
                  style={styles.featuredCard}
                  onPress={() => openTool(tool.mode)}
                  activeOpacity={0.78}
                >
                  <View style={[styles.featuredIconBg, { backgroundColor: tool.color + '15' }]}>
                    <Ionicons name={tool.icon} size={26} color={tool.color} />
                  </View>
                  <Text style={styles.featuredLabel} numberOfLines={2}>{tool.label.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tool list */}
        <View style={styles.section}>
          {(!query && activeCategory === 'All') && (
            <Text style={styles.sectionLabel}>{t(lang, 'allToolsLabel')}</Text>
          )}

          <View style={styles.listCard}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={36} color={Colors.textLight} />
                <Text style={styles.emptyText}>{t(lang, 'noToolsFound')}</Text>
              </View>
            ) : (
              filtered.map((tool, i) => (
                <TouchableOpacity
                  key={tool.mode}
                  style={[styles.toolRow, i < filtered.length - 1 && styles.toolRowBorder]}
                  onPress={() => openTool(tool.mode)}
                  activeOpacity={0.72}
                >
                  <View style={[styles.toolIconBg, { backgroundColor: tool.color + '15' }]}>
                    <Ionicons name={tool.icon} size={22} color={tool.color} />
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolLabel}>{tool.label}</Text>
                    <Text style={styles.toolDesc} numberOfLines={1}>{tool.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryBg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentBg, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.accentBorder,
  },
  aiBadgeText: { color: Colors.accent, fontWeight: '700', fontSize: 12 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 4, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  clearBtn: { padding: 2 },

  pillRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 12 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff', fontWeight: '700' },

  section: { paddingHorizontal: 20, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.3, marginBottom: 12 },

  featuredCard: {
    alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16,
    padding: 14, width: 88, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  featuredIconBg: { width: 52, height: 52, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  featuredLabel: { color: Colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  listCard: {
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  toolRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14,
  },
  toolRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  toolIconBg: { width: 48, height: 48, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  toolInfo: { flex: 1 },
  toolLabel: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  toolDesc: { color: Colors.textMuted, fontSize: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
});
