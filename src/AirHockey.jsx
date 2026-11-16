import React, { useMemo, useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { BackSide } from "three";
import Wall from "./assets/Wall";
import PusherOne from "./assets/PusherOne";
import PusherTwo from "./assets/PusherTwo";
import Palet from "./assets/Palet";
import Goal, { goalListeners } from "./assets/Goal";
import Bonus from "./assets/Bonus";
import { RinkSurface } from "./assets/RinkSurface";
import {
  ImpactParticles,
  toonGradientMap,
  outlineMaterial,
  spawnImpactBurst,
  triggerScreenShake,
} from "./assets/Effects";
import { useStore, gameRefs, registerTimeout } from "./store";
import { physicsWorld } from "./physics2d";
import { activatePlayerBonus } from "./utils";
import { sound } from "./sound";
import { announcer } from "./announcer";
import { profiler } from "./profiler";
import { netState, broadcastHostSnapshot } from "./net";

function CartoonIceWall({ positionZ }) {
  return (
    <group position={[0, 0.24, positionZ]} scale={[1.3, 1, 1]}>
      {[-0.54, -0.18, 0.18, 0.54].map((xOffset, idx) => (
        <group
          key={idx}
          position={[xOffset, (idx % 2) * 0.04, 0]}
          rotation={[0, (idx - 1.5) * 0.08, 0]}>
          <mesh>
            <boxGeometry args={[0.34, 0.44, 0.18]} />
            <meshToonMaterial color="#38bdf8" gradientMap={toonGradientMap} />
          </mesh>
          <mesh scale={[1.08, 1.08, 1.12]} material={outlineMaterial}>
            <boxGeometry args={[0.34, 0.44, 0.18]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function AirHockey(props) {
  const { nodes, materials } = useGLTF("./air-hockey.glb");
  const startGame = useStore((state) => state.startGame);
  const countdown = useStore((state) => state.countdown);
  const extraPucks = useStore((state) => state.extraPucks);
  const playerOneShield = useStore((state) => state.playerOneShield);
  const playerTwoShield = useStore((state) => state.playerTwoShield);
  const prevStartRef = useRef(false);

  // Hook 2D physics callbacks
  useEffect(() => {
    physicsWorld.onGoalCallback = (goalOwnerName, speedKmh) => {
      const listener = goalListeners.get(goalOwnerName);
      if (listener) listener(speedKmh);
    };
    physicsWorld.onWallBounceCallback = () => {
      profiler.recordWallBounce();
    };
    physicsWorld.onRocketFireCallback = (shooterName, x, z, superType = "blaze") => {
      sound.playRocketFire();
      announcer.announceRocketFire(superType);

      const isP1Shooter = shooterName === "pusherOne";
      const targetPlayer = isP1Shooter ? "playerTwo" : "playerOne";
      const s = useStore.getState();

      if (superType === "frost") {
        spawnImpactBurst(x, z, "#38bdf8", 24, 1.8);
        spawnImpactBurst(x, z, "#ffffff", 14, 1.4);
        if (targetPlayer === "playerTwo") s.setPlayerTwoSpeedMult(0.32);
        else s.setPlayerOneSpeedMult(0.32);
        registerTimeout(() => {
          const latest = useStore.getState();
          if (targetPlayer === "playerTwo") latest.setPlayerTwoSpeedMult(1);
          else latest.setPlayerOneSpeedMult(1);
        }, 3000);
      } else if (superType === "volt") {
        spawnImpactBurst(x, z, "#eab308", 22, 1.8);
        spawnImpactBurst(x, z, "#38bdf8", 14, 1.4);
        if (targetPlayer === "playerTwo") s.setPlayerTwoSpeedMult(0.58);
        else s.setPlayerOneSpeedMult(0.58);
        registerTimeout(() => {
          const latest = useStore.getState();
          if (targetPlayer === "playerTwo") latest.setPlayerTwoSpeedMult(1);
          else latest.setPlayerOneSpeedMult(1);
        }, 2000);
      } else if (superType === "venom") {
        spawnImpactBurst(x, z, "#a855f7", 22, 1.8);
        spawnImpactBurst(x, z, "#4ade80", 16, 1.5);
        s.setExtraPucks(Math.min(3, (s.extraPucks || 0) + 1));
        registerTimeout(() => {
          const latest = useStore.getState();
          latest.setExtraPucks(Math.max(0, (latest.extraPucks || 1) - 1));
        }, 4500);
      } else {
        spawnImpactBurst(x, z, "#ff0055", 26, 1.9);
        spawnImpactBurst(x, z, "#fde047", 16, 1.5);
      }

      triggerScreenShake(0.38);
    };
    return () => {
      physicsWorld.onGoalCallback = null;
      physicsWorld.onWallBounceCallback = null;
      physicsWorld.onRocketFireCallback = null;
    };
  }, []);

  // Keyboard Escape / P for Pause
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Escape" || e.code === "KeyP") {
        const target = e.target;
        if (target instanceof HTMLElement && target.tagName === "INPUT") return;
        useStore.getState().togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reset telemetry when match begins (avoid voice clash with 3-2-1-GO!)
  useEffect(() => {
    if (startGame && !prevStartRef.current) {
      profiler.reset();
    }
    prevStartRef.current = startGame;
  }, [startGame]);

  useEffect(() => {
    if (startGame && countdown === "GO!") {
      announcer.announceGo();
    }
  }, [startGame, countdown]);

  // Step 2D physics, profiler & P2P net sync (keep animating during final Sakurai slow-mo)
  useFrame((_, delta) => {
    const store = useStore.getState();
    if (!store.startGame || (store.endGame && !store.isGoalSlowMo) || store.isPaused) return;

    const isGuest = store.gameMode === "online" && store.onlineRole === "guest";
    if (isGuest) return;

    if (
      store.gameMode === "online" &&
      store.onlineRole === "host" &&
      netState.guestInput.bonusRequested
    ) {
      netState.guestInput.bonusRequested = false;
      activatePlayerBonus("playerTwo");
    }

    physicsWorld.step(delta);

    let mainPuck = null;
    gameRefs.pucks.forEach((p) => {
      if (p.isMain) mainPuck = p.body;
    });

    if (!store.reinit && !store.isGoalSlowMo && store.countdown === null && mainPuck) {
      profiler.update(delta);
    }

    if (store.gameMode === "online" && store.onlineRole === "host" && mainPuck) {
      broadcastHostSnapshot({
        p1: [gameRefs.p1Pos.x, gameRefs.p1Pos.z],
        p2: [gameRefs.p2Pos.x, gameRefs.p2Pos.z],
        puck: [mainPuck.x, mainPuck.z, mainPuck.vx, mainPuck.vz],
        s1: store.playerOne,
        s2: store.playerTwo,
        endGame: store.endGame,
        winner: store.winner,
        lastGoalBy: store.lastGoalBy,
        lastGoalSpeed: store.lastGoalSpeed,
      });
    }
  });

  const extraPuckPositions = useMemo(() => {
    if (extraPucks === 0) return [];
    return Array.from({ length: extraPucks }, (_, idx) => [
      (idx - 1) * 1.1 + (Math.random() - 0.5) * 0.3,
      0.05,
      (Math.random() - 0.5) * 1.2,
    ]);
  }, [extraPucks]);

  return (
    <group {...props} dispose={null}>
      {/* RINK WALLS WITH CARTOON OUTLINE */}
      <Wall nodes={nodes.wall} materials={materials.Material} />

      {/* VIBRANT INNER KICKPLATE / BANDE */}
      <mesh geometry={nodes.bande.geometry} position={[0.02, 0.01, 0]}>
        <meshBasicMaterial color={"#fde047"} side={BackSide} />
      </mesh>

      {/* CHUNKY CARTOON ARCADE TABLE CABINET */}
      <group position={[0.02, -0.24, 0]}>
        <mesh>
          <boxGeometry args={[6.18, 0.44, 9.02]} />
          <meshToonMaterial color="#1e293b" gradientMap={toonGradientMap} />
        </mesh>
        <mesh scale={[1.02, 1.06, 1.015]} material={outlineMaterial}>
          <boxGeometry args={[6.18, 0.44, 9.02]} />
        </mesh>
      </group>

      {/* PLAYERS */}
      <PusherOne
        nodes={nodes}
        materials={materials}
        positionPusher={[0, 0.36, -2.1]}
      />
      <PusherTwo
        nodes={nodes}
        materials={materials}
        positionPusher={[0, 0.36, 2.1]}
      />

      {/* PUCKS */}
      <Palet nodes={nodes} initialPos={[0, 0.05, 0]} />
      {extraPuckPositions.map((pos, i) => (
        <Palet key={`extra-${i}`} nodes={nodes} initialPos={pos} isExtra />
      ))}

      {/* CARTOON ICE WALL SHIELDS */}
      {playerOneShield && <CartoonIceWall positionZ={-2.9} />}
      {playerTwoShield && <CartoonIceWall positionZ={2.9} />}

      {/* GOALS */}
      <Goal
        nodes={nodes}
        materials={materials}
        name={"playerOne"}
        position={[0.01, 0.54, 3.18]}
        net={[-0.13, 0.23, 3.38]}
        collider={[0, 0.2, 3.4]}
      />
      <Goal
        nodes={nodes}
        materials={materials}
        name={"playerTwo"}
        position={[0.01, 0.54, -3.18]}
        net={[0.15, 0.23, -3.38]}
        collider={[0, 0.2, -3.4]}
        rotationy={Math.PI}
      />

      {/* MARIO KART ITEM BOX */}
      <Bonus nodes={nodes} />

      {/* REUSABLE INSTANCED IMPACT PARTICLES */}
      <ImpactParticles />

      {/* PROCEDURAL POP-CARTOON RINK SURFACE */}
      <RinkSurface terrainGeometry={nodes.terrain.geometry} />
    </group>
  );
}

useGLTF.preload("./air-hockey.glb");
