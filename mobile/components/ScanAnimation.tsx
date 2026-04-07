/**
 * ScanAnimation — animated scanning visual used in onboarding.
 * Built with React Native Animated + SVG for smooth GPU animations.
 * Falls back gracefully — no external animation files required.
 */
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Rect, Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  size?: number;
  color?: string;
  bgColor?: string;
  style?: any;
}

const AnimatedG = Animated.createAnimatedComponent(G);

export default function ScanAnimation({ size = 200, color = '#16A34A', bgColor = '#DCFCE7', style }: Props) {
  const scanLine = useRef(new Animated.Value(0)).current;
  const outerRing = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const cornerOpacity = useRef(new Animated.Value(0.4)).current;
  const dotScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scan line sweeps top → bottom repeatedly
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(scanLine, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();

    // Outer ring rotates
    Animated.loop(
      Animated.timing(outerRing, { toValue: 1, duration: 4000, useNativeDriver: false })
    ).start();

    // Inner circle pulses
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Corner brackets blink
    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(cornerOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Success dots pop in
    Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.spring(dotScale, { toValue: 1, useNativeDriver: true, tension: 120 }),
        Animated.delay(800),
        Animated.timing(dotScale, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(400),
      ])
    ).start();
  }, []);

  const half = size / 2;
  const innerSize = size * 0.58;
  const innerHalf = innerSize / 2;
  const cornerLen = size * 0.12;
  const strokeW = size * 0.018;

  // Scan line Y position
  const scanY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [half - innerHalf + 4, half + innerHalf - 4],
  });

  // Scan line opacity (fades at end of sweep)
  const scanOpacity = scanLine.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ scale: pulse }] }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer dashed ring */}
        <Circle
          cx={half}
          cy={half}
          r={half * 0.9}
          stroke={color}
          strokeWidth={strokeW * 0.7}
          strokeDasharray={`${size * 0.08} ${size * 0.05}`}
          fill="none"
          opacity={0.35}
        />

        {/* Background circle */}
        <Circle cx={half} cy={half} r={innerHalf * 1.1} fill={bgColor} />

        {/* Corner brackets */}
        {/* TL */}
        <Line x1={half - innerHalf} y1={half - innerHalf + cornerLen} x2={half - innerHalf} y2={half - innerHalf} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        <Line x1={half - innerHalf} y1={half - innerHalf} x2={half - innerHalf + cornerLen} y2={half - innerHalf} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        {/* TR */}
        <Line x1={half + innerHalf - cornerLen} y1={half - innerHalf} x2={half + innerHalf} y2={half - innerHalf} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        <Line x1={half + innerHalf} y1={half - innerHalf} x2={half + innerHalf} y2={half - innerHalf + cornerLen} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        {/* BL */}
        <Line x1={half - innerHalf} y1={half + innerHalf - cornerLen} x2={half - innerHalf} y2={half + innerHalf} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        <Line x1={half - innerHalf} y1={half + innerHalf} x2={half - innerHalf + cornerLen} y2={half + innerHalf} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        {/* BR */}
        <Line x1={half + innerHalf - cornerLen} y1={half + innerHalf} x2={half + innerHalf} y2={half + innerHalf} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        <Line x1={half + innerHalf} y1={half + innerHalf - cornerLen} x2={half + innerHalf} y2={half + innerHalf} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      </Svg>

      {/* Animated scan line (uses Animated.View since SVG animating is tricky) */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            left: half - innerHalf + strokeW,
            right: size - (half + innerHalf) + strokeW,
            top: scanY,
            opacity: scanOpacity,
            backgroundColor: color,
            height: strokeW * 0.8,
            shadowColor: color,
            shadowOpacity: 0.8,
            shadowRadius: 4,
          },
        ]}
      />

      {/* Center eye icon */}
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        <Ionicons name="eye" size={size * 0.22} color={color} />
      </View>

      {/* Success dot that pops in */}
      <Animated.View
        style={[
          styles.successDot,
          {
            right: size * 0.1,
            bottom: size * 0.1,
            transform: [{ scale: dotScale }],
            backgroundColor: color,
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size * 0.08,
          },
        ]}
      >
        <Ionicons name="checkmark" size={size * 0.1} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  scanLine: { position: 'absolute', borderRadius: 2 },
  successDot: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
