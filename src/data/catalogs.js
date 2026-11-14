export const STRIKER_CATALOG = {
  blaze: {
    id: "blaze",
    name: "Blaze",
    title: "Pyro Brawler",
    color: "#ff2a54",
    ring: "#fde047",
    trail: "#ff5500",
    icon: "🔥",
    stats: { pwr: 5, spd: 3, fx: 3 },
    superMove: {
      id: "METEOR_FIREBALL",
      name: "Meteor Fireball",
      icon: "☄️",
      color: "#ff2a54",
      desc: "21.5x Guided Fireball straight at goal!",
    },
  },
  volt: {
    id: "volt",
    name: "Volt",
    title: "Volt Speedster",
    color: "#eab308",
    ring: "#38bdf8",
    trail: "#fde047",
    icon: "⚡",
    stats: { pwr: 3, spd: 5, fx: 4 },
    superMove: {
      id: "THUNDER_BANK",
      name: "Thunder Bank-Shot",
      icon: "⚡",
      color: "#eab308",
      desc: "Ricochet bank-shot + micro-shocks foe!",
    },
  },
  frost: {
    id: "frost",
    name: "Frost",
    title: "Cryo Guardian",
    color: "#00b4d8",
    ring: "#ffffff",
    trail: "#38bdf8",
    icon: "❄️",
    stats: { pwr: 3, spd: 3, fx: 5 },
    superMove: {
      id: "SUBZERO_NOVA",
      name: "Sub-Zero Nova",
      icon: "❄️",
      color: "#00b4d8",
      desc: "Cryo goal shield + flash-freezes foe on hit!",
    },
  },
  venom: {
    id: "venom",
    name: "Venom",
    title: "Viper Trickster",
    color: "#a855f7",
    ring: "#4ade80",
    trail: "#c084fc",
    icon: "🐍",
    stats: { pwr: 4, spd: 4, fx: 5 },
    superMove: {
      id: "VIPER_CURVE",
      name: "Twin Fang Curve",
      icon: "🐍",
      color: "#a855f7",
      desc: "Wicked banana curve shot + decoy puck!",
    },
  },
};

export const PUCK_CATALOG = {
  classic: {
    id: "classic",
    name: "Classic Gold",
    main: "#fde047",
    ring: "#ff2a54",
    trail: "#38bdf8",
  },
  fireball: {
    id: "fireball",
    name: "Inferno",
    main: "#ff5500",
    ring: "#fde047",
    trail: "#ff2a54",
  },
  cyber: {
    id: "cyber",
    name: "Neon Cyber",
    main: "#0f172a",
    ring: "#2dd4bf",
    trail: "#2dd4bf",
  },
  star: {
    id: "star",
    name: "Nova Star",
    main: "#f43f5e",
    ring: "#ffffff",
    trail: "#fde047",
  },
};

export const ARENA_CATALOG = {
  nhl94: {
    id: "nhl94",
    name: "Retro Forum '94",
    subtitle: "Classic 90s Ice",
    badge: "🏒",
    bg: "#1d2b53",
    accent: "#38bdf8",
  },
  strikers: {
    id: "strikers",
    name: "Thunder Dome",
    subtitle: "Charged Cyber Turf",
    badge: "⚡",
    bg: "#091e1a",
    accent: "#4ade80",
  },
  cosmos: {
    id: "cosmos",
    name: "Starlight Nebula",
    subtitle: "Zero-G Orbital Rink",
    badge: "🪐",
    bg: "#160f29",
    accent: "#c084fc",
  },
};

// Backwards-compatible fallback alias for any saved/legacy "smash" key
export function resolveArenaMeta(arenaId) {
  if (arenaId === "smash") return ARENA_CATALOG.cosmos;
  return ARENA_CATALOG[arenaId] || ARENA_CATALOG.nhl94;
}

export const BONUS_CATALOG = [
  {
    id: "MEGA_PADDLE",
    name: "Mega Striker",
    icon: "🍄",
    color: "#ff3b30",
    duration: 8000,
    description: "Giant mallet x1.75",
  },
  {
    id: "SHRINK_FOE",
    name: "Mini Zap",
    icon: "🔋",
    color: "#ffcc00",
    duration: 8000,
    description: "Shrinks opponent mallet",
  },
  {
    id: "ICE_WALL",
    name: "Ice Fortress",
    icon: "🧱",
    color: "#00c7ff",
    duration: 7000,
    description: "Shield wall guards your goal",
  },
  {
    id: "TURBO_SHOT",
    name: "Cannon Shot",
    icon: "🔥",
    color: "#ff6b00",
    duration: 3500,
    description: "Blasts pucks toward net",
  },
  {
    id: "FREEZE_FOE",
    name: "Cryo Freeze",
    icon: "🧊",
    color: "#5ac8fa",
    duration: 5500,
    description: "Freezes opponent speed",
  },
  {
    id: "MULTI_PUCK",
    name: "Multiball",
    icon: "🎱",
    color: "#af52de",
    duration: 10000,
    description: "+3 pucks on the rink!",
  },
  {
    id: "DOUBLE_SCORE",
    name: "Double Star",
    icon: "⭐",
    color: "#ffd60a",
    duration: 10000,
    description: "Your goals count x2",
  },
  {
    id: "SIGNATURE_SUPER",
    name: "Signature Super",
    icon: "☄️",
    color: "#ff0055",
    duration: 7500,
    description: "Arms your Striker's Ultimate Shot!",
  },
];

export function resolveFighterSuperBonus(strikerId = "blaze") {
  const striker = STRIKER_CATALOG[strikerId] || STRIKER_CATALOG.blaze;
  const { superMove } = striker;
  return {
    id: "SIGNATURE_SUPER",
    superType: striker.id,
    name: superMove.name,
    icon: superMove.icon,
    color: superMove.color,
    duration: 7500,
    description: superMove.desc,
  };
}
