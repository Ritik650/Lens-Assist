import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LangCode } from '@/constants/i18n';

interface LanguageState {
  lang: LangCode;
  setLang: (l: LangCode) => Promise<void>;
  loadLang: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: 'en',

  setLang: async (lang) => {
    await AsyncStorage.setItem('lang', lang);
    set({ lang });
  },

  loadLang: async () => {
    const saved = await AsyncStorage.getItem('lang');
    if (saved) set({ lang: saved as LangCode });
  },
}));
