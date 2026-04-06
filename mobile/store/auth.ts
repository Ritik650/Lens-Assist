import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  isLoading: boolean;
  setAuth: (token: string, userId: string, email: string) => Promise<void>;
  loadAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  isLoading: true,

  setAuth: async (token, userId, email) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('userId', userId);
    await SecureStore.setItemAsync('email', email);
    set({ token, userId, email });
  },

  loadAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userId = await SecureStore.getItemAsync('userId');
      const email = await SecureStore.getItemAsync('email');
      set({ token, userId, email, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('email');
    set({ token: null, userId: null, email: null });
  },
}));
