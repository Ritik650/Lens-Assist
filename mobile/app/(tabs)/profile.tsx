import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  Switch, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth';
import { useProfileStore } from '@/store/profile';
import { api } from '@/services/api';

const ALLERGEN_OPTIONS = ['peanuts', 'milk', 'wheat', 'eggs', 'soy', 'tree_nuts', 'shellfish', 'fish'];
const CONDITION_OPTIONS = ['diabetes', 'hypertension', 'asthma', 'heart_disease', 'kidney_disease', 'pregnancy'];
const DIET_OPTIONS = ['none', 'vegetarian', 'vegan', 'halal', 'kosher', 'jain', 'keto'];
const SKIN_OPTIONS = ['unknown', 'oily', 'dry', 'sensitive', 'combination', 'normal'];

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!profile);

  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [lang, setLang] = useState(profile?.preferred_lang || 'en');
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
        setLang(p.preferred_lang || 'en');
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
        preferred_lang: lang,
        allergies, conditions,
        medications: medications.split(',').map(s => s.trim()).filter(Boolean),
        diet_type: diet, skin_type: skinType,
        blood_group: bloodGroup || null,
      });
      setProfile(updated);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.primary }} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 4 }}>Profile</Text>
      <Text style={{ color: Colors.textMuted, marginBottom: 28 }}>Your health & safety settings</Text>

      <Section title="BASIC INFO">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Age" value={age} onChange={setAge} keyboardType="numeric" />
        <Field label="Blood Group (e.g. A+)" value={bloodGroup} onChange={setBloodGroup} />
        <Field label="Language (e.g. en, hi, ta)" value={lang} onChange={setLang} />
      </Section>

      <Section title="ALLERGENS">
        <ChipGroup options={ALLERGEN_OPTIONS} selected={allergies} onToggle={(v) => toggle(allergies, v, setAllergies)} danger />
      </Section>

      <Section title="MEDICAL CONDITIONS">
        <ChipGroup options={CONDITION_OPTIONS} selected={conditions} onToggle={(v) => toggle(conditions, v, setConditions)} />
      </Section>

      <Section title="CURRENT MEDICATIONS">
        <Field label="Comma-separated (e.g. Warfarin, Metformin)" value={medications} onChange={setMedications} multiline />
      </Section>

      <Section title="DIET TYPE">
        <ChipGroup options={DIET_OPTIONS} selected={[diet]} onToggle={(v) => setDiet(v)} />
      </Section>

      <Section title="SKIN TYPE">
        <ChipGroup options={SKIN_OPTIONS} selected={[skinType]} onToggle={(v) => setSkinType(v)} />
      </Section>

      <TouchableOpacity
        style={{ backgroundColor: Colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, opacity: saving ? 0.6 : 1 }}
        onPress={save}
        disabled={saving}
      >
        <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16 }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 }}
        onPress={() => { logout(); router.replace('/(auth)/login'); }}
      >
        <Text style={{ color: Colors.danger, fontWeight: '600' }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 12 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border }}>
        {children}
      </View>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType = 'default', multiline = false }: any) {
  return (
    <TextInput
      style={{ backgroundColor: Colors.surface2, color: Colors.text, borderRadius: 8, padding: 12, fontSize: 15 }}
      placeholder={label}
      placeholderTextColor={Colors.textMuted}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  );
}

function ChipGroup({ options, selected, onToggle, danger = false }: any) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt: string) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: active ? (danger ? Colors.danger : Colors.accent) : Colors.surface2,
              borderWidth: 1,
              borderColor: active ? (danger ? Colors.danger : Colors.accent) : Colors.border,
            }}
            onPress={() => onToggle(opt)}
          >
            <Text style={{ color: active ? Colors.primary : Colors.textMuted, fontSize: 13, fontWeight: active ? '700' : '400' }}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
