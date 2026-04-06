import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useLanguageStore } from '@/store/language';
import { t } from '@/constants/i18n';
import { scanImage } from '@/services/scan';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ScanMode {
  icon: IoniconName;
  label: string;
  mode: string;
  color: string;
}

const MODES: ScanMode[] = [
  { icon: 'scan-outline',   label: 'Auto',      mode: 'auto',         color: '#22C55E' },
  { icon: 'medical',        label: 'Medicine',   mode: 'medicine',     color: '#EC4899' },
  { icon: 'nutrition',      label: 'Food',       mode: 'food',         color: '#F97316' },
  { icon: 'leaf',           label: 'Plant',      mode: 'plant',        color: '#16A34A' },
  { icon: 'flask',          label: 'Chemical',   mode: 'chemical',     color: '#DC2626' },
  { icon: 'receipt',        label: 'Receipt',    mode: 'receipt',      color: '#7C3AED' },
  { icon: 'car-sport',      label: 'Parking',    mode: 'parking_sign', color: '#16A34A' },
  { icon: 'shirt',          label: 'Clothing',   mode: 'clothing',     color: '#0EA5E9' },
  { icon: 'newspaper',      label: 'Document',   mode: 'document',     color: '#1D4ED8' },
];

export default function ScanScreen() {
  const lang = useLanguageStore((s) => s.lang);
  const params = useLocalSearchParams<{ mode?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [scanning, setScanning] = useState(false);
  const [activeMode, setActiveMode] = useState(params.mode || 'auto');
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (params.mode) setActiveMode(params.mode);
  }, [params.mode]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <View style={styles.permIconBg}>
          <Ionicons name="camera-outline" size={44} color={Colors.accent} />
        </View>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>LensAssist needs camera access to scan and analyze objects.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentMode = MODES.find(m => m.mode === activeMode) || MODES[0];

  async function takePicture() {
    if (!cameraRef.current || scanning) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) throw new Error('No photo captured');
      const result: any = await scanImage({ imageUri: photo.uri, scanMode: activeMode });
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
      const result: any = await scanImage({ imageUri: picked.assets[0].uri, scanMode: activeMode });
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
        <View style={styles.overlay}>

          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.modePill}>
              <Ionicons name={currentMode.icon} size={14} color={Colors.cameraAccent} />
              <Text style={styles.modePillText}>{currentMode.label}</Text>
            </View>
            <TouchableOpacity
              style={styles.flipBtn}
              onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Viewfinder */}
          <View style={styles.viewfinderWrap}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              {scanning && (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator color={Colors.cameraAccent} size="large" />
                  <Text style={styles.analyzingText}>{t(lang, 'analyzing')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.hint}>
              {scanning
                ? 'Sending to Claude AI...'
                : `${t(lang, 'pointAndScan')} · ${currentMode.label}`
              }
            </Text>
          </View>

          {/* Mode selector */}
          <View style={styles.modeBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScroll}>
              {MODES.map(m => (
                <TouchableOpacity
                  key={m.mode}
                  style={[styles.modeChip, activeMode === m.mode && styles.modeChipActive]}
                  onPress={() => setActiveMode(m.mode)}
                >
                  <Ionicons
                    name={m.icon}
                    size={13}
                    color={activeMode === m.mode ? '#fff' : 'rgba(255,255,255,0.75)'}
                  />
                  <Text style={[styles.modeChipText, activeMode === m.mode && styles.modeChipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
              <View style={styles.sideBtnIcon}>
                <Ionicons name="images-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.sideBtnLabel}>{t(lang, 'gallery')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureBtn, scanning && styles.captureBtnScanning]}
              onPress={takePicture}
              disabled={scanning}
            >
              <View style={styles.captureRing}>
                {scanning
                  ? <ActivityIndicator color={Colors.primary} size="small" />
                  : <View style={styles.captureDot} />
                }
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideBtn} onPress={() => router.push('/(tabs)/tools')}>
              <View style={styles.sideBtnIcon}>
                <Ionicons name="construct-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.sideBtnLabel}>{t(lang, 'tools')}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </CameraView>
    </View>
  );
}

const C = 22;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },

  permContainer: {
    flex: 1, backgroundColor: Colors.primaryBg, alignItems: 'center',
    justifyContent: 'center', padding: 32, gap: 12,
  },
  permIconBg: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: Colors.accentBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.accentBorder, marginBottom: 8,
  },
  permTitle: { color: Colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  permSub: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  modePill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, gap: 6,
    borderWidth: 1, borderColor: Colors.cameraAccent + '60',
  },
  modePillText: { color: Colors.cameraAccent, fontWeight: '700', fontSize: 13 },
  flipBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },

  viewfinderWrap: { alignItems: 'center', gap: 16 },
  viewfinder: { width: 250, height: 250, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: C, height: C, borderColor: Colors.cameraAccent, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  analyzingText: { color: Colors.cameraAccent, fontWeight: '700', fontSize: 14 },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' },

  modeBar: { paddingBottom: 8 },
  modeScroll: { paddingHorizontal: 16, gap: 8 },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  modeChipActive: { backgroundColor: Colors.cameraAccent + 'CC', borderColor: Colors.cameraAccent },
  modeChipText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  modeChipTextActive: { color: '#fff', fontWeight: '700' },

  controls: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingBottom: 40, gap: 36,
  },
  sideBtn: { alignItems: 'center', gap: 6 },
  sideBtnIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  sideBtnLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500' },
  captureBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.cameraAccent, justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
  },
  captureBtnScanning: { opacity: 0.6 },
  captureRing: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  captureDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary },
});
