/**
 * VoiceMode — hands-free scanning component.
 * Uses expo-speech-recognition to listen for any speech,
 * then auto-triggers a camera capture.
 */
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

// Static import — expo-speech-recognition is installed; graceful if module missing at runtime
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Package not available — VoiceMode will show error state
}

type VoiceModeProps = {
  onVoiceTrigger: (transcript: string) => void;
  onClose: () => void;
};

export default function VoiceMode({ onVoiceTrigger, onClose }: VoiceModeProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'captured' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState(() =>
    ExpoSpeechRecognitionModule ? '' : 'Speech recognition not available on this device.'
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.3)).current;
  const wave3 = useRef(new Animated.Value(0.3)).current;

  // Initialise error state synchronously (no useEffect needed)
  useEffect(() => {
    if (!ExpoSpeechRecognitionModule) setStatus('error');
  }, []);

  useEffect(() => {
    if (listening) {
      // Mic pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      // Sound wave bars
      const waveLoop = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          ])
        ).start();
      waveLoop(wave1, 0);
      waveLoop(wave2, 150);
      waveLoop(wave3, 300);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      [wave1, wave2, wave3].forEach(w => { w.stopAnimation(); w.setValue(0.3); });
    }
  }, [listening]);

  async function startListening() {
    if (!ExpoSpeechRecognitionModule) return;
    setTranscript('');
    setStatus('listening');
    setListening(true);

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setStatus('error');
        setErrorMsg('Microphone permission denied');
        setListening(false);
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-IN',
        continuous: false,
        interimResults: true,
      });
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || 'Speech recognition failed');
      setListening(false);
    }
  }

  // Hooks must be called at top level — useSpeechRecognitionEvent handles subscription lifecycle
  useSpeechRecognitionEvent?.('result', (event: any) => {
    const text = event.results?.[0]?.transcript || '';
    setTranscript(text);
    if (!event.isFinal) return;
    setStatus('captured');
    setListening(false);
    setTimeout(() => onVoiceTrigger(text), 800);
  });

  useSpeechRecognitionEvent?.('error', (event: any) => {
    setStatus('error');
    setErrorMsg(event.error || 'Recognition error');
    setListening(false);
  });

  useSpeechRecognitionEvent?.('end', () => {
    setListening(prev => {
      if (prev) setStatus('idle');
      return false;
    });
  });

  const statusLabel = {
    idle: 'Tap mic to start voice scan',
    listening: transcript ? `"${transcript}"` : 'Listening... say anything',
    captured: `Scanning: "${transcript}"`,
    error: errorMsg || 'Error — try again',
  }[status];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.title}>Voice Scan</Text>
        <Text style={styles.hint}>Say anything — describe what you're holding</Text>

        {/* Waveform bars (visible while listening) */}
        {listening && (
          <View style={styles.waveform}>
            {[wave1, wave2, wave1, wave3, wave2, wave1, wave3].map((w, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  { transform: [{ scaleY: w }], backgroundColor: Colors.accent },
                ]}
              />
            ))}
          </View>
        )}

        {/* Mic button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.micBtn,
              listening && styles.micBtnActive,
              status === 'captured' && styles.micBtnSuccess,
              status === 'error' && styles.micBtnError,
            ]}
            onPress={listening ? undefined : startListening}
            activeOpacity={0.85}
          >
            <Ionicons
              name={
                status === 'captured' ? 'camera' :
                status === 'error' ? 'warning-outline' :
                listening ? 'mic' : 'mic-outline'
              }
              size={40}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Status text */}
        <Text style={[
          styles.statusText,
          status === 'captured' && { color: Colors.accent },
          status === 'error' && { color: Colors.danger },
        ]}>
          {statusLabel}
        </Text>

        {/* Example prompts */}
        {status === 'idle' && (
          <View style={styles.examples}>
            <Text style={styles.examplesTitle}>Try saying:</Text>
            {[
              '"Scan this medicine"',
              '"What\'s in this food?"',
              '"Is this plant safe?"',
              '"Read this label"',
            ].map((ex, i) => (
              <TouchableOpacity
                key={i}
                style={styles.exampleChip}
                onPress={() => { setTranscript(ex.replace(/"/g, '')); startListening(); }}
              >
                <Ionicons name="mic-outline" size={12} color={Colors.accent} />
                <Text style={styles.exampleText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48,
    alignItems: 'center', gap: 16,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface2, justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  hint: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  waveform: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 48 },
  waveBar: { width: 4, height: 32, borderRadius: 2 },

  micBtn: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  micBtnActive: { backgroundColor: Colors.accentLight },
  micBtnSuccess: { backgroundColor: '#22C55E' },
  micBtnError: { backgroundColor: Colors.danger },

  statusText: {
    fontSize: 14, color: Colors.textMuted, textAlign: 'center',
    fontWeight: '500', paddingHorizontal: 16, minHeight: 20,
  },

  examples: { width: '100%', gap: 8 },
  examplesTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2 },
  exampleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accentBg, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  exampleText: { color: Colors.text, fontSize: 13, fontStyle: 'italic' },
});
