import { useEffect } from "react";
import { useStore, gameRefs, clearAllGameTimeouts } from "./store";
import { physicsWorld } from "./physics2d";
import { activatePlayerBonus } from "./utils";
import { resolveFighterSuperBonus } from "./data/catalogs";
import { sound } from "./sound";
import { spawnImpactBurst, triggerScreenShake } from "./assets/Effects";

let trailerTimers = [];
let trailerRunning = false;

function scheduleTrailer(fn, delayMs) {
  const id = window.setTimeout(() => {
    if (!trailerRunning) return;
    fn();
  }, delayMs);
  trailerTimers.push(id);
}

function getMainPuckBody() {
  let found = null;
  gameRefs.pucks.forEach((entry) => {
    if (entry?.isMain && entry.body) {
      found = entry.body;
    }
  });
  return found;
}

function fireScriptedSuper(superId, { puckX, puckZ, vx, vz, curveSpin = 0 }) {
  const puck = getMainPuckBody();
  gameRefs.rocketFlight = true;
  gameRefs.curveSpin = curveSpin;
  gameRefs.lastTouchedBy = "playerOne";
  gameRefs.p1SuperType = superId;
  gameRefs.p1Pulse = 1.0;

  useStore.setState({
    playerOneRocketArmed: false,
    turboPuck: false,
  });

  if (puck) {
    puck.setTranslation({ x: puckX, y: 0.05, z: puckZ });
    puck.setLinvel({ x: vx, z: vz });
  }

  sound.playHit(17, true);
  if (physicsWorld.onRocketFireCallback) {
    physicsWorld.onRocketFireCallback("pusherOne", puckX, puckZ, superId);
  }
}

export function stopTrailer() {
  trailerRunning = false;
  trailerTimers.forEach((id) => clearTimeout(id));
  trailerTimers = [];
  gameRefs.autoPilotP1.active = false;
  gameRefs.autoPilotP2.active = false;
  gameRefs.forceSetupStep = false;
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("trailer-recording");
  }
}

export function startTrailer() {
  stopTrailer();
  clearAllGameTimeouts();
  trailerRunning = true;
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("trailer-recording");
  }

  gameRefs.rocketFlight = false;
  gameRefs.hitStopUntil = 0;
  gameRefs.timeScale = 1.0;
  gameRefs.curveSpin = 0;
  gameRefs.p1SuperType = null;
  gameRefs.p2SuperType = null;
  gameRefs.forceSetupStep = false;

  gameRefs.autoPilotP1 = { active: true, x: 0.15, z: -2.1 };
  gameRefs.autoPilotP2 = { active: true, x: -0.25, z: 2.1 };

  sound.init();
  sound.startMusic();
  sound.setFastTempo(false);
  sound.setMusicPaused(false);

  // ACT 1 (0.0s - 4.1s): Retro Forum '94 + Blaze Meteor Fireball + Sakurai Slow-Mo + NHL Siren
  useStore.setState({
    startGame: true,
    endGame: false,
    reinit: false,
    countdown: null,
    isPaused: false,
    isGoalSlowMo: false,
    gameMode: "ai",
    aiDifficulty: "hard",
    winningScore: 7,
    arena: "nhl94",
    puckStyle: "fireball",
    playerOneStriker: "blaze",
    playerTwoStriker: "frost",
    playerOneName: "BLAZE",
    playerTwoName: "FROST",
    playerOne: 4,
    playerTwo: 4,
    maxShotSpeed: 124,
    playerOneSize: 1,
    playerTwoSize: 1,
    playerOneSpeedMult: 1,
    playerTwoSpeedMult: 1,
    playerOneShield: false,
    playerTwoShield: false,
    playerOneRocketArmed: false,
    playerTwoRocketArmed: false,
    extraPucks: 0,
    activeEffects: [],
    playerOneItem: { status: "none", bonus: null },
    playerTwoItem: { status: "none", bonus: null },
    casterMessage: "🎙️ RETRO FORUM '94 — IT'S DEADLOCKED 4-4!",
  });

  scheduleTrailer(() => {
    const puck = getMainPuckBody();
    if (puck) {
      puck.setTranslation({ x: 0.35, y: 0.05, z: -0.4 });
      puck.setLinvel({ x: -3.8, z: 10.2 });
    }
    gameRefs.autoPilotP2.x = -0.35;
    gameRefs.autoPilotP2.z = 2.0;
    gameRefs.autoPilotP1.x = 0.0;
    gameRefs.autoPilotP1.z = -2.2;
  }, 120);

  scheduleTrailer(() => {
    const puck = getMainPuckBody();
    if (puck) {
      puck.setTranslation({ x: -0.3, y: 0.05, z: 1.75 });
      puck.setLinvel({ x: 1.5, z: -12.8 });
    }
    gameRefs.p2Pulse = 1.0;
    sound.playHit(13, true);
    spawnImpactBurst(-0.3, 1.75, "#00b4d8", 12, 1.3);

    const blazeSuper = resolveFighterSuperBonus("blaze");
    useStore.getState().setPlayerItem("playerOne", {
      status: "ready",
      bonus: blazeSuper,
    });
  }, 500);

  scheduleTrailer(() => {
    activatePlayerBonus("playerOne");
    gameRefs.autoPilotP1.x = 0.05;
    gameRefs.autoPilotP1.z = -1.35;
    gameRefs.autoPilotP2.x = 0.85;
    gameRefs.autoPilotP2.z = 2.25;
  }, 850);

  scheduleTrailer(() => {
    gameRefs.autoPilotP1.x = 0.02;
    gameRefs.autoPilotP1.z = -0.95;
    fireScriptedSuper("blaze", {
      puckX: 0.02,
      puckZ: -0.92,
      vx: -0.35,
      vz: 21.8,
      curveSpin: 0,
    });
  }, 1350);

  scheduleTrailer(() => {
    gameRefs.autoPilotP2.x = 0;
    gameRefs.autoPilotP2.z = 2.05;
    gameRefs.autoPilotP1.x = 0;
    gameRefs.autoPilotP1.z = -2.05;
    const puck = getMainPuckBody();
    if (puck) {
      puck.setTranslation({ x: 0.15, y: 0.05, z: 0.25 });
      puck.setLinvel({ x: -2.2, z: -6.5 });
    }
  }, 2600);

  // ACT 2 (4.1s - 8.1s): Cut to Thunder Dome + Venom Twin Fang Curve + Multi-Puck + Tesla Coils
  scheduleTrailer(() => {
    clearAllGameTimeouts();
    gameRefs.rocketFlight = false;
    gameRefs.hitStopUntil = 0;
    gameRefs.timeScale = 1.0;
    gameRefs.curveSpin = 0;
    gameRefs.p1SuperType = null;

    useStore.setState({
      isGoalSlowMo: false,
      reinit: false,
      arena: "strikers",
      puckStyle: "cyber",
      playerOneStriker: "venom",
      playerTwoStriker: "volt",
      playerOneName: "VENOM",
      playerTwoName: "VOLT",
      playerOne: 5,
      playerTwo: 5,
      playerOneSize: 1,
      playerTwoSize: 1.55,
      playerOneSpeedMult: 1,
      playerTwoSpeedMult: 1,
      playerOneShield: false,
      playerTwoShield: false,
      playerOneRocketArmed: false,
      extraPucks: 0,
      activeEffects: [],
      casterMessage: "⚡ THUNDER DOME OVERCHARGE — MEGA VOLT DEFENDING!",
    });

    gameRefs.autoPilotP1.x = -0.85;
    gameRefs.autoPilotP1.z = -2.1;
    gameRefs.autoPilotP2.x = 0.7;
    gameRefs.autoPilotP2.z = 2.25;

    const puck = getMainPuckBody();
    if (puck) {
      puck.setTranslation({ x: 0.55, y: 0.05, z: 0.65 });
      puck.setLinvel({ x: -6.2, z: -11.5 });
    }
    triggerScreenShake(0.2);
  }, 4100);

  scheduleTrailer(() => {
    const venomSuper = resolveFighterSuperBonus("venom");
    useStore.getState().setPlayerItem("playerOne", {
      status: "ready",
      bonus: venomSuper,
    });
    activatePlayerBonus("playerOne");
    gameRefs.autoPilotP1.x = -0.78;
    gameRefs.autoPilotP1.z = -1.35;
    gameRefs.autoPilotP2.x = -0.85;
    gameRefs.autoPilotP2.z = 2.3;
  }, 4550);

  scheduleTrailer(() => {
    gameRefs.autoPilotP1.x = -0.75;
    gameRefs.autoPilotP1.z = -1.05;
    gameRefs.autoPilotP2.x = -1.15;
    gameRefs.autoPilotP2.z = 2.35;
    fireScriptedSuper("venom", {
      puckX: -0.75,
      puckZ: -1.05,
      vx: 5.2,
      vz: 19.8,
      curveSpin: -28,
    });
  }, 5250);

  scheduleTrailer(() => {
    gameRefs.autoPilotP2.x = 0;
    gameRefs.autoPilotP2.z = 2.05;
    gameRefs.autoPilotP1.x = 0;
    gameRefs.autoPilotP1.z = -2.05;
    useStore.setState({ extraPucks: 0 });
    const puck = getMainPuckBody();
    if (puck) {
      puck.setTranslation({ x: -0.2, y: 0.05, z: -0.15 });
      puck.setLinvel({ x: 2.5, z: 5.5 });
    }
  }, 6600);

  // ACT 3 (8.1s - 13.6s): Starlight Nebula (2P Side-View Camera!) + Frost Sub-Zero Nova + Match-Winner
  scheduleTrailer(() => {
    clearAllGameTimeouts();
    gameRefs.rocketFlight = false;
    gameRefs.hitStopUntil = 0;
    gameRefs.timeScale = 1.0;
    gameRefs.curveSpin = 0;
    gameRefs.p1SuperType = null;

    useStore.setState({
      isGoalSlowMo: false,
      reinit: false,
      gameMode: "local",
      arena: "cosmos",
      puckStyle: "star",
      playerOneStriker: "frost",
      playerTwoStriker: "blaze",
      playerOneName: "FROST",
      playerTwoName: "BLAZE",
      playerOne: 6,
      playerTwo: 6,
      winningScore: 7,
      playerOneSize: 1,
      playerTwoSize: 1,
      playerOneSpeedMult: 1,
      playerTwoSpeedMult: 1,
      playerOneShield: false,
      playerTwoShield: false,
      playerOneRocketArmed: false,
      extraPucks: 0,
      activeEffects: [],
      casterMessage: "🪐 MATCH POINT IN STARLIGHT NEBULA — NEXT GOAL WINS!",
    });

    sound.setFastTempo(true);
    gameRefs.autoPilotP1.x = 0.2;
    gameRefs.autoPilotP1.z = -1.95;
    gameRefs.autoPilotP2.x = 0.0;
    gameRefs.autoPilotP2.z = 2.15;

    const puck = getMainPuckBody();
    if (puck) {
      puck.setTranslation({ x: -0.45, y: 0.05, z: 0.25 });
      puck.setLinvel({ x: 3.4, z: -10.5 });
    }
  }, 8100);

  scheduleTrailer(() => {
    const frostSuper = resolveFighterSuperBonus("frost");
    useStore.getState().setPlayerItem("playerOne", {
      status: "ready",
      bonus: frostSuper,
    });
    activatePlayerBonus("playerOne");
    gameRefs.autoPilotP1.x = 0.15;
    gameRefs.autoPilotP1.z = -1.35;
    gameRefs.autoPilotP2.x = -0.95;
    gameRefs.autoPilotP2.z = 2.25;
  }, 8480);

  scheduleTrailer(() => {
    gameRefs.autoPilotP1.x = 0.15;
    gameRefs.autoPilotP1.z = -1.05;
    fireScriptedSuper("frost", {
      puckX: 0.15,
      puckZ: -1.05,
      vx: -0.6,
      vz: 21.5,
      curveSpin: 0,
    });
  }, 9150);

  // ACT 4 (13.6s - 16.6s): "Choose Your Fighter" & Serverless PeerJS Online P2P Room Showcase
  scheduleTrailer(() => {
    clearAllGameTimeouts();
    gameRefs.autoPilotP1.active = false;
    gameRefs.autoPilotP2.active = false;
    gameRefs.forceSetupStep = true;
    gameRefs.rocketFlight = false;
    gameRefs.hitStopUntil = 0;
    gameRefs.timeScale = 1.0;
    sound.stopMusic();

    useStore.setState({
      startGame: false,
      endGame: false,
      isGoalSlowMo: false,
      gameMode: "online",
      onlineRole: "host",
      roomCode: "SMASH",
      onlineConnected: false,
      arena: "cosmos",
      playerOneStriker: "blaze",
    });
  }, 13600);

  scheduleTrailer(() => {
    useStore.getState().setPlayerOneStriker("volt");
    sound.playUiHover();
  }, 14250);

  scheduleTrailer(() => {
    useStore.getState().setPlayerOneStriker("frost");
    sound.playUiHover();
  }, 14850);

  scheduleTrailer(() => {
    useStore.getState().setPlayerOneStriker("venom");
    sound.playUiHover();
  }, 15450);

  scheduleTrailer(() => {
    useStore.getState().setPlayerOneStriker("blaze");
    sound.playUiClick();
  }, 16050);

  scheduleTrailer(() => {
    stopTrailer();
  }, 16600);
}

export function useTrailerDirector() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.__START_TRAILER__ = startTrailer;
    window.__STOP_TRAILER__ = stopTrailer;

    const onKeyDown = (e) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.tagName === "INPUT") return;

      if (e.shiftKey && e.code === "KeyT") {
        e.preventDefault();
        startTrailer();
      } else if (e.code === "Escape" && trailerRunning) {
        stopTrailer();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    const params = new URLSearchParams(window.location.search);
    let armedClick = null;
    if (params.get("trailer") === "1") {
      armedClick = () => {
        window.removeEventListener("pointerdown", armedClick);
        armedClick = null;
        startTrailer();
      };
      window.addEventListener("pointerdown", armedClick, { once: true });
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (armedClick) {
        window.removeEventListener("pointerdown", armedClick);
      }
      stopTrailer();
    };
  }, []);
}
