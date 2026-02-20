# 🎵 MISRAD AI — Audio Assets

Place audio files here for use in Remotion videos.

## Directory Structure

```
audio/
├── music/
│   ├── promo-bg.mp3          — Background music for promo/marketing videos (60s loop)
│   ├── tutorial-bg.mp3        — Background music for tutorial videos (calm, 5min loop)
│   └── bonus-bg.mp3           — Background music for bonus videos (energetic, 60s)
├── sfx/
│   ├── whoosh.mp3             — Scene transition whoosh
│   ├── pop.mp3                — UI element pop-in
│   ├── success.mp3            — Success/achievement chime
│   ├── click.mp3              — Button click
│   ├── notification.mp3       — Notification ding
│   ├── typing.mp3             — Keyboard typing sound
│   └── swoosh-up.mp3          — Upward swoosh for stats
└── voiceover/
    ├── modules/               — Module video narration (Hebrew TTS)
    ├── packages/              — Package video narration
    ├── ui-demos/              — UI demo narration
    ├── bonus/                 — Bonus video narration
    └── tutorials/             — Tutorial narration per module
```

## How to Generate Voiceover

Use Hebrew TTS services (e.g., Google Cloud TTS, ElevenLabs, Azure Speech):
- Voice: Male, professional, warm
- Language: he-IL
- Speed: 1.0x for tutorials, 1.1x for promos
- Format: MP3 320kbps

Scripts for each voiceover are in `remotion-v2/audio/scripts/`.

## Recommended Royalty-Free Music

- **Promo**: Upbeat electronic, 120-130 BPM, builds tension
- **Tutorial**: Lo-fi / ambient, 80-90 BPM, non-distracting
- **Bonus**: Cinematic, emotional, builds to climax
