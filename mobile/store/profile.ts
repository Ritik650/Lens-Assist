import { create } from 'zustand';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  preferred_lang: string;
  allergies: string[];
  allergy_severities: Record<string, string>;
  conditions: string[];
  medications: string[];
  diet_type: string;
  nutritional_goals: string[];
  visual_impairment: string;
  skin_type: string;
  skin_sensitivities: string[];
  skin_concerns: string[];
  vehicle_info: Record<string, any> | null;
  emergency_contact: string | null;
  blood_group: string | null;
}

interface ProfileState {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));
