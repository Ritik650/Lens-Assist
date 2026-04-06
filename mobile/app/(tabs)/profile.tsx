import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Modal, StyleSheet, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth';
import { useProfileStore } from '@/store/profile';
import { useLanguageStore } from '@/store/language';
import { api } from '@/services/api';
import { t, LANGUAGES, LangCode } from '@/constants/i18n';

const ALLERGEN_OPTIONS = ['peanuts', 'milk', 'wheat', 'eggs', 'soy', 'tree_nuts', 'shellfish', 'fish'];
const CONDITION_OPTIONS = ['diabetes', 'hypertension', 'asthma', 'heart_disease', 'kidney_disease', 'pregnancy'];
const DIET_OPTIONS = ['none', 'vegetarian', 'vegan', 'halal', 'kosher', 'jain', 'keto'];
const SKIN_OPTIONS = ['unknown', 'oily', 'dry', 'sensitive', 'combination', 'normal'];

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const { lang: appLang, setLang: setAppLang } = useLanguageStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!profile);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [selectedLang, setSelectedLang] = useState<LangCode>((profile?.preferred_lang as LangCode) || appLang);
  const [allergies, setAllergies] = useState<string[]>(profile?.allergies || []);
  const [conditions, setConditions] = useState<string[]>(profile?.conditions || []);
  const [medications, setMedications] = useState(profile?.medications?.join(', ') || '');
  const [diet, setDiet] = useState(profile?.diet_type || 'none');
  const [skinType, setSkinType] = useState(profile?.skin_type || 'unknown');
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || '');

  useEffect(() => {
    if (!profile) {
      api.get('/profile').then((p: any) => {
        setProfile(p);
        setName(p.name || '');
        setAge(p.age?.toString() || '');
        setSelectedLang((p.preferred_lang as LangCode) || 'en');
        setAllergies(p.allergies || []);
        setConditions(p.conditions || []);
        setMedications(p.medications?.join(', ') || '');
        setDiet(p.diet_type || 'none');
        setSkinType(p.skin_type || 'unknown');
        setBloodGroup(p.blood_group || '');
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, []);

  function toggle(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  async function save() {
    setSaving(true);
    try {
      const updated: any = await api.put('/profile', {
        name, age: age ? parseInt(age) : null,
        preferred_lang: selectedLang,
        allergies, conditions,
        medications: medications.split(',').map(s => s.trim()).filter(Boolean),
        diet_type: diet, skin_type: skinType,
        blood_group: bloodGroup || null,
      });
      setProfile(updated);
      await setAppLang(selectedLang);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  const currentLangInfo = LANGUAGES.find(l => l.code === selectedLang);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t(appLang, 'profile')}</Text>
            <Text style={styles.subtitle}>{t(appLang, 'profileSubtitle')}</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={28} color={Colors.accent} />
          </View>
        </View>

        {/* Basic Info */}
        <Section title={t(appLang, 'basicInfo')} icon="person-outline">
          <Field label="Name" value={name} onChange={setName} icon="text-outline" />
          <Field label={t(appLang, 'age')} value={age} onChange={setAge} keyboardType="numeric" icon="calendar-outline" />
          <Field label={t(appLang, 'bloodGroup')} value={bloodGroup} onChange={setBloodGroup} icon="water-outline" />
        </Section>

        {/* Language Selector */}
        <Section title={t(appLang, 'language')} icon="language-outline">
          <TouchableOpacity style={styles.langSelect} onPress={() => setLangPickerOpen(true)}>
            <Text style={styles.langFlag}>{currentLangInfo?.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.langName}>{currentLangInfo?.native}</Text>
              <Text style={styles.langSub}>{currentLangInfo?.name}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </Section>

        {/* Allergens */}
        <Section title={t(appLang, 'allergenSection')} icon="warning-outline">
          <ChipGroup
            options={ALLERGEN_OPTIONS}
            selected={allergies}
            onToggle={(v) => toggle(allergies, v, setAllergies)}
            danger
          />
        </Section>

        {/* Conditions */}
        <Section title={t(appLang, 'conditionsSection')} icon="medical-outline">
          <ChipGroup
            options={CONDITION_OPTIONS}
            selected={conditions}
            onToggle={(v) => toggle(conditions, v, setConditions)}
          />
        </Section>

        {/* Medications */}
        <Section title={t(appLang, 'medicationsSection')} icon="flask-outline">
          <Field
            label={t(appLang, 'medicationsHint')}
            value={medications}
            onChange={setMedications}
            multiline
            icon="list-outline"
          />
        </Section>

        {/* Diet */}
        <Section title={t(appLang, 'dietSection')} icon="nutrition-outline">
          <ChipGroup options={DIET_OPTIONS} selected={[diet]} onToggle={setDiet} />
        </Section>

        {/* Skin */}
        <Section title={t(appLang, 'skinSection')} icon="sparkles-outline">
          <ChipGroup options={SKIN_OPTIONS} selected={[skinType]} onToggle={setSkinType} />
        </Section>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          )}
          <Text style={styles.saveBtnText}>
            {saving ? t(appLang, 'saving') : t(appLang, 'saveProfile')}
          </Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => { logout(); router.replace('/(auth)/login'); }}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.signOutText}>{t(appLang, 'signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal visible={langPickerOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setLangPickerOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.langRow, selectedLang === item.code && styles.langRowActive]}
                  onPress={() => { setSelectedLang(item.code); setLangPickerOpen(false); }}
                >
                  <Text style={styles.langRowFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langRowNative, selectedLang === item.code && { color: Colors.accent }]}>
                      {item.native}
                    </Text>
                    <Text style={styles.langRowEn}>{item.name}</Text>
                  </View>
                  {selectedLang === item.code && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={13} color={Colors.textMuted} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType = 'default', multiline = false, icon }: any) {
  return (
    <View style={styles.fieldWrap}>
      {icon && <Ionicons name={icon} size={16} color={Colors.textMuted} style={styles.fieldIcon} />}
      <TextInput
        style={[styles.fieldInput, { flex: 1 }]}
        placeholder={label}
        placeholderTextColor={Colors.textLight}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function ChipGroup({ options, selected, onToggle, danger = false }: any) {
  return (
    <View style={styles.chipGroup}>
      {options.map((opt: string) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              active && (danger ? styles.chipDanger : styles.chipActive),
            ]}
            onPress={() => onToggle(opt)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryBg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accentBorder,
  },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.3 },
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface2, borderRadius: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  fieldIcon: { marginRight: 8 },
  fieldInput: { color: Colors.text, fontSize: 15, paddingVertical: 12 },

  langSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface2, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  langFlag: { fontSize: 24 },
  langName: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  langSub: { color: Colors.textMuted, fontSize: 12 },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipDanger: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  chipText: { color: Colors.textMuted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.dangerBorder, borderRadius: 14, paddingVertical: 16, marginTop: 10,
    backgroundColor: Colors.dangerBg,
  },
  signOutText: { color: Colors.danger, fontWeight: '600', fontSize: 15 },

  // Modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  langRowActive: { backgroundColor: Colors.accentBg },
  langRowFlag: { fontSize: 24 },
  langRowNative: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  langRowEn: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
});
