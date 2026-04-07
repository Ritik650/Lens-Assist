import { useThemeStore } from '@/store/theme';
import { LightColors, DarkColors, AppColors } from '@/constants/themes';

export function useColors(): AppColors {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? DarkColors : LightColors;
}
