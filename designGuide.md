# Design Guide

**Project:** Responsive body jewelry: physiological sensing + tactile feedback that helps women feel grounded, confident, and connected while moving through the city at night.

**Covers:** motion graphics · video · website · deck · application

---

## 1. Concept: "Quiet Signal"

The city at night is loud, dark, and full of information. The jewelry is the opposite: a private, calm signal worn against the skin. It reads the body and answers with touch.

The visual system follows the same idea. **Dark, cinematic surroundings with one precise, glowing signal in them.** Most of every frame is night. One element carries meaning: a pulse, a ring, a line of type, a point of light.

### Brand attributes

| We are | We are not |
|---|---|
| Calm, steady, grounded | Alarmist, "safety-gadget", panic-button |
| Intimate, personal, worn | Clinical, medical, surveillance |
| Precise, engineered | Cold, sterile, tech-bro |
| Nocturnal, cinematic | Neon cyberpunk, gamer |
| Confident, quiet luxury | Cute, pastel, "for her" clichés |

---

## 2. Reference Analysis (`references/graphicSamples/`)

| Reference | What we take |
|---|---|
| **Adoratorio Studio** (14.42.39) | Full-bleed near-black field. A huge grotesk wordmark anchored to the bottom edge, bleeding off the sides. A thin **meta-bar** of small text (location · live clock · contact) across the top. Texture built from repeated letterforms (ASCII/typographic pattern) as a quiet background layer. One tiny orange dot as the only accent. Hairline rules separating index rows (`01 · Title · Tags · (Year)`). |
| **Muromuro Studio** (15.08.42) | Light counterpoint: white field, **all-caps grotesk** set heavy for the title and light for body copy. Inline bold lead-in (`MUROMURO STUDIO is a…`). A hard **50/50 split** between a column of text and a raw, textured urban photo (concrete, cables, fabric sign). |
| **Radio Garden** (15.11.35) | **Locator ring**: a thin green circle with a center dot over satellite imagery means "you are here / connected." Dark, rounded floating UI panels at the bottom. Green used only for active state. The map is the interface. |
| **Gentle Monster** (15.13.38) | **Cinematic hero video**: low-key lighting, shallow depth of field, one warm practical light source (fire) in a dark scene. Centered serif wordmark, ghost/outline **pill button**, segmented **progress bar** for the carousel. Fashion-campaign tone. |
| **Nothing** (15.16.40) | Pure black with a **dot grid**. **Dot-matrix mono** for labels (`HEADPHONE (1) PRO`) paired with an **editorial serif** headline. Product floats centered and lit from above. One small **red square** as the signature accent. Floating, rounded, translucent nav bar. |
| **Trozk** (15.23.40) | Warm, raking **golden-hour light** on objects. Hard shadows, translucent shells, small glowing displays. Objects laid out on a surface as a still life (an isometric "flat lay"). Proof that warmth and tech can coexist. |
| **Teenage Engineering** (15.40.47) | **Black-and-white night city photography** with glowing type as the only light. Thin **line icons** paired with each nav item. Lowercase light grotesk. Tiny multilingual micro-text blocks used as texture. |

**Combined:** night-dark fields, B&W urban photography, warm practical light, one functional accent color, oversized grotesk + editorial serif + technical mono, thin rules, dot grids, locator rings, floating rounded UI.

---

## 3. Color Palette (6)

Built for night use. Dark is the default. Light is the exception and is used for print, deck "breathers", and editorial pages.

| # | Name | HEX | RGB | Role |
|---|---|---|---|---|
| 1 | **Nocturne** | `#0D0D0E` | 13, 13, 14 | Primary background. The night. |
| 2 | **Asphalt** | `#26272A` | 38, 39, 42 | Surfaces, cards, panels, rules on dark |
| 3 | **Concrete** | `#8C8B87` | 140, 139, 135 | Secondary text, meta info, disabled, grid dots |
| 4 | **Bone** | `#EEEBE5` | 238, 235, 229 | Primary text on dark; light-mode background |
| 5 | **Pulse** | `#FF6A3D` | 255, 106, 61 | **Body signal**: heartbeat, sensing, haptic moment, live state |
| 6 | **Ground** | `#5FE3A4` | 95, 227, 164 | **Connected / grounded / calm**: paired, settled, safe arrival |

### Usage ratio

```
Nocturne ████████████████████████████████████  60%
Asphalt  ████████████                           20%
Bone     ████████                               12%
Concrete ████                                    5%
Pulse    █                                       2%
Ground   █                                       1%
```

### Rules

- **Accents are signals, not decoration.** Pulse and Ground appear only when they *mean* something: a live reading, a haptic event, a connection, a CTA. Never use them as section backgrounds.
- **Never place Pulse and Ground next to each other at the same size.** They describe two states (activation → calm). Show them as a transition, not a pair.
- Pulse is **ember orange, not alarm red.** It reads as warmth and life, not danger. The product should never look like an emergency device.
- Light mode = Bone background, Nocturne text, Concrete meta. Accents keep their hex values but shrink to small marks (dots, rings, underlines).
- Glow is allowed **only** on Pulse and Ground (soft bloom, `0 0 24px` at 40% opacity). Nothing else glows.

### Contrast (on Nocturne)

| Color | Ratio | Passes |
|---|---|---|
| Bone | ~16:1 | AAA all text |
| Ground | ~12:1 | AAA all text |
| Pulse | ~6.8:1 | AAA large, AA body |
| Concrete | ~5.7:1 | AA body (meta/secondary only) |

### Tokens

```css
:root {
  --c-nocturne: #0D0D0E;
  --c-asphalt:  #26272A;
  --c-concrete: #8C8B87;
  --c-bone:     #EEEBE5;
  --c-pulse:    #FF6A3D;
  --c-ground:   #5FE3A4;

  --bg:        var(--c-nocturne);
  --surface:   var(--c-asphalt);
  --text:      var(--c-bone);
  --text-meta: var(--c-concrete);
  --signal:    var(--c-pulse);
  --calm:      var(--c-ground);
  --rule:      rgba(238, 235, 229, 0.18);
  --glow-pulse:  0 0 24px rgba(255, 106, 61, 0.4);
  --glow-ground: 0 0 24px rgba(95, 227, 164, 0.4);
}
```

---

## 4. Typography

Three families, each with a fixed job, plus one optional accent face. This pairing draws on Adoratorio (grotesk), Nothing (serif + dot-matrix), and Muromuro (all-caps).

| Role | Typeface (free / Google) | Premium alternative | Used for |
|---|---|---|---|
| **Display + UI** | **Inter Tight** (300–700) | Neue Haas Grotesk Display, PP Neue Montreal | Wordmark-scale headlines, nav, UI, body |
| **Editorial voice** | **Instrument Serif** (400, italic) | GT Super, Tiempos Headline | Emotional statements, pull quotes, manifesto lines |
| **Data / technical** | **JetBrains Mono** (300–500) | Berkeley Mono, ABC Diatype Mono | Biometric readouts, labels, timestamps, coordinates, index numbers |
| *Accent (sparingly)* | *Doto* (dot-matrix) | *Nothing NType 82 style* | *Product naming tags, motion overlays, device-screen mockups* |

### Pairing logic

- **Grotesk = the city.** Structure, scale, architecture.
- **Serif = the woman.** Interior voice, feeling, confidence.
- **Mono = the body signal.** What the jewelry senses, made visible.

### Type scale (fluid, 1.333 ratio)

| Token | Size (desktop → mobile) | Face | Weight / Tracking | Notes |
|---|---|---|---|---|
| `display-xl` | `clamp(4rem, 14vw, 14rem)` | Inter Tight | 500 / -0.04em | Bottom-anchored, may bleed off edges |
| `display` | `clamp(3rem, 7vw, 6rem)` | Inter Tight | 500 / -0.03em | Section openers |
| `statement` | `clamp(2rem, 4vw, 3.5rem)` | Instrument Serif | 400 / -0.01em | Centered or left, max ~22 characters/line |
| `h2` | `2rem → 1.5rem` | Inter Tight | 500 / -0.02em | |
| `h3-caps` | `1.25rem → 1rem` | Inter Tight | 600 / +0.02em, UPPERCASE | Muromuro-style headers |
| `body` | `1.0625rem → 1rem` | Inter Tight | 400 / 0, line-height 1.5 | Max 64ch |
| `meta` | `0.8125rem` | Inter Tight | 400 / 0 | Top meta-bar, captions |
| `label` | `0.75rem` | JetBrains Mono | 400 / +0.08em, UPPERCASE | `HR 72 BPM · 23:41 · 34.05°N` |
| `data-xl` | `clamp(3rem, 8vw, 7rem)` | JetBrains Mono | 300 / -0.02em | Big live biometric number |

### Typographic devices

- **Parenthetical indexes** (Adoratorio / Nothing): `( 2026 )`, `(01)`, `RING (1)`
- **Inline bold lead-in** (Muromuro): start paragraphs with the product name in 600 weight.
- **Asterisk / mid-dot separators:** `Sensing * Haptics * Night`, `23:41 · 72 BPM · Calm`
- **Live data in copy:** a running clock or pulse value in the meta-bar (Adoratorio's `14:42:39`).
- **Typographic texture:** repeated words (`GROUND GROUND GROUND`, `PULSE`) set in mono at 10–20% opacity and arranged along paths, like Adoratorio's ASCII pattern. Use it as a background layer only.

---

## 5. Compositional Strategies

### 5.1 Grid

| Context | Columns | Gutter | Margin |
|---|---|---|---|
| Desktop ≥1280 | 12 | 24px | 24–40px (stay tight to the edge, like Adoratorio) |
| Tablet 768–1279 | 8 | 20px | 24px |
| Mobile <768 | 4 | 16px | 16px |
| Deck 16:9 (1920×1080) | 12 | 24px | 64px safe area |
| Video / motion | 12 + rule of thirds | — | 5% action-safe, 10% title-safe |

Base spacing unit: **8px**. Scale: 4 · 8 · 16 · 24 · 40 · 64 · 104 · 168.

### 5.2 Seven compositional archetypes

Each comes from a reference. Every layout in every medium should use one of these.

1. **The Anchor** (Adoratorio)
   Giant grotesk wordmark or statement locked to the **bottom edge**, full width, possibly cropped. Atmosphere or texture above. A meta-bar of small text across the top. Use for heroes, title cards, deck covers, and video end cards.

2. **The Signal in the Dark** (Nothing / Gentle Monster)
   Near-black field, a single object or light **dead center**, a mono label above, a serif statement over or below, one small CTA. Optional dot grid behind. Use for product reveals, key moments, and app onboarding.

3. **The Split** (Muromuro)
   Hard **50/50 vertical division**: text column against a full-bleed photograph with no padding on the image side. Use for narrative and editorial pages, deck content slides, and "about".

4. **The Locator** (Radio Garden)
   A map, aerial, or city image as the full field. A **thin ring + center dot** marks the wearer. UI floats in rounded panels in the lower third. Use for app home, route/journey views, and "connected" storytelling in motion.

5. **The Night Street** (Teenage Engineering)
   Full-bleed **black-and-white** night city photo. The only color or light is glowing type or one accent element in the scene. Line-icon navigation along the top. Use for campaign imagery, website section breaks, and deck chapter dividers.

6. **The Still Life** (Trozk)
   Product + everyday night objects (keys, phone, transit card, lipstick, earbuds) arranged on a surface in **warm raking light** from a high 3/4 angle. Use for product detail, packaging, and "what's in her bag" storytelling.

7. **The Index** (Adoratorio work list)
   Stacked rows split by **hairline rules**: `(01) · Title · Tag * Tag * Tag · ( Year ) · ●`. Use for features, specs, research findings, and the deck agenda.

### 5.3 Composition rules

- **One focal signal per frame.** If two things glow, remove one.
- **Center for intimacy, edges for the city.** Body/product moments sit centered and symmetric. City and context moments use asymmetric, edge-anchored layouts.
- **Let the dark do the work.** Aim for 50–70% negative space on hero frames.
- **Thin over thick.** Use 1px hairline rules (`--rule`), 1–1.5px ring strokes, and 1.5px line icons. No heavy borders and no drop shadows except glow.
- **Rounded UI, sharp layout.** Floating panels and buttons use radius 12–20px (pills: full). Page structure, images, and grids stay square-edged.
- **Texture layers stay quiet.** Dot grids (Concrete at 25%, 24–40px pitch) and typographic patterns sit below 20% opacity.
- **Meta-bar everywhere.** Web, deck, and video share a consistent top strip: `[Brand] · [City] · [Live time] · [State ●]`.

---

## 6. Imagery & Photography

- **Night, real city, real women.** Shoot at blue hour and after dark: transit platforms, crosswalks, stairwells, cabs, building entrances, streetlight pools.
- **Two modes:**
  - **B&W documentary** (TE / Muromuro): high contrast, grain, texture (concrete, brick, cables). Use for context and environment.
  - **Warm cinematic color** (Gentle Monster / Trozk): low key, shallow depth of field, one warm practical light (streetlamp, phone glow, the jewelry's own light). Use for the wearer and product.
- **The jewelry is the light source.** Wherever possible, the piece emits or catches the only warm light in the frame.
- **Crop to the body.** Collarbone, wrist, ear, sternum, back of the neck, hand on a railing. Faces are optional and often partially out of frame, so the viewer can project herself.
- **Avoid:** fear imagery (looking over shoulder, dark alleys with menace), stock "empowered woman" poses, blue/purple cyberpunk neon, glossy white-void product shots.
- **Grade:** lift blacks slightly toward `#0D0D0E` (never crushed pure black on screen), warm highlights toward Pulse, keep greens neutral except UI.

---

## 7. Iconography & Graphic Elements

- **Line icons** at 1.5px stroke, 24px grid, round caps (Radio Garden / TE). Monoline only, no fills, except an active state that may fill with the accent.
- **Signature marks:**
  - **The Ring:** thin circle + center dot (locator / connected). Animated as a slow breathing scale.
  - **The Pulse Line:** a single-stroke waveform (ECG/HRV-like) in Pulse color. It flattens into a calm sine wave in Ground color as the wearer settles.
  - **The Dot Grid:** spatial and technical backdrop.
  - **The Signal Dot:** a 6–8px dot in Pulse or Ground for live status (Adoratorio's orange dot, Nothing's red square).
- **Biometric data viz:** minimal and monoline. Show the *trend* and *state* ("settling", "steady") more than raw numbers. Raw numbers stay in mono, small, secondary.

---

## 8. Medium-Specific Guidelines

### 8.1 Motion Graphics

Motion should feel like breathing, not like notifications.

| Token | Duration | Easing | Use |
|---|---|---|---|
| `breath` | 4000ms loop (4s in / 4s out option) | `cubic-bezier(0.37, 0, 0.63, 1)` (sine in-out) | Ring scale, glow, calm states |
| `pulse` | 600–900ms (synced to a real ~70 BPM) | `cubic-bezier(0.22, 1, 0.36, 1)` | Heartbeat, haptic tap |
| `reveal` | 800–1200ms | `cubic-bezier(0.16, 1, 0.3, 1)` (expo out) | Type, image, section entrances |
| `ui` | 200–320ms | `cubic-bezier(0.2, 0, 0, 1)` | Buttons, toggles, panels |

- **Haptic visualized:** concentric rings expand from the point of contact on the body, Pulse → fade. Two rings max.
- **State transition (the core story):** Pulse waveform (jagged, fast) → morphs → Ground sine wave (slow, smooth). Color crossfades over ~2s. This is the brand's signature animation.
- **Typographic motion:** letters assemble from the background type texture (Adoratorio). Mono labels "type on" character by character at ~30ms/char.
- **Camera:** slow push-ins and drifts. No whip pans, no glitch effects.
- **Never** flash, strobe, or shake. That reads as an alarm.

### 8.2 Video

- **Aspect ratios:** 16:9 master, 9:16 social cutdowns, 4:5 feed, 1:1 product loops.
- **Structure:** Night Street (context) → body close-up (sensing) → haptic moment (Pulse) → calm/arrival (Ground) → Anchor end card.
- **Sound:** city ambience lowered by a muffled "inner" layer when the haptic fires. Heartbeat used subtly as rhythm, never as a horror cue.
- **Supers:** mono `label` for data/location (`23:41 · 34.05°N 118.24°W · HR 88 → 71`), serif `statement` for emotion. Lower-left or center, inside title-safe.
- **End card:** The Anchor. Wordmark bottom-bleed, meta-bar top, one Ground signal dot.

### 8.3 Website

- **Hero:** The Anchor over a looping cinematic night video (Gentle Monster) with a typographic texture overlay. Live clock + city in the meta-bar.
- **Nav:** floating translucent rounded bar (Nothing): `background: rgba(38,39,42,0.6); backdrop-filter: blur(16px); border-radius: 14px`. Or TE-style top nav with line icons on wide screens.
- **Section rhythm:** Anchor → Signal in the Dark (product) → Split (story) → Locator (how it connects) → Still Life (details) → Index (specs) → Night Street (campaign) → Anchor footer.
- **Buttons:** ghost pill (1px Bone border, Bone text) as default. Solid Bone with Nocturne text for primary. Accent-filled only for the "live" action (e.g., *Pair*, *Feel the pulse*).
- **Carousel progress:** segmented hairline bars (Gentle Monster).
- **Responsive:** display type scales fluidly and may wrap to two stacked lines on mobile (Muromuro). Splits become stacked (image first). Meta-bar collapses to brand + time + state dot.
- **Respect `prefers-reduced-motion`:** replace breathing/pulse loops with static state colors.

### 8.4 Deck

- **Format:** 16:9, 1920×1080, Nocturne background default. Use Bone slides as "breathers" for research or quotes.
- **Slide types → archetypes:**
  - Cover / closing → **The Anchor**
  - Chapter divider → **The Night Street** (B&W full-bleed + glowing title)
  - Key insight / quote → **The Signal in the Dark** (serif statement, centered)
  - Research / narrative → **The Split**
  - System / journey diagram → **The Locator**
  - Agenda / features / specs → **The Index**
  - Product hero → **The Still Life**
- **Every slide** carries the meta-bar (project · section · `(03/24)`) in `meta`/`label` styles.
- One idea per slide. Max ~30 words of body text.

### 8.5 Application

- **Dark-only by default** (used at night; protects night vision and keeps attention low). Optional Bone light theme for daytime settings screens.
- **Home = The Locator:** city map dimmed to ~40%, the wearer's Ring in Ground (connected) or breathing Pulse (sensing activation). Bottom-sheet panel with state, time, and trusted-contact status.
- **Bottom tab bar** (Radio Garden): 4–5 line icons + labels, active state in Ground.
- **Core screens:** Home/Locator · Body (live signal, Pulse→Ground waveform) · Journey (route + check-ins) · Circle (trusted connections) · Settings (haptic patterns, sensitivity).
- **Haptic pattern editor:** visualize patterns as dot/ring sequences on a timeline in mono labels.
- **Glanceability:** primary state readable in under 1 second. Large state word in `statement` serif ("Steady.", "You're grounded."), small mono data beneath.
- **Touch targets** ≥ 48px. Corner radius 16px for cards and sheets, full for pills.
- **Tone of microcopy:** calm, second person, present tense. "You're steady." "Breathing with you." Not "Warning: elevated heart rate."

---

## 9. Voice (for all copy)

- Short. Declarative. Warm.
- Speak *to* her, never *about* threats.
- Serif lines carry feeling ("Feel the city. Stay in yourself."). Mono lines carry facts ("HR 71 · 23:52 · Paired").

---

## 10. Do / Don't

| Do | Don't |
|---|---|
| One glowing signal per frame | Multiple accents competing |
| Ember orange for life/body | Red for danger/alarm |
| B&W city + warm body light | Blue/purple cyberpunk neon |
| Hairlines, rings, dot grids | Heavy borders, drop shadows, gradients |
| Breathing, slow, sine-eased motion | Flashing, shaking, glitch |
| Crop to the body; let her project herself | Fear narratives, victim imagery |
| Mono for data, serif for feeling, grotesk for structure | More than three type families on a page |
| Huge type anchored to edges | Medium-sized type floating in the middle of nothing |

---

## 11. Quick Reference

```
COLORS     Nocturne #0D0D0E · Asphalt #26272A · Concrete #8C8B87
           Bone #EEEBE5 · Pulse #FF6A3D · Ground #5FE3A4
TYPE       Inter Tight (structure) · Instrument Serif (feeling) · JetBrains Mono (signal)
           accent: Doto (dot-matrix)
GRID       12 / 8 / 4 col · 8px base · tight edge margins
MARKS      Ring + dot · Pulse→Ground waveform · dot grid · signal dot
MOTION     breath 4s sine · pulse ~70bpm · reveal expo-out · no flashing
ARCHETYPES Anchor · Signal in the Dark · Split · Locator · Night Street · Still Life · Index
```
