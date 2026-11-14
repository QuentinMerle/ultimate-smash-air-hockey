// Arcade Hall of Fame & Top Shot Speed Radar Leaderboard (localStorage backed)

const STORAGE_KEY = "ssah_hall_of_fame_v1";

const SEED_ENTRIES = [
  { id: "seed-1", name: "NEO_ACE", score: 2840, topSpeed: 178, archetype: "🎯 GEOMETRY SNIPER", arena: "Retro Forum '94" },
  { id: "seed-2", name: "BLAZE_94", score: 2490, topSpeed: 164, archetype: "💥 HEAVY SMASHER", arena: "Thunder Dome" },
  { id: "seed-3", name: "NOVA_STRIKER", score: 2150, topSpeed: 152, archetype: "⚔️ FRONT-LINE CHARGER", arena: "Starlight Nebula" },
  { id: "seed-4", name: "ICEBREAKER", score: 1820, topSpeed: 138, archetype: "🧱 GOALIE BUS PARKER", arena: "Retro Forum '94" },
  { id: "seed-5", name: "CLASH_KID", score: 1540, topSpeed: 129, archetype: "🎁 MYSTERY BOX HUNTER", arena: "Thunder Dome" },
];

export function getLeaderboard() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [...SEED_ENTRIES];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENTRIES));
      return [...SEED_ENTRIES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...SEED_ENTRIES];
    }
    return parsed.sort((a, b) => b.score - a.score).slice(0, 10);
  } catch {
    return [...SEED_ENTRIES];
  }
}

export function submitMatchScore({
  playerName,
  isWinner,
  playerScore,
  foeScore,
  maxShotKmh,
  aiDifficulty,
  gameMode,
  archetypeLabel,
  arenaName,
}) {
  const diffBonus =
    gameMode !== "ai"
      ? 300
      : aiDifficulty === "hard"
      ? 450
      : aiDifficulty === "medium"
      ? 200
      : 50;

  const margin = Math.max(-5, playerScore - foeScore);
  const pointsEarned = Math.max(
    150,
    (isWinner ? 1000 : 250) + margin * 180 + Math.round((maxShotKmh || 90) * 6) + diffBonus
  );

  const entry = {
    id: `run-${Date.now()}`,
    name: (playerName || "PLAYER 1").toUpperCase().slice(0, 14),
    score: pointsEarned,
    topSpeed: maxShotKmh || 95,
    archetype: archetypeLabel || "⚔️ STRIKER",
    arena: arenaName || "Retro Forum '94",
  };

  const current = getLeaderboard();
  const next = [...current, entry].sort((a, b) => b.score - a.score).slice(0, 10);
  const rank = next.findIndex((item) => item.id === entry.id) + 1;

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore storage quota errors
  }

  return {
    pointsEarned,
    rank,
    leaderboard: next,
  };
}
