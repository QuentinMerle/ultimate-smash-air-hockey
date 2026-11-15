import { create } from "zustand";
import { sound } from "./sound";

// Shared mutable registry for live physics & slow-mo references (avoids React re-renders at 60fps)
export const gameRefs = {
  pucks: new Map(), // id -> { body: Body2D, isMain: boolean }
  lastTouchedBy: "playerOne", // "playerOne" | "playerTwo"
  bonusPos: { active: false, x: 0, z: 0 },
  activeTimeouts: new Set(),
  shake: 0,
  hitStopUntil: 0,
  timeScale: 1.0,
  curveSpin: 0,
  p1SuperType: null,
  p2SuperType: null,
  rocketFlight: false,
  mainPuckPos: { x: 0, z: 0 },
  p1Pos: { x: 0, z: -2.1 },
  p2Pos: { x: 0, z: 2.1 },
  p1Pulse: 0,
  p2Pulse: 0,
  autoPilotP1: { active: false, x: 0, z: -2.1 },
  autoPilotP2: { active: false, x: 0, z: 2.1 },
  forceSetupStep: false,
};

// Pause-aware timeout scheduler
export const registerTimeout = (fn, delay) => {
  const entry = {
    id: null,
    fn,
    remaining: Math.max(0, delay),
    startedAt: performance.now(),
    paused: false,
  };

  const schedule = () => {
    entry.startedAt = performance.now();
    entry.paused = false;
    entry.id = setTimeout(() => {
      gameRefs.activeTimeouts.delete(entry);
      entry.fn();
    }, entry.remaining);
  };

  gameRefs.activeTimeouts.add(entry);
  if (useStore.getState().isPaused) {
    entry.paused = true;
  } else {
    schedule();
  }
  return entry;
};

export const pauseAllGameTimeouts = () => {
  const now = performance.now();
  gameRefs.activeTimeouts.forEach((entry) => {
    if (entry.paused) return;
    if (entry.id !== null) {
      clearTimeout(entry.id);
      entry.id = null;
    }
    entry.remaining = Math.max(0, entry.remaining - (now - entry.startedAt));
    entry.paused = true;
  });
};

export const resumeAllGameTimeouts = () => {
  gameRefs.activeTimeouts.forEach((entry) => {
    if (!entry.paused) return;
    entry.startedAt = performance.now();
    entry.paused = false;
    entry.id = setTimeout(() => {
      gameRefs.activeTimeouts.delete(entry);
      entry.fn();
    }, entry.remaining);
  });
};

export const clearAllGameTimeouts = () => {
  gameRefs.activeTimeouts.forEach((entry) => {
    if (entry.id !== null) clearTimeout(entry.id);
  });
  gameRefs.activeTimeouts.clear();
};

const initialModifiers = {
  playerOneSize: 1,
  playerTwoSize: 1,
  playerOneSpeedMult: 1,
  playerTwoSpeedMult: 1,
  playerOneShield: false,
  playerTwoShield: false,
  playerOneScoreMult: 1,
  playerTwoScoreMult: 1,
  playerOneRocketArmed: false,
  playerTwoRocketArmed: false,
  turboPuck: false,
  extraPucks: 0,
  playerOneItem: { status: "none", bonus: null },
  playerTwoItem: { status: "none", bonus: null },
  activeEffects: [],
  countdown: null, // null | 3 | 2 | 1 | "GO!"
  isPaused: false,
  peerDisconnected: false,
  isGoalSlowMo: false,
};

const useStore = create((set, get) => ({
  playerOneName: "Player 1",
  playerTwoName: "CPU (Normal)",
  gameMode: "ai", // "ai" | "local" | "online"
  aiDifficulty: "medium", // "easy" | "medium" | "hard"
  winningScore: 7, // 5 | 7 | 10

  // Visual Customization (Strikers, Puck, Arena)
  arena: "nhl94", // "nhl94" | "strikers" | "smash"
  playerOneStriker: "blaze", // "blaze" | "volt" | "frost" | "venom"
  playerTwoStriker: "frost",
  puckStyle: "classic", // "classic" | "fireball" | "cyber" | "star"

  // Online P2P Multiplayer State
  onlineRole: null, // "host" | "guest" | null
  roomCode: "",
  onlineConnected: false,

  // Match State
  playerOne: 0,
  playerTwo: 0,
  scoreValue: 1,
  startGame: false,
  endGame: false,
  winner: "",
  lastGoalBy: null,
  lastGoalSpeed: 0,
  maxShotSpeed: 0,
  reinit: false,

  // Audio & Caster State
  soundMuted: false,
  musicMuted: false,
  voiceMuted: false,
  casterMessage: "🎙️ WELCOME TO ULTIMATE SMASH AIR HOCKEY! GET READY!",

  ...initialModifiers,

  toggleSound: () =>
    set((state) => {
      const next = !state.soundMuted;
      sound.setMuted(next);
      return { soundMuted: next };
    }),

  toggleMusic: () =>
    set((state) => {
      const next = !state.musicMuted;
      sound.setMusicMuted(next);
      return { musicMuted: next };
    }),

  toggleVoice: () =>
    set((state) => {
      const next = !state.voiceMuted;
      if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return { voiceMuted: next };
    }),

  setGameMode: (mode) => set({ gameMode: mode }),
  setAiDifficulty: (difficulty) => set({ aiDifficulty: difficulty }),
  setWinningScore: (score) => set({ winningScore: score }),
  setArena: (arena) => set({ arena }),
  setPlayerOneStriker: (striker) => set({ playerOneStriker: striker }),
  setPlayerTwoStriker: (striker) => set({ playerTwoStriker: striker }),
  setPuckStyle: (puckStyle) => set({ puckStyle }),
  setOnlineState: (patch) => set(patch),
  setCasterMessage: (msg) => set({ casterMessage: msg }),

  setPlayerOneSize: (size) => set({ playerOneSize: size }),
  setPlayerTwoSize: (size) => set({ playerTwoSize: size }),
  setPlayerOneSpeedMult: (mult) => set({ playerOneSpeedMult: mult }),
  setPlayerTwoSpeedMult: (mult) => set({ playerTwoSpeedMult: mult }),
  setPlayerOneShield: (active) => set({ playerOneShield: active }),
  setPlayerTwoShield: (active) => set({ playerTwoShield: active }),
  setPlayerOneScoreMult: (mult) => set({ playerOneScoreMult: mult }),
  setPlayerTwoScoreMult: (mult) => set({ playerTwoScoreMult: mult }),
  setTurboPuck: (active) => set({ turboPuck: active }),
  setExtraPucks: (count) => set({ extraPucks: count }),

  setPlayerRocketArmed: (player, active) => {
    if (player === "playerOne") {
      set({ playerOneRocketArmed: active });
    } else {
      set({ playerTwoRocketArmed: active });
    }
  },

  setPlayerItem: (player, itemState) => {
    if (player === "playerOne") {
      set({ playerOneItem: itemState });
    } else {
      set({ playerTwoItem: itemState });
    }
  },

  addActiveEffect: (effect) =>
    set((state) => ({
      activeEffects: [
        ...state.activeEffects.filter(
          (e) => !(e.player === effect.player && e.bonus.id === effect.bonus.id)
        ),
        effect,
      ],
    })),

  removeActiveEffect: (effectId) =>
    set((state) => ({
      activeEffects: state.activeEffects.filter((e) => e.id !== effectId),
    })),

  namePlayerOne: (name) => set({ playerOneName: name }),
  namePlayerTwo: (name) => set({ playerTwoName: name }),

  togglePause: () => {
    const state = get();
    if (!state.startGame || state.endGame || state.gameMode === "online") return;
    const nextPaused = !state.isPaused;
    if (nextPaused) {
      pauseAllGameTimeouts();
      sound.setMusicPaused(true);
    } else {
      resumeAllGameTimeouts();
      sound.setMusicPaused(false);
    }
    sound.playPause();
    set({ isPaused: nextPaused });
  },

  setGoalSlowMo: (active) => set({ isGoalSlowMo: active }),

  launchGame: () => {
    clearAllGameTimeouts();
    gameRefs.rocketFlight = false;
    gameRefs.hitStopUntil = 0;
    gameRefs.timeScale = 1.0;
    gameRefs.curveSpin = 0;
    gameRefs.p1SuperType = null;
    gameRefs.p2SuperType = null;
    sound.init();
    sound.startMusic();
    sound.setFastTempo(false);
    sound.setMusicPaused(false);

    set({
      startGame: true,
      endGame: false,
      winner: "",
      playerOne: 0,
      playerTwo: 0,
      lastGoalBy: null,
      lastGoalSpeed: 0,
      maxShotSpeed: 0,
      reinit: true,
      casterMessage: "🎙️ STADIUM LIGHTS ARE ON! GET READY TO CLASH!",
      ...initialModifiers,
      countdown: 3,
    });

    sound.playCountdown(3);
    registerTimeout(() => {
      set({ countdown: 2 });
      sound.playCountdown(2);
    }, 750);
    registerTimeout(() => {
      set({ countdown: 1 });
      sound.playCountdown(1);
    }, 1500);
    registerTimeout(() => {
      set({ countdown: "GO!", reinit: false });
      sound.playCountdown(0);
    }, 2250);
    registerTimeout(() => {
      set({ countdown: null });
    }, 2900);
  },

  resetToMenu: () => {
    clearAllGameTimeouts();
    gameRefs.rocketFlight = false;
    gameRefs.hitStopUntil = 0;
    gameRefs.timeScale = 1.0;
    gameRefs.curveSpin = 0;
    gameRefs.p1SuperType = null;
    gameRefs.p2SuperType = null;
    sound.stopMusic();
    set({
      startGame: false,
      endGame: false,
      winner: "",
      playerOne: 0,
      playerTwo: 0,
      reinit: true,
      ...initialModifiers,
    });
  },

  recordShotSpeed: (speedKmh) => {
    const current = get().maxShotSpeed;
    if (speedKmh > current) {
      set({ maxShotSpeed: speedKmh });
    }
  },

  increaseScore: (player, speedKmh = 95) => {
    const state = get();
    if (!state.startGame || state.endGame) return;

    const targetScore = state.winningScore || 7;
    const points =
      player === "playerOne"
        ? state.playerOneScoreMult
        : state.playerTwoScoreMult;

    const newP1 =
      player === "playerOne" ? state.playerOne + points : state.playerOne;
    const newP2 =
      player === "playerTwo" ? state.playerTwo + points : state.playerTwo;

    const isOver = newP1 >= targetScore || newP2 >= targetScore;
    const winnerName =
      newP1 >= targetScore
        ? state.playerOneName
        : newP2 >= targetScore
        ? state.playerTwoName
        : "";

    const isMatchPointNow =
      !isOver && (newP1 >= targetScore - 1 || newP2 >= targetScore - 1);
    sound.setFastTempo(isMatchPointNow);
    sound.playGoal(player === "playerOne");

    if (isOver) {
      sound.stopMusic();
      const isGuest = state.gameMode === "online" && state.onlineRole === "guest";
      const didLocalWin =
        state.gameMode === "local"
          ? true
          : isGuest
          ? newP2 >= targetScore
          : newP1 >= targetScore;
      registerTimeout(() => {
        if (didLocalWin) {
          sound.playVictory();
        } else {
          sound.playDefeat();
        }
      }, 180);
    }

    set({
      playerOne: newP1,
      playerTwo: newP2,
      lastGoalBy: player,
      lastGoalSpeed: speedKmh,
      maxShotSpeed: Math.max(state.maxShotSpeed, speedKmh),
      endGame: isOver,
      winner: winnerName,
      extraPucks: 0,
      playerOneRocketArmed: false,
      playerTwoRocketArmed: false,
    });
  },

  reinitPosition: (status) => set({ reinit: status }),
}));

export { useStore };
