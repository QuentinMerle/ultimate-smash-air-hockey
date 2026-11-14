import lines from "./data/announcer-lines.json";
import { useStore, gameRefs } from "./store";
import { announcer } from "./announcer";

const ARCHETYPE_BADGES = {
  CAMPER: { emoji: "🧱", title: "GOALIE BUS PARKER", desc: "Guards the crease with iron discipline." },
  AGGRESSIVE: { emoji: "⚔️", title: "FRONT-LINE CHARGER", desc: "Applies non-stop midfield pressure." },
  SNIPER: { emoji: "🎯", title: "GEOMETRY SNIPER", desc: "Loves sharp bank shots off the boards." },
  SMASHER: { emoji: "💥", title: "HEAVY SMASHER", desc: "Unleashes blistering slapshots." },
  HOARDER: { emoji: "🎁", title: "MYSTERY BOX HUNTER", desc: "Lives for Smash item roulette chaos." },
};

// Lightweight heuristic single-layer perceptron Player Habit Profiler (cross-browser, 0ms overhead)
class PlayerHabitProfiler {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalSamples = 0;
    this.camperSamples = 0;
    this.aggressiveSamples = 0;
    this.wallBounces = 0;
    this.heavyHits = 0;
    this.bonusesCollected = 0;
    this.sampleAccum = 0;
    this.commentAccum = 0;
    this.lastHabit = null;
  }

  recordWallBounce() {
    this.wallBounces++;
  }

  recordHeavyHit() {
    this.heavyHits++;
  }

  recordBonusCollected() {
    this.bonusesCollected++;
  }

  computeDominantArchetype() {
    const samples = Math.max(1, this.totalSamples);
    const campRatio = this.camperSamples / samples;
    const aggroRatio = this.aggressiveSamples / samples;

    // Single-layer weighted feature scoring
    const scores = {
      CAMPER: campRatio * 2.4 + (this.heavyHits < 3 ? 0.2 : 0),
      AGGRESSIVE: aggroRatio * 2.6,
      SNIPER: (this.wallBounces / Math.max(8, samples)) * 1.9,
      SMASHER: (this.heavyHits / Math.max(5, samples * 0.15)) * 1.4,
      HOARDER: this.bonusesCollected * 0.45,
    };

    let bestKey = "AGGRESSIVE";
    let bestScore = -1;
    Object.entries(scores).forEach(([key, val]) => {
      if (val > bestScore) {
        bestScore = val;
        bestKey = key;
      }
    });

    return { archetype: bestKey, confidence: bestScore };
  }

  update(delta) {
    const state = useStore.getState();
    if (!state.startGame || state.endGame || state.isPaused || state.isGoalSlowMo || state.countdown !== null) {
      return;
    }

    this.sampleAccum += delta;
    if (this.sampleAccum >= 0.2) {
      this.sampleAccum = 0;
      this.totalSamples++;
      const p1z = gameRefs.p1Pos.z;
      if (p1z < -2.45) {
        this.camperSamples++;
      } else if (p1z > -1.05) {
        this.aggressiveSamples++;
      }
    }

    this.commentAccum += delta;
    if (this.commentAccum >= 13.5 && this.totalSamples >= 25) {
      this.commentAccum = 0;
      const { archetype, confidence } = this.computeDominantArchetype();
      if (confidence >= 0.65) {
        const candidates = lines.habits?.[archetype];
        if (candidates && candidates.length > 0) {
          this.lastHabit = archetype;
          announcer.announceHabit(archetype);
        }
      }
    }
  }

  getPlayerScoutingReport() {
    const { archetype } = this.computeDominantArchetype();
    const badge = ARCHETYPE_BADGES[archetype] || ARCHETYPE_BADGES.AGGRESSIVE;
    return {
      archetype,
      ...badge,
      stats: {
        heavyHits: this.heavyHits,
        wallBounces: this.wallBounces,
        bonusesCollected: this.bonusesCollected,
      },
    };
  }
}

export const profiler = new PlayerHabitProfiler();
