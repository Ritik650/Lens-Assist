import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { scanImage } from '@/services/scan';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera access needed</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (!cameraRef.current || scanning) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) throw new Error('No photo captured');
      const result: any = await scanImage({ imageUri: photo.uri });
      router.push({ pathname: '/scan/result', params: { scanId: result.id } });
    } catch (e: any) {
      Alert.alert('Scan failed', e.message);
    } finally {
      setScanning(false);
    }
  }

  async function pickFromGallery() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (picked.canceled) return;
    setScanning(true);
    try {
      const result: any = await scanImage({ imageUri: picked.assets[0].uri });
      router.push({ pathname: '/scan/result', params: { scanId: result.id } });
    } catch (e: any) {
      Alert.alert('Scan failed', e.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Viewfinder corners */}
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.logo}>LensAssist</Text>
            <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
              <Text style={styles.flip}>🔄</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.hint}>Point at any object to analyze</Text>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
              <Text style={styles.galleryIcon}>🖼️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureBtn, scanning && styles.captureBtnDisabled]}
              onPress={takePicture}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <View style={styles.captureDot} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryBtn} onPress={() => router.push('/(tabs)/tools')}>
              <Text style={styles.galleryIcon}>🔧</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const CORNER_SIZE = 24;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  logo: { fontSize: 20, fontWeight: '800', color: Colors.accent },
  flip: { fontSize: 24 },
  viewfinder: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.accent,
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 48, gap: 40 },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIcon: { fontSize: 22 },
  permText: { color: Colors.text, marginBottom: 20, fontSize: 16 },
  btn: { backgroundColor: Colors.accent, padding: 14, borderRadius: 10 },
  btnText: { color: Colors.primary, fontWeight: '700' },
});
