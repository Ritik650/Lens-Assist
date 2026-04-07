import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  isDark: false,

  setMode: async (mode) => {
    await AsyncStorage.setItem('themeMode', mode);
    set({ mode, isDark: resolveIsDark(mode) });
  },

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('themeMode');
    const mode = (saved as ThemeMode) || 'light';
    set({ mode, isDark: resolveIsDark(mode) });
  },
}));

// Subscribe to system appearance changes
Appearance.addChangeListener(() => {
  const state = useThemeStore.getState();
  if (state.mode === 'system') {
    useThemeStore.setState({ isDark: Appearance.getColorScheme() === 'dark' });
  }
});
