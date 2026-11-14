import React, { useRef, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { activatePlayerBonus, STRIKER_CATALOG } from "../utils";
import { useStore, gameRefs, registerTimeout } from "../store";
import { Body2D, physicsWorld } from "../physics2d";
import { readGamepadInput } from "../gamepad";
import { netState, sendGuestInput } from "../net";
import { projectClientToRink, useRinkThumbDrag } from "./PusherOne";
import {
  toonGradientMap,
  outlineMaterial,
  dropShadowMaterial,
} from "./Effects";

const PUSHER_Y = 0.36;

const DIFFICULTY_PRESETS = {
  easy: {
    maxSpeed: 3.6,
    lerpSpeed: 4.0,
    aimJitter: 0.45,
    minAttackZ: 1.0,
    predictShots: false,
  },
  medium: {
    maxSpeed: 5.5,
    lerpSpeed: 6.0,
    aimJitter: 0.28,
    minAttackZ: 0.65,
    predictShots: false,
  },
  hard: {
    maxSpeed: 8.6,
    lerpSpeed: 9.5,
    aimJitter: 0.1,
    minAttackZ: 0.4,
    predictShots: true,
  },
};

const PusherTwo = ({ nodes, positionPusher }) => {
  const [, getKeys] = useKeyboardControls();
  const groupRef = useRef();
  const visualGroup = useRef();
  const rocketRingRef = useRef();

  const playerTwoSize = useStore((state) => state.playerTwoSize);
  const playerTwoSpeedMult = useStore((state) => state.playerTwoSpeedMult);
  const playerTwoStriker = useStore((state) => state.playerTwoStriker);
  const playerTwoRocketArmed = useStore((state) => state.playerTwoRocketArmed);
  const playerTwoItem = useStore((state) => state.playerTwoItem);
  const gameMode = useStore((state) => state.gameMode);
  const aiDifficulty = useStore((state) => state.aiDifficulty);
  const startGame = useStore((state) => state.startGame);
  const endGame = useStore((state) => state.endGame);

  // Persistent 2D Physics Body
  const bodyRef = useRef(null);
  if (!bodyRef.current) {
    bodyRef.current = new Body2D({
      name: "pusherTwo",
      type: "kinematicPosition",
      x: positionPusher[0],
      y: PUSHER_Y,
      z: positionPusher[2],
      radius: 0.33 * playerTwoSize,
    });
  }
  bodyRef.current.radius = 0.33 * playerTwoSize;

  useEffect(() => {
    const body = bodyRef.current;
    physicsWorld.setPusher("pusherTwo", body);
    return () => physicsWorld.removePusher("pusherTwo");
  }, []);

  const currentVec = useRef(new THREE.Vector3());
  const targetVec = useRef(new THREE.Vector3());
  const stepVec = useRef(new THREE.Vector3());
  const rayVec = useRef(new THREE.Vector3());
  const rayDir = useRef(new THREE.Vector3());
  const rayPos = useRef(new THREE.Vector3());
  const touchWorldVec = useRef(new THREE.Vector3());
  const retreatUntil = useRef(0);
  const jitterOffset = useRef(0);
  const lastJitterTime = useRef(0);

  const triggerGuestBonus = useRef(() => {
    const st = useStore.getState();
    if (!st.startGame || st.endGame || st.isPaused || st.isGoalSlowMo) return;
    if (st.gameMode === "online" && st.onlineRole === "guest") {
      sendGuestInput(bodyRef.current?.x || 0, bodyRef.current?.z || 2.1, true);
    }
  }).current;

  const {
    isTouchRef: guestIsTouchRef,
    touchStateRef: guestTouchRef,
  } = useRinkThumbDrag({
    bodyRef,
    initialPos: positionPusher,
    onDoubleTap: triggerGuestBonus,
    onMouseClick: triggerGuestBonus,
  });

  useEffect(() => {
    if (
      gameMode === "ai" &&
      playerTwoItem.status === "ready" &&
      playerTwoItem.bonus
    ) {
      const delay = 900 + Math.random() * 1200;
      registerTimeout(() => {
        activatePlayerBonus("playerTwo");
      }, delay);
    }
  }, [gameMode, playerTwoItem]);

  useFrame((state, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const store = useStore.getState();

    // Pulse Rocket Armed ring
    if (rocketRingRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 12) * 0.14;
      rocketRingRef.current.scale.set(s, s, 1);
      rocketRingRef.current.rotation.z -= delta * 4;
    }

    // Squash & stretch animation on hit
    if (visualGroup.current) {
      gameRefs.p2Pulse = Math.max(0, (gameRefs.p2Pulse || 0) - delta * 6.5);
      const p = gameRefs.p2Pulse;
      const sx = playerTwoSize * (1 + Math.sin(p * Math.PI) * 0.22);
      const sy = 1 - Math.sin(p * Math.PI) * 0.18;
      visualGroup.current.scale.set(sx, sy, sx);
    }

    if (!startGame || endGame) {
      body.setTranslation({
        x: positionPusher[0],
        y: PUSHER_Y,
        z: positionPusher[2],
      });
      if (groupRef.current) {
        groupRef.current.position.set(
          positionPusher[0],
          PUSHER_Y,
          positionPusher[2]
        );
      }
      guestTouchRef.current.targetX = positionPusher[0];
      guestTouchRef.current.targetZ = positionPusher[2];
      guestTouchRef.current.needsAnchor = true;
      gameRefs.p2Pos.x = positionPusher[0];
      gameRefs.p2Pos.z = positionPusher[2];
      return;
    }

    if (store.isPaused) {
      return;
    }

    const radius = 0.33 * playerTwoSize;
    const maxX = Math.max(0.5, 2.92 - radius);
    const minZ = 0.06 + radius;
    const maxZ = 4.32 - radius;

    currentVec.current.set(body.x, PUSHER_Y, body.z);

    // 1. ONLINE MODE
    if (store.gameMode === "online") {
      if (store.onlineRole === "guest") {
        // Guest directly controls PusherTwo from +Z mirrored perspective
        const gp = readGamepadInput(0, false, true);
        const { forwardOne, backwardOne, leftwardOne, rightwardOne, launch } = getKeys();
        const arrowActive = forwardOne || backwardOne || leftwardOne || rightwardOne;
        const gpMove = Math.abs(gp.dx) > 0.01 || Math.abs(gp.dz) > 0.01;

        let nextX = body.x;
        let nextZ = body.z;

        if (gpMove) {
          const speed = 9.5 * playerTwoSpeedMult * delta;
          nextX += gp.dx * speed;
          nextZ += gp.dz * speed;
        } else if (arrowActive) {
          const speed = 9.0 * playerTwoSpeedMult * delta;
          if (forwardOne) nextZ -= speed;
          if (backwardOne) nextZ += speed;
          if (leftwardOne) nextX -= speed;
          if (rightwardOne) nextX += speed;
        } else if (guestIsTouchRef.current) {
          const ts = guestTouchRef.current;
          if (ts.active) {
            projectClientToRink(ts.clientX, ts.clientY, state.camera, touchWorldVec.current);
            if (ts.needsAnchor) {
              ts.prevWorldX = touchWorldVec.current.x;
              ts.prevWorldZ = touchWorldVec.current.z;
              ts.targetX = body.x;
              ts.targetZ = body.z;
              ts.needsAnchor = false;
            } else {
              const dx = (touchWorldVec.current.x - ts.prevWorldX) * 1.25;
              const dz = (touchWorldVec.current.z - ts.prevWorldZ) * 1.25;
              ts.targetX = Math.max(-maxX, Math.min(maxX, ts.targetX + dx));
              ts.targetZ = Math.max(minZ, Math.min(maxZ, ts.targetZ + dz));
              ts.prevWorldX = touchWorldVec.current.x;
              ts.prevWorldZ = touchWorldVec.current.z;
            }
          }
          nextX = ts.targetX;
          nextZ = ts.targetZ;
        } else {
          rayVec.current.set(state.mouse.x, state.mouse.y, 0.5);
          rayVec.current.unproject(state.camera);
          rayDir.current.copy(rayVec.current).sub(state.camera.position).normalize();
          const distance = (0.3 - state.camera.position.y) / rayDir.current.y;
          rayPos.current
            .copy(state.camera.position)
            .add(rayDir.current.multiplyScalar(distance));
          nextX = rayPos.current.x;
          nextZ = rayPos.current.z;
        }

        nextX = Math.max(-maxX, Math.min(maxX, nextX));
        nextZ = Math.max(minZ, Math.min(maxZ, nextZ));

        targetVec.current.set(nextX, PUSHER_Y, nextZ);
        const lerpF =
          gpMove || arrowActive
            ? 1
            : guestIsTouchRef.current
            ? Math.min(1, 26 * playerTwoSpeedMult * delta)
            : Math.min(1, 18 * playerTwoSpeedMult * delta);
        currentVec.current.lerp(targetVec.current, lerpF);

        body.setTranslation({
          x: currentVec.current.x,
          y: PUSHER_Y,
          z: currentVec.current.z,
        });
        if (groupRef.current) {
          groupRef.current.position.set(
            currentVec.current.x,
            PUSHER_Y,
            currentVec.current.z
          );
        }
        sendGuestInput(
          currentVec.current.x,
          currentVec.current.z,
          Boolean(launch || gp.actionPressed)
        );
        return;
      }

      // Host receives Guest coordinates for PusherTwo
      const snapX = netState.guestInput?.x ?? positionPusher[0];
      const snapZ = netState.guestInput?.z ?? positionPusher[2];
      const clampedX = Math.max(-maxX, Math.min(maxX, snapX));
      const clampedZ = Math.max(minZ, Math.min(maxZ, snapZ));
      targetVec.current.set(clampedX, PUSHER_Y, clampedZ);
      currentVec.current.lerp(targetVec.current, Math.min(1, 22 * delta));

      body.setNextKinematicTranslation({
        x: currentVec.current.x,
        y: PUSHER_Y,
        z: currentVec.current.z,
      });
      if (groupRef.current) {
        groupRef.current.position.set(
          currentVec.current.x,
          PUSHER_Y,
          currentVec.current.z
        );
      }
      gameRefs.p2Pos.x = currentVec.current.x;
      gameRefs.p2Pos.z = currentVec.current.z;
      return;
    }

    // 2. LOCAL 2P MODE (Side-View Camera at [-9.4, 7.4, 0]: W=+X, S=-X, A=-Z, D=+Z)
    if (gameMode === "local") {
      const { forwardTwo, backwardTwo, leftwardTwo, rightwardTwo, bonusTwo } =
        getKeys();
      const gp2 = readGamepadInput(1, true, false);
      const moveSpeed = 8.4 * playerTwoSpeedMult * delta;
      let nextX = body.x;
      let nextZ = body.z;

      if (Math.abs(gp2.dx) > 0.01 || Math.abs(gp2.dz) > 0.01) {
        nextX += gp2.dx * moveSpeed;
        nextZ += gp2.dz * moveSpeed;
      } else {
        if (forwardTwo) nextX += moveSpeed;
        if (backwardTwo) nextX -= moveSpeed;
        if (leftwardTwo) nextZ -= moveSpeed;
        if (rightwardTwo) nextZ += moveSpeed;
      }

      nextX = Math.max(-maxX, Math.min(maxX, nextX));
      nextZ = Math.max(minZ, Math.min(maxZ, nextZ));

      body.setNextKinematicTranslation({
        x: nextX,
        y: PUSHER_Y,
        z: nextZ,
      });

      if (groupRef.current) {
        groupRef.current.position.set(nextX, PUSHER_Y, nextZ);
      }

      gameRefs.p2Pos.x = nextX;
      gameRefs.p2Pos.z = nextZ;

      if (bonusTwo || gp2.actionPressed) {
        activatePlayerBonus("playerTwo");
      }
      return;
    }

    // 3. AI OPPONENT MODE
    const preset =
      DIFFICULTY_PRESETS[aiDifficulty] || DIFFICULTY_PRESETS.medium;
    const now = state.clock.elapsedTime;

    if (now - lastJitterTime.current > 0.7) {
      lastJitterTime.current = now;
      jitterOffset.current = (Math.random() - 0.5) * 2 * preset.aimJitter;
    }

    let bestPuck = null;
    let bestScore = -Infinity;

    gameRefs.pucks.forEach(({ body: puckBody }) => {
      if (!puckBody) return;
      const p = puckBody.translation();
      const v = puckBody.linvel();
      let threat = 0;

      if (p.z > -0.2) threat += 20;
      if (v.z > 0.3) threat += v.z * 5 + (p.z + 4) * 2;
      if (p.z > 0 && p.z < 3.0) threat += 15;

      if (threat > bestScore) {
        bestScore = threat;
        bestPuck = { pos: p, vel: v };
      }
    });

    let targetX = 0;
    let targetZ = 2.4;

    if (bestPuck) {
      const { pos: p, vel: v } = bestPuck;
      const puckSpeed = Math.hypot(v.x, v.z);

      const canGrabBonus =
        gameRefs.bonusPos.active &&
        gameRefs.bonusPos.z > 0.35 &&
        playerTwoItem.status === "none" &&
        (p.z < -0.3 || v.z < 1.5);

      if (canGrabBonus) {
        targetX = gameRefs.bonusPos.x;
        targetZ = gameRefs.bonusPos.z;
      } else if (now < retreatUntil.current) {
        targetX = THREE.MathUtils.clamp(p.x * 0.4, -1.1, 1.1);
        targetZ = 2.25;
      } else if (p.z < -0.15 && v.z <= 1.8) {
        targetX = THREE.MathUtils.clamp(
          p.x * 0.4 + jitterOffset.current,
          -1.0,
          1.0
        );
        targetZ = 2.15;
      } else if (p.z > 3.05) {
        if (Math.abs(p.x) > 1.05 && puckSpeed < 2.5) {
          targetX = p.x;
          targetZ = Math.min(maxZ, p.z + 0.25);
        } else {
          targetX = THREE.MathUtils.clamp(p.x, -1.1, 1.1);
          targetZ = 2.45;
        }
      } else if (preset.predictShots && v.z > 4.2 && p.z > -0.8 && p.z < body.z - 0.1) {
        const timeToReach = Math.max(0, (2.15 - p.z) / v.z);
        let predictedX = p.x + v.x * timeToReach + jitterOffset.current;
        const wallLimit = 2.68;
        if (predictedX > wallLimit) {
          predictedX = wallLimit - (predictedX - wallLimit);
        } else if (predictedX < -wallLimit) {
          predictedX = -wallLimit - (predictedX + wallLimit);
        }
        targetX = THREE.MathUtils.clamp(predictedX, -1.8, 1.8);
        targetZ = 2.1;
      } else {
        const goalDirX = 0 - p.x;
        const goalDirZ = -3.4 - p.z;
        const len = Math.hypot(goalDirX, goalDirZ) || 1;
        const normX = goalDirX / len;
        const normZ = goalDirZ / len;

        targetX = p.x + normX * 0.18 + jitterOffset.current;
        targetZ = Math.max(preset.minAttackZ, p.z + normZ * 0.18);

        if (body.z > 3.0 && Math.abs(body.x) < 1.15) {
          targetX = body.x >= 0 ? 1.4 : -1.4;
        }

        const distToPuck = Math.hypot(body.x - p.x, body.z - p.z);
        if (distToPuck < radius + 0.32) {
          retreatUntil.current = now + 0.45;
        }
      }
    }

    targetX = Math.max(-maxX, Math.min(maxX, targetX));
    targetZ = Math.max(minZ, Math.min(maxZ, targetZ));
    targetVec.current.set(targetX, PUSHER_Y, targetZ);

    const effectiveMaxSpeed = preset.maxSpeed * playerTwoSpeedMult;
    stepVec.current.copy(targetVec.current).sub(currentVec.current);
    const dist = stepVec.current.length();
    const maxStep = effectiveMaxSpeed * delta;

    if (dist > maxStep && dist > 0.0001) {
      stepVec.current.multiplyScalar(maxStep / dist);
      currentVec.current.add(stepVec.current);
    } else {
      const lerpFactor = Math.min(
        1,
        preset.lerpSpeed * playerTwoSpeedMult * delta
      );
      currentVec.current.lerp(targetVec.current, lerpFactor);
    }

    body.setNextKinematicTranslation({
      x: currentVec.current.x,
      y: PUSHER_Y,
      z: currentVec.current.z,
    });

    if (groupRef.current) {
      groupRef.current.position.set(
        currentVec.current.x,
        PUSHER_Y,
        currentVec.current.z
      );
    }

    gameRefs.p2Pos.x = currentVec.current.x;
    gameRefs.p2Pos.z = currentVec.current.z;
  });

  const striker = STRIKER_CATALOG[playerTwoStriker] || STRIKER_CATALOG.frost;
  const isFrozen = playerTwoSpeedMult < 0.5;
  const isShrunk = playerTwoSize < 1;
  const mainColor = isFrozen ? "#93c5fd" : isShrunk ? "#facc15" : striker.color;
  const ringColor = isFrozen
    ? "#e0f2fe"
    : playerTwoRocketArmed
    ? "#ff0055"
    : playerTwoSize > 1
    ? "#fde047"
    : striker.ring;

  return (
    <group
      ref={groupRef}
      position={[positionPusher[0], PUSHER_Y, positionPusher[2]]}>
      {/* Crisp cartoon drop-shadow on the ice */}
      <mesh
        position={[0, -0.354, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[playerTwoSize, playerTwoSize, 1]}
        material={dropShadowMaterial}>
        <circleGeometry args={[0.37, 32]} />
      </mesh>

      {/* Rocket Puck Armed Aura */}
      {playerTwoRocketArmed && (
        <mesh
          ref={rocketRingRef}
          position={[0, -0.34, 0]}
          rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.52, 8]} />
          <meshBasicMaterial color="#ff0055" />
        </mesh>
      )}

      <group ref={visualGroup} scale={[playerTwoSize, 1, playerTwoSize]}>
        <mesh geometry={nodes.pusher.geometry}>
          <meshToonMaterial color={mainColor} gradientMap={toonGradientMap} />
        </mesh>

        <mesh
          geometry={nodes.pusher.geometry}
          scale={[1.07, 1.06, 1.07]}
          material={outlineMaterial}
        />

        {nodes["pusher-light"] && (
          <mesh
            geometry={nodes["pusher-light"].geometry}
            position={[0, -0.26, 0]}>
            <meshBasicMaterial color={ringColor} />
          </mesh>
        )}
      </group>
    </group>
  );
};

export default PusherTwo;
