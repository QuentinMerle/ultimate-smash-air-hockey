import { useStore, gameRefs, registerTimeout } from "./store";
import { sound } from "./sound";
import { spawnImpactBurst, triggerScreenShake } from "./assets/Effects";
import {
  STRIKER_CATALOG,
  PUCK_CATALOG,
  ARENA_CATALOG,
  resolveArenaMeta,
  BONUS_CATALOG,
  resolveFighterSuperBonus,
} from "./data/catalogs";

export {
  STRIKER_CATALOG,
  PUCK_CATALOG,
  ARENA_CATALOG,
  resolveArenaMeta,
  BONUS_CATALOG,
  resolveFighterSuperBonus,
};

let bonusCallback = null;
export const setOnBonusAnnounce = (fn) => {
  bonusCallback = fn;
};

// Mario Kart style rubber-banding: weight items based on score difference
export const pickWeightedBonus = (playerId) => {
  const state = useStore.getState();
  const myScore = playerId === "playerOne" ? state.playerOne : state.playerTwo;
  const foeScore = playerId === "playerOne" ? state.playerTwo : state.playerOne;
  const diff = myScore - foeScore; // negative means losing

  const weights = {
    MEGA_PADDLE: 3,
    SHRINK_FOE: diff <= -2 ? 5 : diff < 0 ? 3 : 1,
    ICE_WALL: diff > 0 ? 4 : 2,
    TURBO_SHOT: diff <= -2 ? 5 : diff < 0 ? 3 : 2,
    FREEZE_FOE: diff < 0 ? 4 : 2,
    MULTI_PUCK: diff < 0 ? 4 : 2,
    DOUBLE_SCORE: diff <= -2 ? 4 : 2,
    SIGNATURE_SUPER: diff <= -2 ? 4 : diff < 0 ? 3 : 2,
  };

  const pool = [];
  BONUS_CATALOG.forEach((bonus) => {
    const w = weights[bonus.id] ?? 2;
    for (let i = 0; i < w; i++) {
      pool.push(bonus);
    }
  });

  const picked =
    pool.length === 0
      ? BONUS_CATALOG[0]
      : pool[Math.floor(Math.random() * pool.length)];

  if (picked.id === "SIGNATURE_SUPER") {
    const strikerId =
      playerId === "playerOne"
        ? state.playerOneStriker
        : state.playerTwoStriker;
    return resolveFighterSuperBonus(strikerId);
  }

  return picked;
};

export const collectBonusForPlayer = (playerId) => {
  const state = useStore.getState();
  const currentItem =
    playerId === "playerOne" ? state.playerOneItem : state.playerTwoItem;

  if (currentItem.status === "rolling") return;

  // Mario Kart 1-slot replacement rule: collecting a new item overwrites the previous held slot
  const chosenBonus = pickWeightedBonus(playerId);
  state.setPlayerItem(playerId, { status: "rolling", bonus: chosenBonus });

  registerTimeout(() => {
    const latest = useStore.getState();
    if (!latest.startGame || latest.endGame) return;
    latest.setPlayerItem(playerId, { status: "ready", bonus: chosenBonus });
    sound.playItemReady();
  }, 1100);
};

export const activatePlayerBonus = (playerId) => {
  const state = useStore.getState();
  if (!state.startGame || state.endGame || state.isPaused || state.isGoalSlowMo) {
    return false;
  }

  const item =
    playerId === "playerOne" ? state.playerOneItem : state.playerTwoItem;
  if (item.status !== "ready" || !item.bonus) return false;

  const bonus = item.bonus;
  state.setPlayerItem(playerId, { status: "none", bonus: null });

  sound.playBonusActivate(bonus.id);
  triggerScreenShake(0.18);

  if (bonusCallback) {
    bonusCallback(bonus.id, playerId);
  }

  const effectId = `${playerId}-${bonus.id}-${Date.now()}`;
  const isP1 = playerId === "playerOne";

  state.addActiveEffect({
    id: effectId,
    player: playerId,
    bonus,
    expiresAt: Date.now() + bonus.duration,
  });

  switch (bonus.id) {
    case "MEGA_PADDLE": {
      if (isP1) state.setPlayerOneSize(1.75);
      else state.setPlayerTwoSize(1.75);

      registerTimeout(() => {
        const s = useStore.getState();
        if (isP1) s.setPlayerOneSize(1);
        else s.setPlayerTwoSize(1);
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    case "SHRINK_FOE": {
      if (isP1) {
        state.setPlayerTwoSize(0.55);
        state.setPlayerTwoSpeedMult(0.75);
      } else {
        state.setPlayerOneSize(0.55);
        state.setPlayerOneSpeedMult(0.75);
      }

      registerTimeout(() => {
        const s = useStore.getState();
        if (isP1) {
          s.setPlayerTwoSize(1);
          s.setPlayerTwoSpeedMult(1);
        } else {
          s.setPlayerOneSize(1);
          s.setPlayerOneSpeedMult(1);
        }
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    case "ICE_WALL": {
      if (isP1) state.setPlayerOneShield(true);
      else state.setPlayerTwoShield(true);
      spawnImpactBurst(0, isP1 ? -2.9 : 2.9, "#38bdf8", 16, 1.2);

      registerTimeout(() => {
        const s = useStore.getState();
        if (isP1) s.setPlayerOneShield(false);
        else s.setPlayerTwoShield(false);
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    case "TURBO_SHOT": {
      state.setTurboPuck(true);
      const targetZ = isP1 ? 3.35 : -3.35;
      gameRefs.lastTouchedBy = playerId;

      gameRefs.pucks.forEach(({ body }) => {
        if (!body) return;
        const pos = body.translation();
        spawnImpactBurst(pos.x, pos.z, "#ff6b00", 14, 1.3);
        const targetX = (Math.random() - 0.5) * 0.45;
        const dx = targetX - pos.x;
        const dz = targetZ - pos.z;
        const len = Math.hypot(dx, dz) || 1;
        const speed = 14.0;
        body.setLinvel(
          { x: (dx / len) * speed, y: 0, z: (dz / len) * speed },
          true
        );
      });

      registerTimeout(() => {
        const s = useStore.getState();
        s.setTurboPuck(false);
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    case "FREEZE_FOE": {
      if (isP1) state.setPlayerTwoSpeedMult(0.24);
      else state.setPlayerOneSpeedMult(0.24);

      registerTimeout(() => {
        const s = useStore.getState();
        if (isP1) s.setPlayerTwoSpeedMult(1);
        else s.setPlayerOneSpeedMult(1);
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    case "MULTI_PUCK": {
      state.setExtraPucks(3);
      spawnImpactBurst(0, 0, "#a855f7", 18, 1.4);
      registerTimeout(() => {
        const s = useStore.getState();
        s.setExtraPucks(0);
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    case "DOUBLE_SCORE": {
      if (isP1) state.setPlayerOneScoreMult(2);
      else state.setPlayerTwoScoreMult(2);

      registerTimeout(() => {
        const s = useStore.getState();
        if (isP1) s.setPlayerOneScoreMult(1);
        else s.setPlayerTwoScoreMult(1);
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    case "SIGNATURE_SUPER":
    case "ROCKET_PUCK": {
      const strikerId =
        bonus.superType ||
        (isP1 ? state.playerOneStriker : state.playerTwoStriker) ||
        "blaze";
      gameRefs[isP1 ? "p1SuperType" : "p2SuperType"] = strikerId;
      state.setPlayerRocketArmed(playerId, true);
      sound.playRocketLock();

      if (strikerId === "volt") {
        if (isP1) state.setPlayerOneSpeedMult(1.3);
        else state.setPlayerTwoSpeedMult(1.3);
      } else if (strikerId === "frost") {
        if (isP1) state.setPlayerOneShield(true);
        else state.setPlayerTwoShield(true);
        spawnImpactBurst(0, isP1 ? -2.9 : 2.9, "#38bdf8", 16, 1.3);
        registerTimeout(() => {
          const s = useStore.getState();
          if (isP1) s.setPlayerOneShield(false);
          else s.setPlayerTwoShield(false);
        }, 4500);
      }

      registerTimeout(() => {
        const s = useStore.getState();
        s.setPlayerRocketArmed(playerId, false);
        gameRefs[isP1 ? "p1SuperType" : "p2SuperType"] = null;
        if (strikerId === "volt") {
          if (isP1) s.setPlayerOneSpeedMult(1);
          else s.setPlayerTwoSpeedMult(1);
        }
        s.removeActiveEffect(effectId);
      }, bonus.duration);
      break;
    }

    default:
      break;
  }

  return true;
};

export const execute = (playerId) => activatePlayerBonus(playerId);
export const random = () => pickWeightedBonus("playerOne");
