import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { token, isLoading } = useAuthStore();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboardingDone').then((val) => {
      setOnboardingDone(!!val);
      setCheckingOnboarding(false);
    });
  }, []);

  if (isLoading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primaryBg }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return token ? <Redirect href="/(tabs)/scan" /> : <Redirect href="/(auth)/login" />;
}
