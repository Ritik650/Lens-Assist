import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
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
  const C = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 2, paddingTop: 4 }}>
      <View style={{
        width: 44, height: 32, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: focused ? C.accentBg : 'transparent',
      }}>
        <Ionicons
          name={focused ? name : outlineName}
          size={22}
          color={focused ? C.accent : C.textLight}
        />
      </View>
      <Text style={{ fontSize: 10, color: focused ? C.accent : C.textLight, fontWeight: focused ? '700' : '500' }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const lang = useLanguageStore((s) => s.lang);
  const C = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.border,
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
