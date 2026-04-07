import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import ScanAnimation from '@/components/ScanAnimation';

const { width } = Dimensions.get('window');

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Slide {
  animation?: 'scan' | 'shield' | 'memory';
  icon?: IoniconName;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  bullets: { icon: IoniconName; text: string; color: string }[];
}

const SLIDES: Slide[] = [
  {
    animation: 'scan',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
    title: 'AI Vision for the\nPhysical World',
    subtitle: 'Point your camera at anything and get instant AI-powered analysis. Works with 26+ object types.',
    bullets: [
      { icon: 'medical', text: 'Medicine & drug interaction checks', color: '#EC4899' },
      { icon: 'nutrition', text: 'Food allergens & nutrition facts', color: '#F97316' },
      { icon: 'car-sport', text: 'Parking signs decoded instantly', color: '#16A34A' },
    ],
  },
  {
    animation: 'shield',
    iconColor: '#EC4899',
    iconBg: '#FCE7F3',
    title: 'Personalized Safety\nFor Your Family',
    subtitle: 'Set up health profiles for every family member. One scan — results tailored for each person.',
    bullets: [
      { icon: 'warning', text: 'Anaphylactic allergen alerts + vibration', color: '#DC2626' },
      { icon: 'people', text: 'Multi-profile family scan tabs', color: '#6366F1' },
      { icon: 'call', text: 'One-tap Emergency SOS on critical alerts', color: '#DC2626' },
    ],
  },
  {
    animation: 'memory',
    iconColor: '#6366F1',
    iconBg: '#EDE9FE',
    title: 'Smart Memory &\nVoice Mode',
    subtitle: 'Say anything to auto-scan. Every scan is remembered and cross-referenced for hidden interactions.',
    bullets: [
      { icon: 'mic', text: 'Hands-free voice scan — just speak', color: '#16A34A' },
      { icon: 'git-network', text: 'Scan memory graph — catches cross-item risks', color: '#6366F1' },
      { icon: 'wifi-outline', text: 'Offline mode with bundled allergen database', color: '#F97316' },
    ],
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  function goTo(index: number) {
    const direction = index > current ? 1 : -1;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: direction * 20, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
    setCurrent(index);
  }

  async function finish() {
    await AsyncStorage.setItem('onboardingDone', '1');
    router.replace('/(auth)/login');
  }

  const slide = SLIDES[current];

  return (
    <View style={styles.container}>
      {/* Skip */}
      {current < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={finish}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        {/* Animation / Icon */}
        <View style={styles.animationWrap}>
          {slide.animation === 'scan' ? (
            <ScanAnimation size={170} color={slide.iconColor} bgColor={slide.iconBg} />
          ) : slide.animation === 'shield' ? (
            <ShieldAnimation color={slide.iconColor} bg={slide.iconBg} />
          ) : (
            <MemoryAnimation color={slide.iconColor} bg={slide.iconBg} />
          )}
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
              <Animated.View style={[styles.dot, i === current && styles.dotActive, i === current && { backgroundColor: slide.iconColor }]} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>

        {/* Feature bullets */}
        <View style={styles.bullets}>
          {slide.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bulletIcon, { backgroundColor: b.color + '15' }]}>
                <Ionicons name={b.icon} size={18} color={b.color} />
              </View>
              <Text style={styles.bulletText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navRow}>
        {current > 0 ? (
          <TouchableOpacity style={styles.backNavBtn} onPress={() => goTo(current - 1)}>
            <Ionicons name="arrow-back" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : <View style={{ width: 48 }} />}

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slide.iconColor }]}
          onPress={current < SLIDES.length - 1 ? () => goTo(current + 1) : finish}
          activeOpacity={0.85}
        >
          <View style={styles.nextBtnInner}>
            <Text style={styles.nextBtnText}>
              {current < SLIDES.length - 1 ? 'Next' : 'Get Started'}
            </Text>
            <Ionicons
              name={current < SLIDES.length - 1 ? 'arrow-forward' : 'checkmark'}
              size={18}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Shield animation for slide 2
function ShieldAnimation({ color, bg }: { color: string; bg: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useState(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 100 }),
        Animated.delay(1000),
        Animated.timing(checkScale, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(200),
      ])
    ).start();
  });

  return (
    <Animated.View style={[styles.animBase, { backgroundColor: bg, transform: [{ scale: pulse }] }]}>
      <Ionicons name="shield-checkmark" size={80} color={color} />
      <Animated.View style={[styles.animBadge, { backgroundColor: '#16A34A', transform: [{ scale: checkScale }] }]}>
        <Ionicons name="people" size={16} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

// Memory/network animation for slide 3
function MemoryAnimation({ color, bg }: { color: string; bg: string }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;

  useState(() => {
    Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 6000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(micScale, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(micScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  });

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.animBase, { backgroundColor: bg }]}>
      <Animated.View style={{ transform: [{ rotate: spin }], position: 'absolute', opacity: 0.3 }}>
        <Ionicons name="git-network" size={140} color={color} />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: micScale }] }}>
        <Ionicons name="mic" size={72} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  skipBtn: { alignSelf: 'flex-end' },
  skipText: { color: Colors.textMuted, fontSize: 15, fontWeight: '500' },

  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 },

  animationWrap: { marginBottom: 8, alignItems: 'center' },
  animBase: {
    width: 170, height: 170, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  animBadge: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },

  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { width: 24 },

  title: {
    fontSize: 30, fontWeight: '800', color: Colors.text,
    textAlign: 'center', lineHeight: 38, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: Colors.textMuted, textAlign: 'center',
    lineHeight: 21, paddingHorizontal: 4,
  },

  bullets: { gap: 10, width: '100%' },
  bulletRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  bulletIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  bulletText: { color: Colors.text, fontSize: 13, fontWeight: '500', flex: 1 },

  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backNavBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  nextBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
