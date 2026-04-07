import * as ImageManipulator from 'expo-image-manipulator';
import { api } from './api';
import { offlineAnalyze, isNetworkError } from './offlineAnalyze';
import { useProfileStore } from '@/store/profile';

export async function compressAndEncode(uri: string): Promise<{ base64: string; mediaType: string }> {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return {
    base64: compressed.base64!,
    mediaType: 'image/jpeg',
  };
}

export async function scanImage(params: {
  imageUri: string;
  scanMode?: string;
  petId?: string;
  vehicleId?: string;
  bodyArea?: string;
  voiceHint?: string;
}) {
  try {
    const { base64, mediaType } = await compressAndEncode(params.imageUri);
    return await api.post('/scan', {
      image: base64,
      media_type: mediaType,
      scan_mode: params.scanMode || 'auto',
      pet_id: params.petId,
      vehicle_id: params.vehicleId,
      body_area: params.bodyArea,
      voice_hint: params.voiceHint,
    });
  } catch (e: any) {
    if (isNetworkError(e)) {
      // Offline fallback — use bundled allergen DB
      const profile = useProfileStore.getState().profile;
      const userAllergens = profile?.allergies || [];
      return await offlineAnalyze({
        imageUri: params.imageUri,
        scanMode: params.scanMode || 'auto',
        userAllergens,
        productHint: params.voiceHint,
      });
    }
    throw e;
  }
}

export async function askFollowup(scanId: string, question: string) {
  return api.post(`/scan/${scanId}/ask`, { question });
}

export async function getScanHistory(limit = 20, offset = 0) {
  return api.get(`/scan/history?limit=${limit}&offset=${offset}`);
}

export async function getScan(scanId: string) {
  return api.get(`/scan/${scanId}`);
}
