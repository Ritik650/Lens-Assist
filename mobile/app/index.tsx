import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return token ? <Redirect href="/(tabs)/scan" /> : <Redirect href="/(auth)/login" />;
}
