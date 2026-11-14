import React, { useEffect, useRef, useId } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore, gameRefs } from "../store";
import { Body2D, physicsWorld } from "../physics2d";
import { PUCK_CATALOG } from "../utils";
import { sound } from "../sound";
import { profiler } from "../profiler";
import { netState } from "../net";
import {
  toonGradientMap,
  outlineMaterial,
  dropShadowMaterial,
  spawnImpactBurst,
  triggerScreenShake,
} from "./Effects";

const TRAIL_COUNT = 6;

const Palet = ({ nodes, initialPos = [0, 0.05, 0], isExtra = false }) => {
  const groupRef = useRef();
  const bodyMatRef = useRef();
  const puckId = useId();
  const trailRefs = useRef([]);
  const trailHistory = useRef(
    Array.from({ length: TRAIL_COUNT }, () => ({
      x: initialPos[0],
      z: initialPos[2],
    }))
  );

  const isReinit = useStore((state) => state.reinit);
  const startGame = useStore((state) => state.startGame);
  const endGame = useStore((state) => state.endGame);
  const turboPuck = useStore((state) => state.turboPuck);
  const puckStyle = useStore((state) => state.puckStyle);

  // Create persistent 2D Physics Body
  const bodyRef = useRef(null);
  if (!bodyRef.current) {
    bodyRef.current = new Body2D({
      name: "palet",
      type: "dynamic",
      x: initialPos[0],
      y: 0.05,
      z: initialPos[2],
      radius: 0.25,
      restitution: 0.88,
      damping: 0.05,
    });
  }

  const collisionEnter = (payload) => {
    const otherName = payload?.other?.rigidBodyObject?.name;
    const isPaddle = otherName === "pusherOne" || otherName === "pusherTwo";

    if (otherName === "pusherOne") {
      gameRefs.lastTouchedBy = "playerOne";
      gameRefs.p1Pulse = 1.0;
    } else if (otherName === "pusherTwo") {
      gameRefs.lastTouchedBy = "playerTwo";
      gameRefs.p2Pulse = 1.0;
    }

    const body = bodyRef.current;
    if (startGame && !endGame && body) {
      const speed = Math.hypot(body.vx, body.vz);
      const speedKmh = Math.min(185, Math.max(45, Math.round(48 + speed * 8.2)));
      useStore.getState().recordShotSpeed(speedKmh);

      if (otherName === "pusherOne" && speed > 10.0) {
        profiler.recordHeavyHit();
      }

      sound.playHit(speed, isPaddle);

      if (speed > 3.2 || isPaddle) {
        const sparkColor = gameRefs.rocketFlight
          ? "#ff0055"
          : otherName === "pusherOne"
          ? "#ff2a54"
          : otherName === "pusherTwo"
          ? "#00b4d8"
          : turboPuck
          ? "#ff6b00"
          : "#fde047";
        spawnImpactBurst(
          body.x,
          body.z,
          sparkColor,
          isPaddle ? 10 : 6,
          Math.min(1.4, speed / 9)
        );
      }

      if (speed > 8.5 && isPaddle) {
        triggerScreenShake(0.11);
      }
    }
  };

  bodyRef.current.onCollision = collisionEnter;

  // Register puck in physicsWorld and shared gameRefs
  useEffect(() => {
    const body = bodyRef.current;
    physicsWorld.addPuck(body);
    gameRefs.pucks.set(puckId, { body, isMain: !isExtra });

    if (isExtra) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.6;
      const dirZ = Math.random() > 0.5 ? 1 : -1;
      const speed = 6.0 + Math.random() * 2.5;
      body.setLinvel({
        x: Math.sin(angle) * speed,
        y: 0,
        z: Math.cos(angle) * speed * dirZ,
      });
    }

    return () => {
      physicsWorld.removePuck(body);
      gameRefs.pucks.delete(puckId);
    };
  }, [puckId, isExtra]);

  // Handle reset to center after a goal or during 3-2-1-GO countdown
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || isExtra) return;
    if (useStore.getState().isGoalSlowMo) return;

    if (isReinit) {
      gameRefs.rocketFlight = false;
      body.setLinvel({ x: 0, y: 0, z: 0 });
      body.setTranslation({ x: initialPos[0], y: 0.05, z: initialPos[2] });
      if (groupRef.current) {
        groupRef.current.position.set(initialPos[0], 0.05, initialPos[2]);
      }
      trailHistory.current.forEach((pt) => {
        pt.x = initialPos[0];
        pt.z = initialPos[2];
      });
    } else if (startGame && !endGame) {
      const lastGoalBy = useStore.getState().lastGoalBy;
      const serveZ =
        lastGoalBy === "playerOne"
          ? 3.2
          : lastGoalBy === "playerTwo"
          ? -3.2
          : (Math.random() > 0.5 ? 1 : -1) * 3.0;
      const serveX = (Math.random() - 0.5) * 2.0;
      body.setLinvel({ x: serveX, y: 0, z: serveZ });
      spawnImpactBurst(0, 0, "#fde047", 10, 0.8);
    }
  }, [isReinit, isExtra, initialPos, startGame, endGame]);

  const palette = PUCK_CATALOG[puckStyle] || PUCK_CATALOG.classic;

  // Map 2D physics coordinates onto the 3D mesh group every frame
  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    const store = useStore.getState();

    // Update live rocket material tint if rocket flight is active
    if (bodyMatRef.current) {
      bodyMatRef.current.color.set(
        gameRefs.rocketFlight
          ? "#ff0055"
          : turboPuck
          ? "#ff6b00"
          : isExtra
          ? "#a855f7"
          : palette.main
      );
    }

    if (store.isPaused) {
      return;
    }

    // Online Guest renders Host streamed puck state
    if (store.gameMode === "online" && store.onlineRole === "guest" && !isExtra) {
      const snap = netState.latestSnapshot;
      if (snap && Array.isArray(snap.puck)) {
        body.setTranslation({ x: snap.puck[0], y: 0.05, z: snap.puck[1] });
        body.vx = snap.puck[2] || 0;
        body.vz = snap.puck[3] || 0;
      }
    } else if (!startGame || endGame || (isReinit && !isExtra)) {
      body.setLinvel({ x: 0, y: 0, z: 0 });
    } else {
      const speed = Math.hypot(body.vx, body.vz);
      const maxSpeed = gameRefs.rocketFlight ? 22.5 : turboPuck ? 16.5 : 12.5;
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        body.vx *= scale;
        body.vz *= scale;
      }
    }

    if (!isExtra) {
      gameRefs.mainPuckPos.x = body.x;
      gameRefs.mainPuckPos.z = body.z;
    }

    if (groupRef.current) {
      groupRef.current.position.set(body.x, 0.05, body.z);
    }

    // Update cartoon motion trail positions in world space
    const hist = trailHistory.current;
    for (let i = hist.length - 1; i > 0; i--) {
      hist[i].x = hist[i - 1].x;
      hist[i].z = hist[i - 1].z;
    }
    hist[0].x = body.x;
    hist[0].z = body.z;

    const speed = Math.hypot(body.vx, body.vz);
    const showTrail =
      (speed > 2.2 && startGame && !endGame && !isReinit) || store.isGoalSlowMo;

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const mesh = trailRefs.current[i];
      if (!mesh) continue;
      if (!showTrail) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(hist[i].x - body.x, -0.032, hist[i].z - body.z);
      const ratio = (1 - (i + 1) / (TRAIL_COUNT + 1)) * Math.min(1, speed / 10);
      mesh.scale.setScalar(Math.max(0.01, ratio));
    }
  });

  const mainColor = turboPuck ? "#ff6b00" : isExtra ? "#a855f7" : palette.main;
  const ringColor = turboPuck ? "#fef08a" : isExtra ? "#f3e8ff" : palette.ring;
  const trailColor = turboPuck ? "#ff5500" : isExtra ? "#c084fc" : palette.trail;

  return (
    <group ref={groupRef} position={initialPos}>
      {/* Cartoon drop shadow on the ice surface */}
      <mesh
        position={[0, -0.044, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={dropShadowMaterial}>
        <circleGeometry args={[0.27, 28]} />
      </mesh>

      {/* Motion trail discs on the ice */}
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (trailRefs.current[i] = el)}
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.21, 16]} />
          <meshBasicMaterial
            color={trailColor}
            transparent
            opacity={0.48 - i * 0.07}
          />
        </mesh>
      ))}

      {/* Raised puck group */}
      <group position={[0, 0.032, 0]} scale={[1, 1.55, 1]}>
        <mesh geometry={nodes.palet.geometry}>
          <meshToonMaterial
            ref={bodyMatRef}
            color={mainColor}
            gradientMap={toonGradientMap}
          />
        </mesh>

        <mesh
          geometry={nodes.palet.geometry}
          scale={[1.09, 1.22, 1.09]}
          material={outlineMaterial}
        />

        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.09, 0.18, 28]} />
          <meshBasicMaterial color={ringColor} />
        </mesh>
      </group>
    </group>
  );
};

export default Palet;
