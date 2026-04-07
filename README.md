---
name: LensAssist Project
description: LensAssist - React Native (Expo SDK 54) + FastAPI hackathon app with Claude Vision API. Team InnovAIT.
type: project
---

LensAssist is a hackathon project (Team InnovAIT) with 26+ scanning use cases for physical-world objects.


## Stack
- Backend: FastAPI (Python 3.11+), SQLite (dev), SQLAlchemy, Pydantic v2
- AI: Claude API via `anthropic` Python SDK, model `claude-sonnet-4-5`
- Mobile: React Native (Expo SDK 54), Expo Router v6, Zustand, `@expo/vector-icons` (Ionicons)
- Auth: JWT tokens, python-jose, bcrypt

## Structure
- `backend/app/routers/scan.py` — main scan endpoints including SSE streaming summary
- `backend/app/services/ai_engine.py` — Claude vision, streaming, family analysis, scan memory
- `mobile/app/(tabs)/` — dashboard, scan, tools, history, profile
- `mobile/app/scan/result.tsx` — streaming AI summary, family tabs, SOS button, voice TTS
- `mobile/app/onboarding.tsx` — 3-slide first-time onboarding
- `mobile/store/theme.ts` — dark/light/system theme store
- `mobile/store/language.ts` — 9-language i18n store
- `mobile/constants/themes.ts` — LightColors / DarkColors
- `mobile/hooks/useColors.ts` — theme-aware color hook
- `mobile/services/stream.ts` — SSE streaming + family scan API

## Color Palette (White/Green Professional)
- Primary BG: #F0FDF4 (light green tint)
- Accent: #16A34A (forest green)
- Surface: #FFFFFF
- Text: #0F172A
- Camera stays dark: #0A1628 bg, #00C9A7 accent

## Key Features Implemented
- 26 scan modes with Ionicons (no emojis)
- Scan Memory Graph: last 15 scans injected into Claude prompt for cross-reference
- Streaming SSE endpoint: `/scan/{id}/stream-summary` streams Claude narrative
- Family Members: add family profiles, multi-member safety analysis
- Emergency SOS: one-tap SMS on anaphylactic/critical alerts
- Dark mode: system/light/dark toggle in profile, theme-aware colors via `useColors()` hook
- Voice auto-read: expo-speech auto-reads AI summary after streaming
- Animated camera: Animated.Value pulsing corner brackets during scan
- 9 Indian languages: en, hi, mr, bn, ta, te, gu, kn, pa
- Onboarding: 3-slide first-time flow, gated by AsyncStorage flag
- Family tabs on result screen: per-member safe/caution/danger assessment

## HOW TO RUN THIS:- 

