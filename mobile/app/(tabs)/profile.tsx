import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Modal, StyleSheet, FlatList, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/auth';
import { useProfileStore } from '@/store/profile';
import { useLanguageStore } from '@/store/language';
import { useThemeStore, ThemeMode } from '@/store/theme';
import { api } from '@/services/api';
import { t, LANGUAGES, LangCode } from '@/constants/i18n';

const ALLERGEN_OPTIONS = ['peanuts', 'milk', 'wheat', 'eggs', 'soy', 'tree_nuts', 'shellfish', 'fish'];
const CONDITION_OPTIONS = ['diabetes', 'hypertension', 'asthma', 'heart_disease', 'kidney_disease', 'pregnancy'];
const DIET_OPTIONS = ['none', 'vegetarian', 'vegan', 'halal', 'kosher', 'jain', 'keto'];
const SKIN_OPTIONS = ['unknown', 'oily', 'dry', 'sensitive', 'combination', 'normal'];

interface FamilyMember {
  name: string;
  age: string;
  allergies: string[];
  conditions: string[];
  diet_type: string;
}

export default function ProfileScreen() {
  const C = useColors();
  const logout = useAuthStore((s) => s.logout);
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const { lang: appLang, setLang: setAppLang } = useLanguageStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!profile);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  // Basic info
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [selectedLang, setSelectedLang] = useState<LangCode>((profile?.preferred_lang as LangCode) || appLang);
  const [allergies, setAllergies] = useState<string[]>(profile?.allergies || []);
  const [conditions, setConditions] = useState<string[]>(profile?.conditions || []);
  const [medications, setMedications] = useState(profile?.medications?.join(', ') || '');
  const [diet, setDiet] = useState(profile?.diet_type || 'none');
  const [skinType, setSkinType] = useState(profile?.skin_type || 'unknown');
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || '');

  // Family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState<FamilyMember>({
    name: '', age: '', allergies: [], conditions: [], diet_type: 'none',
  });

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
        try {
          const fm = typeof p.family_members === 'string' ? JSON.parse(p.family_members) : (p.family_members || []);
          setFamilyMembers(fm);
        } catch {}
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      try {
        const fm = typeof profile.family_members === 'string'
          ? JSON.parse(profile.family_members)
          : (profile.family_members || []);
        setFamilyMembers(fm);
      } catch {}
    }
  }, []);

  function toggle(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  function addFamilyMember() {
    if (!newMember.name.trim()) return;
    setFamilyMembers(prev => [...prev, newMember]);
    setNewMember({ name: '', age: '', allergies: [], conditions: [], diet_type: 'none' });
    setAddingMember(false);
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
        family_members: JSON.stringify(familyMembers),
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
      <View style={[styles.center, { backgroundColor: C.primaryBg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  const s = makeStyles(C);

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: C.primaryBg }} contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>{t(appLang, 'profile')}</Text>
            <Text style={s.subtitle}>{t(appLang, 'profileSubtitle')}</Text>
          </View>
          <View style={s.avatarWrap}>
            <Ionicons name="person" size={28} color={C.accent} />
          </View>
        </View>

        {/* Dark mode toggle */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="moon-outline" size={13} color={C.textMuted} />
            <Text style={s.sectionTitle}>APPEARANCE</Text>
          </View>
          <View style={s.sectionCard}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[s.themeRow, themeMode === mode && { backgroundColor: C.accentBg }]}
                onPress={() => setThemeMode(mode)}
              >
                <Ionicons
                  name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                  size={18}
                  color={themeMode === mode ? C.accent : C.textMuted}
                />
                <Text style={[s.themeLabel, themeMode === mode && { color: C.accent, fontWeight: '700' }]}>
                  {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
                </Text>
                {themeMode === mode && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Basic Info */}
        <Section title={t(appLang, 'basicInfo')} icon="person-outline" C={C}>
          <Field label="Name" value={name} onChange={setName} icon="text-outline" C={C} />
          <Field label={t(appLang, 'age')} value={age} onChange={setAge} keyboardType="numeric" icon="calendar-outline" C={C} />
          <Field label={t(appLang, 'bloodGroup')} value={bloodGroup} onChange={setBloodGroup} icon="water-outline" C={C} />
        </Section>

        {/* Language */}
        <Section title={t(appLang, 'language')} icon="language-outline" C={C}>
          <TouchableOpacity style={s.langSelect} onPress={() => setLangPickerOpen(true)}>
            <Text style={s.langFlag}>{currentLangInfo?.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.langName}>{currentLangInfo?.native}</Text>
              <Text style={s.langSub}>{currentLangInfo?.name}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </Section>

        {/* Family Members */}
        <Section title="FAMILY MEMBERS" icon="people-outline" C={C}>
          {familyMembers.map((m, i) => (
            <View key={i} style={[s.familyMemberRow, { borderColor: C.border }]}>
              <View style={[s.familyAvatar, { backgroundColor: C.accentBg }]}>
                <Ionicons name="person" size={16} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.familyName}>{m.name}, {m.age}y</Text>
                {m.allergies.length > 0 && (
                  <Text style={s.familyAllergies}>Allergies: {m.allergies.join(', ')}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setFamilyMembers(prev => prev.filter((_, idx) => idx !== i))}>
                <Ionicons name="close-circle" size={20} color={C.textLight} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[s.addMemberBtn, { borderColor: C.accent, backgroundColor: C.accentBg }]}
            onPress={() => setAddingMember(true)}
          >
            <Ionicons name="person-add-outline" size={16} color={C.accent} />
            <Text style={[s.addMemberText, { color: C.accent }]}>Add Family Member</Text>
          </TouchableOpacity>
          <Text style={[s.familyHint, { color: C.textMuted }]}>
            Multi-profile scan checks safety for each member
          </Text>
        </Section>

        {/* Allergens */}
        <Section title={t(appLang, 'allergenSection')} icon="warning-outline" C={C}>
          <ChipGroup options={ALLERGEN_OPTIONS} selected={allergies} onToggle={(v) => toggle(allergies, v, setAllergies)} danger C={C} />
        </Section>

        {/* Conditions */}
        <Section title={t(appLang, 'conditionsSection')} icon="medical-outline" C={C}>
          <ChipGroup options={CONDITION_OPTIONS} selected={conditions} onToggle={(v) => toggle(conditions, v, setConditions)} C={C} />
        </Section>

        {/* Medications */}
        <Section title={t(appLang, 'medicationsSection')} icon="flask-outline" C={C}>
          <Field label={t(appLang, 'medicationsHint')} value={medications} onChange={setMedications} multiline icon="list-outline" C={C} />
        </Section>

        {/* Diet */}
        <Section title={t(appLang, 'dietSection')} icon="nutrition-outline" C={C}>
          <ChipGroup options={DIET_OPTIONS} selected={[diet]} onToggle={setDiet} C={C} />
        </Section>

        {/* Skin */}
        <Section title={t(appLang, 'skinSection')} icon="sparkles-outline" C={C}>
          <ChipGroup options={SKIN_OPTIONS} selected={[skinType]} onToggle={setSkinType} C={C} />
        </Section>

        {/* Save */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
          <Text style={s.saveBtnText}>{saving ? t(appLang, 'saving') : t(appLang, 'saveProfile')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.signOutBtn}
          onPress={() => { logout(); router.replace('/(auth)/login'); }}
        >
          <Ionicons name="log-out-outline" size={18} color={C.danger} />
          <Text style={[s.signOutText, { color: C.danger }]}>{t(appLang, 'signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Picker */}
      <Modal visible={langPickerOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Select Language</Text>
              <TouchableOpacity onPress={() => setLangPickerOpen(false)}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.langRow, selectedLang === item.code && { backgroundColor: C.accentBg }]}
                  onPress={() => { setSelectedLang(item.code); setLangPickerOpen(false); }}
                >
                  <Text style={styles.langRowFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langRowNative, { color: C.text }, selectedLang === item.code && { color: C.accent }]}>
                      {item.native}
                    </Text>
                    <Text style={[styles.langRowEn, { color: C.textMuted }]}>{item.name}</Text>
                  </View>
                  {selectedLang === item.code && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Add Family Member Modal */}
      <Modal visible={addingMember} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setAddingMember(false)}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <TextInput
                style={[styles.memberInput, { backgroundColor: C.surface2, color: C.text, borderColor: C.border }]}
                placeholder="Name (e.g. Mom, Son)"
                placeholderTextColor={C.textLight}
                value={newMember.name}
                onChangeText={v => setNewMember(m => ({ ...m, name: v }))}
              />
              <TextInput
                style={[styles.memberInput, { backgroundColor: C.surface2, color: C.text, borderColor: C.border, marginTop: 10 }]}
                placeholder="Age"
                placeholderTextColor={C.textLight}
                value={newMember.age}
                onChangeText={v => setNewMember(m => ({ ...m, age: v }))}
                keyboardType="numeric"
              />
              <Text style={[styles.memberSectionLabel, { color: C.textMuted }]}>ALLERGENS</Text>
              <View style={styles.chipGroupWrap}>
                {ALLERGEN_OPTIONS.map(opt => {
                  const active = newMember.allergies.includes(opt);
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, { backgroundColor: active ? C.danger : C.surface2, borderColor: active ? C.danger : C.border }]}
                      onPress={() => setNewMember(m => ({
                        ...m,
                        allergies: active ? m.allergies.filter(a => a !== opt) : [...m.allergies, opt],
                      }))}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : C.textMuted }]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.memberSectionLabel, { color: C.textMuted }]}>CONDITIONS</Text>
              <View style={styles.chipGroupWrap}>
                {CONDITION_OPTIONS.map(opt => {
                  const active = newMember.conditions.includes(opt);
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, { backgroundColor: active ? C.accent : C.surface2, borderColor: active ? C.accent : C.border }]}
                      onPress={() => setNewMember(m => ({
                        ...m,
                        conditions: active ? m.conditions.filter(c => c !== opt) : [...m.conditions, opt],
                      }))}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : C.textMuted }]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.addMemberConfirmBtn, { backgroundColor: C.accent }]}
                onPress={addFamilyMember}
              >
                <Text style={styles.addMemberConfirmText}>Add Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Section({ title, icon, children, C }: { title: string; icon: string; children: React.ReactNode; C: any }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Ionicons name={icon as any} size={13} color={C.textMuted} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.3 }}>{title}</Text>
      </View>
      <View style={[{ backgroundColor: C.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: C.border }]}>
        {children}
      </View>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType = 'default', multiline = false, icon, C }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border }}>
      {icon && <Ionicons name={icon} size={16} color={C.textMuted} style={{ marginRight: 8 }} />}
      <TextInput
        style={{ flex: 1, color: C.text, fontSize: 15, paddingVertical: 12 }}
        placeholder={label}
        placeholderTextColor={C.textLight}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function ChipGroup({ options, selected, onToggle, danger = false, C }: any) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt: string) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? (danger ? C.danger : C.accent) : C.surface2, borderWidth: 1, borderColor: active ? (danger ? C.danger : C.accent) : C.border }}
            onPress={() => onToggle(opt)}
          >
            <Text style={{ color: active ? '#fff' : C.textMuted, fontSize: 13, fontWeight: active ? '700' : '400' }}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(C: any) {
  return {
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    header: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: '800' as const, color: C.text },
    subtitle: { color: C.textMuted, fontSize: 13, marginTop: 2 },
    avatarWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.accentBg, justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: C.accentBorder },
    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 10 },
    sectionTitle: { fontSize: 11, fontWeight: '700' as const, color: C.textMuted, letterSpacing: 1.3 },
    sectionCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' as const },
    themeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    themeLabel: { flex: 1, fontSize: 15, color: C.textMuted },
    langSelect: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, backgroundColor: C.surface2, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
    langFlag: { fontSize: 24 },
    langName: { color: C.text, fontSize: 16, fontWeight: '600' as const },
    langSub: { color: C.textMuted, fontSize: 12 },
    familyMemberRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
    familyAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center' as const, alignItems: 'center' as const },
    familyName: { color: C.text, fontSize: 14, fontWeight: '600' as const },
    familyAllergies: { color: C.danger, fontSize: 12, marginTop: 1 },
    addMemberBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, borderWidth: 1.5, borderStyle: 'dashed' as const, borderRadius: 12, paddingVertical: 12, marginTop: 8 },
    addMemberText: { fontSize: 14, fontWeight: '600' as const },
    familyHint: { fontSize: 11, marginTop: 8, textAlign: 'center' as const },
    saveBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
    saveBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 16 },
    signOutBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, borderWidth: 1, borderColor: C.dangerBorder, borderRadius: 14, paddingVertical: 16, marginTop: 10, backgroundColor: C.dangerBg },
    signOutText: { fontWeight: '600' as const, fontSize: 15 },
  };
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  langRowFlag: { fontSize: 24 },
  langRowNative: { fontSize: 16, fontWeight: '600' },
  langRowEn: { fontSize: 12, marginTop: 1 },
  memberInput: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  memberSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },
  chipGroupWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12 },
  addMemberConfirmBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  addMemberConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
