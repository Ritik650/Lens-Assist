import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { api } from './api';

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
}) {
  const { base64, mediaType } = await compressAndEncode(params.imageUri);
  return api.post('/scan', {
    image: base64,
    media_type: mediaType,
    scan_mode: params.scanMode || 'auto',
    pet_id: params.petId,
    vehicle_id: params.vehicleId,
    body_area: params.bodyArea,
  });
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
