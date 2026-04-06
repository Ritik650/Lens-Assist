import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useLanguageStore } from '@/store/language';
import { t } from '@/constants/i18n';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconName;
  outlineName: IoniconName;
  label: string;
  focused: boolean;
}

function TabIcon({ name, outlineName, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons
          name={focused ? name : outlineName}
          size={22}
          color={focused ? Colors.accent : Colors.textLight}
        />
      </View>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const lang = useLanguageStore((s) => s.lang);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" outlineName="home-outline" label={t(lang, 'home')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="scan" outlineName="scan-outline" label={t(lang, 'scan')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="construct" outlineName="construct-outline" label={t(lang, 'tools')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="time" outlineName="time-outline" label={t(lang, 'history')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" outlineName="person-outline" label={t(lang, 'me')} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 4,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: { alignItems: 'center', gap: 2, paddingTop: 4 },
  iconWrap: {
    width: 44, height: 32, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  iconWrapActive: { backgroundColor: Colors.accentBg },
  label: { fontSize: 10, color: Colors.textLight, fontWeight: '500' },
  labelActive: { color: Colors.accent, fontWeight: '700' },
});
