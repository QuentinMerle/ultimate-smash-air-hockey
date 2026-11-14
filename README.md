# 🏒 Ultimate Smash Air Hockey (R3F)

3D arcade Air Hockey game with **Mario Kart-style items**, **4 Fighters with Signature Supers**, **Sakurai-style Goal KO Slow-Mo**, **Organic spring-billowing goal nets**, **3 reactive 3D arenas (NHL goal sirens, Tesla coils, Stargate portals)**, **Arcade Voice Caster & Habit Profiler**, **Thumb-drag mobile touch + W3C Gamepad support**, and **serverless P2P Online multiplayer via PeerJS** — built with **React Three Fiber (Three.js)**, an analytical **2D physics engine (`physics2d.js`)**, and **Zustand**.

> **🧪 Revival Experiment (Gemini Argon & Hydrogen)**  
> Originally started as an older React Three Fiber prototype sitting in a local folder, this project was revived as a hands-on experiment with **Gemini (Argon & Hydrogen)** — testing how agentic pair-programming can take an unfinished 3D prototype across the "last 80% polish wall" (custom 8-substep 2D physics, Sakurai-style KO slow-mo, procedural Web Audio synthesis, goal-reactive arenas, and serverless PeerJS WebRTC multiplayer).

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start local dev server (http://localhost:5173)
npm run dev

# Build multi-chunk production bundle (Mobile & WebGL optimized)
npm run build
```

> Append `#debug` to the URL to display the Leva / `r3f-perf` developer overlay.

---

## 🗂️ Architecture (`src/`)

Simulation physics, match state, P2P networking, audio synthesis, menu UI, and 3D rendering remain strictly decoupled in clean modular folders (`~460 kB` total gzipped across 3 parallel chunks, zero WASM):

```text
src/
├── index.jsx                  # React entrypoint
├── App.jsx                    # R3F <Canvas> (dpr capped 1.5), KeyboardControls & #debug Leva toggle
├── Experience.jsx             # 4-mode DynamicCamera (with Sakurai Goal KO zoom) & toon lighting
├── AirHockey.jsx              # 2D->3D simulation loop, Fighter Super FX triggers & P2P net sync
├── Start.jsx                  # Neo-Arcade Cabinet menu, mode select & Hall of Fame <dialog>
├── End.jsx                    # Delayed Victory/Defeat splash banner, scouting report & Hall of Fame
├── physics2d.js               # Analytical 2D physics (8x substeps, timeScale slow-mo, curve, PWR stats, 4 Supers)
├── store.jsx                  # Zustand store + pause-aware timer scheduler
├── utils.jsx                  # Item roller (rubber-banding) & bonus/Signature Super activation
├── sound.js                   # Procedural Web Audio synthwave, NHL goal horn, victory/defeat jingles & crowd roar
├── announcer.js               # Web Speech API high-energy arcade announcer (overlap-locked, single phrase)
├── profiler.js                # Zero-dependency single-layer perceptron habit profiler & scouting tags
├── gamepad.js                 # W3C Gamepad API adapter (2 gamepads, camera-rotated sticks & D-pad UI focus)
├── leaderboard.js             # LocalStorage Hall of Fame leaderboard
├── telemetry.js               # Zero-dependency Web-API retention telemetry (Umami / Plausible / Vercel / Beacon)
├── net.js                     # Serverless P2P multiplayer (BroadcastChannel + lazy PeerJS WebRTC DataChannel)
├── data/
│   ├── catalogs.js            # Fighter roster, Signature Supers, Arena stages, Puck styles & Items
│   └── announcer-lines.json   # High-energy arcade voice-over line bank
├── menu/
│   ├── StartStyles.js         # Neo-Arcade cabinet styled-components theme (100dvh compact Setup, safe-area padded)
│   ├── FighterSelectGrid.jsx  # "Choose Your Fighter" cards (disc emblems, Signature Supers & PWR/SPD/FX bars)
│   └── StageAndPuckDeck.jsx   # Arena swatches, Center Puck Skin selector, CPU/target pills & PeerJS invite deck
├── assets/
│   ├── Arenas.jsx             # 3 goal-reactive 3D arenas (Retro Forum '94, Thunder Dome, Starlight Nebula)
│   ├── Effects.jsx            # 4-band Toon GradientMap, shared outlines/shadows & 64-instance particle pool
│   ├── RinkSurface.jsx        # Procedural 2D CanvasTexture rink artwork (with 8-point Nova Starburst)
│   ├── Palet.jsx              # Dynamic puck body, custom palette, Super flight tint & 6-segment trail
│   ├── PusherOne.jsx          # Player 1 striker (relative thumb-drag on touch, mouse raycast, arrows, Pad 0)
│   ├── PusherTwo.jsx          # Player 2 striker (3-tier AI, WASD Side-View, Pad 1, or Online Guest remote sync)
│   ├── Bonus.jsx              # Pause-aware "?" Mystery Box spawning & single-slot replacement pickup
│   ├── Goal.jsx               # Braided nylon net texture, spring-damped vertex ripple & Sakurai Slow-Mo goal flow
│   └── Wall.jsx               # Inked cartoon rink walls
└── hud/
    ├── Score.jsx              # Scoreboard, GOAL! pop banner, audio mutes & native Pause <dialog>
    └── Gift.jsx               # Single-slot Mario Kart item roulette, Super Armed banner & active buff timers
```

---

## 🎮 Key Features

- **Mobile Thumb-Drag Controls (`PusherOne` / `PusherTwo`)**: Touch devices track relative thumb slide deltas (`pointermove` + `touch-action: none`) instead of warping on tap, with double-tap or HUD button tap to trigger items/Supers.
- **4 Fighters & Signature Supers (`Choose Your Fighter`)**: Determines your mallet colors, physical `PWR` hit multiplier, and Signature Super:
  - **Blaze** (`☄️ Meteor Fireball`): `21.5x` guided fireball straight into the enemy net.
  - **Volt** (`⚡ Thunder Bank-Shot`): Speed boost + high-speed rail bank-shot that micro-shocks the rival.
  - **Frost** (`❄️ Sub-Zero Nova`): Instant Ice Fortress shield + flash-freezes the opponent (`0.32x`) on impact.
  - **Venom** (`🐍 Twin Fang Curve`): Wicked lateral Magnus banana-curve shot + spawns a decoy puck.
- **3 Goal-Reactive 3D Arenas**:
  - **Retro Forum '94**: NHL behind-goal red siren beacons light up with rotating twin beams, floor halos & jumping bleachers on every goal.
  - **Thunder Dome**: Behind-goal Tesla coils & perimeter pylons surge with plasma rings.
  - **Starlight Nebula**: Stargate Nova portals behind each goal ignite an energy pillar & accelerate orbital rings.
- **Sakurai Goal Slow-Mo & Delayed Outcome**: Every goal triggers `115 ms` hit-stop + `0.16x` slow-mo + organic net ripple + pop/shake `GOAL!` banner. Match-winning goals display a dedicated `VICTORY!` / `DEFEAT!` splash for `1.65s` before presenting the summary card.
- **Serverless Online P2P (`net.js`)**: Uses **PeerJS WebRTC** (`?room=XXXX` invites) + **BroadcastChannel** (local multi-tab `0ms`) with zero backend required for static hosting (Vercel, Netlify, Cloudflare Pages). Adding a free TURN relay in `net.js` enables strict symmetric 4G/5G cellular NAT traversal.

---

## 📊 Telemetry & Retention Metrics

`src/telemetry.js` tracks core arcade funnel events (`match_start`, `match_end`, `rematch_clicked`, `invite_copied`) using native browser APIs (`localStorage`, `CustomEvent`, `navigator.sendBeacon`) with zero bundle bloat:

- Inspect live funnel stats anytime in DevTools via `window.__USAH_METRICS__` (`completionRatePct`, `rematchRatePct`, `viralInviteCount`).
- Automatically forwards events to **Umami Cloud** (`window.umami`), **Plausible** (`window.plausible`), **Vercel Web Analytics** (`window.va`), or a custom `VITE_TELEMETRY_URL` beacon endpoint when configured — simply drop the 1-line `<script>` snippet in `src/index.html`.
