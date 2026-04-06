import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

const TOOLS = [
  {
    category: 'HEALTH & MEDICINE',
    items: [
      { emoji: '💊', label: 'Medicine', mode: 'medicine' },
      { emoji: '📋', label: 'Prescription', mode: 'prescription' },
      { emoji: '🩸', label: 'Lab Report', mode: 'lab_report' },
      { emoji: '💉', label: 'Pill ID', mode: 'pill_id' },
    ],
  },
  {
    category: 'FOOD & NUTRITION',
    items: [
      { emoji: '🏷️', label: 'Food Label', mode: 'food' },
      { emoji: '🍽️', label: 'Menu', mode: 'menu' },
      { emoji: '🥗', label: 'Plate Scan', mode: 'plate' },
      { emoji: '🌽', label: 'Produce', mode: 'produce' },
    ],
  },
  {
    category: 'SAFETY',
    items: [
      { emoji: '🧪', label: 'Chemicals', mode: 'chemical' },
      { emoji: '🧴', label: 'Skincare', mode: 'skincare' },
      { emoji: '🌿', label: 'Plant ID', mode: 'plant' },
      { emoji: '🕷️', label: 'Insect ID', mode: 'insect' },
    ],
  },
  {
    category: 'DAILY LIFE',
    items: [
      { emoji: '🧾', label: 'Receipt', mode: 'receipt' },
      { emoji: '📇', label: 'Business Card', mode: 'business_card' },
      { emoji: '✏️', label: 'Handwriting', mode: 'handwriting' },
      { emoji: '📄', label: 'Document', mode: 'document' },
      { emoji: '🅿️', label: 'Parking Sign', mode: 'parking_sign' },
      { emoji: '💱', label: 'Currency', mode: 'currency' },
    ],
  },
  {
    category: 'LIFESTYLE',
    items: [
      { emoji: '👔', label: 'Clothing', mode: 'clothing' },
      { emoji: '🏋️', label: 'Exercise Form', mode: 'exercise' },
      { emoji: '🧴', label: 'Skin Check', mode: 'skin' },
      { emoji: '🐾', label: 'Pet Safety', mode: 'pet_product' },
      { emoji: '🚗', label: 'Dashboard', mode: 'dashboard' },
      { emoji: '✈️', label: 'Travel Mode', mode: 'travel' },
    ],
  },
];

export default function ToolsScreen() {
  function openTool(mode: string) {
    router.push({ pathname: '/(tabs)/scan', params: { mode } });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.primary }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 4 }}>Tools</Text>
      <Text style={{ color: Colors.textMuted, marginBottom: 24 }}>25+ scanning modes powered by Claude AI</Text>

      {TOOLS.map((section) => (
        <View key={section.category} style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 12 }}>
            {section.category}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {section.items.map((tool) => (
              <TouchableOpacity
                key={tool.mode}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'center',
                  width: '47%',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
                onPress={() => openTool(tool.mode)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28, marginBottom: 6 }}>{tool.emoji}</Text>
                <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
