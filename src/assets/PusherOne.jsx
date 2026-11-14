import React, { useRef, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore, gameRefs } from "../store";
import { Body2D, physicsWorld } from "../physics2d";
import { activatePlayerBonus, STRIKER_CATALOG } from "../utils";
import { readGamepadInput } from "../gamepad";
import { netState, sendGuestInput } from "../net";
import {
  toonGradientMap,
  outlineMaterial,
  dropShadowMaterial,
} from "./Effects";

const PUSHER_Y = 0.36;

// Reusable projector from viewport pixel coordinates onto the rink plane (y = 0.3)
const _projVec = new THREE.Vector3();
const _projDir = new THREE.Vector3();

export function projectClientToRink(clientX, clientY, camera, outVec) {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const ndcX = (clientX / w) * 2 - 1;
  const ndcY = -(clientY / h) * 2 + 1;
  _projVec.set(ndcX, ndcY, 0.5).unproject(camera);
  _projDir.copy(_projVec).sub(camera.position).normalize();
  const denom = Math.abs(_projDir.y) > 0.0001 ? _projDir.y : -0.0001;
  const dist = (0.3 - camera.position.y) / denom;
  return outVec.copy(camera.position).add(_projDir.multiplyScalar(dist));
}

// Shared relative thumb-drag tracker so touch devices move paddles by sliding instead of tapping
export function useRinkThumbDrag({ bodyRef, initialPos, onDoubleTap, onMouseClick }) {
  const isTouchRef = useRef(false);
  const usingPointerRef = useRef(true);
  const touchStateRef = useRef({
    active: false,
    pointerId: null,
    clientX: 0,
    clientY: 0,
    needsAnchor: false,
    prevWorldX: 0,
    prevWorldZ: 0,
    targetX: initialPos[0],
    targetZ: initialPos[2],
    lastTapAt: 0,
  });

  useEffect(() => {
    const tState = touchStateRef.current;

    const handlePointerDown = (e) => {
      const targetEl = e.target instanceof Element ? e.target : null;
      if (targetEl && targetEl.closest("button, input, a, dialog")) {
        return;
      }

      if (e.pointerType === "touch") {
        isTouchRef.current = true;
        usingPointerRef.current = true;

        const now = performance.now();
        if (onDoubleTap && now - tState.lastTapAt < 260) {
          onDoubleTap();
          tState.lastTapAt = 0;
        } else {
          tState.lastTapAt = now;
        }

        if (!tState.active) {
          tState.active = true;
          tState.pointerId = e.pointerId;
          tState.clientX = e.clientX;
          tState.clientY = e.clientY;
          tState.needsAnchor = true;
          if (bodyRef.current) {
            tState.targetX = bodyRef.current.x;
            tState.targetZ = bodyRef.current.z;
          }
        }
        return;
      }

      isTouchRef.current = false;
      usingPointerRef.current = true;
      if (e.button === 0 && onMouseClick) {
        onMouseClick();
      }
    };

    const handlePointerMove = (e) => {
      if (e.pointerType === "touch") {
        isTouchRef.current = true;
        usingPointerRef.current = true;
        if (tState.active && e.pointerId === tState.pointerId) {
          tState.clientX = e.clientX;
          tState.clientY = e.clientY;
        }
        return;
      }
      isTouchRef.current = false;
      usingPointerRef.current = true;
    };

    const handlePointerEnd = (e) => {
      if (e.pointerType === "touch" && e.pointerId === tState.pointerId) {
        tState.active = false;
        tState.pointerId = null;
      }
    };

    const handleTouchMovePreventScroll = (e) => {
      const targetEl = e.target instanceof Element ? e.target : null;
      if (targetEl && targetEl.closest("button, input, a, dialog")) return;
      const st = useStore.getState();
      if (st.startGame && !st.endGame && !st.isPaused && e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    window.addEventListener("touchmove", handleTouchMovePreventScroll, { passive: false });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("touchmove", handleTouchMovePreventScroll);
    };
  }, [bodyRef, onDoubleTap, onMouseClick]);

  return { isTouchRef, usingPointerRef, touchStateRef };
}

const PusherOne = ({ nodes, positionPusher }) => {
  const [, getKeys] = useKeyboardControls();
  const groupRef = useRef();
  const visualGroup = useRef();
  const rocketRingRef = useRef();

  const playerOneSize = useStore((state) => state.playerOneSize);
  const playerOneSpeedMult = useStore((state) => state.playerOneSpeedMult);
  const playerOneStriker = useStore((state) => state.playerOneStriker);
  const playerOneRocketArmed = useStore((state) => state.playerOneRocketArmed);
  const startGame = useStore((state) => state.startGame);
  const endGame = useStore((state) => state.endGame);

  const launchPrevRef = useRef(false);

  // Persistent 2D Physics Body
  const bodyRef = useRef(null);
  if (!bodyRef.current) {
    bodyRef.current = new Body2D({
      name: "pusherOne",
      type: "kinematicPosition",
      x: positionPusher[0],
      y: PUSHER_Y,
      z: positionPusher[2],
      radius: 0.33 * playerOneSize,
    });
  }
  bodyRef.current.radius = 0.33 * playerOneSize;

  useEffect(() => {
    const body = bodyRef.current;
    physicsWorld.setPusher("pusherOne", body);
    return () => physicsWorld.removePusher("pusherOne");
  }, []);

  const triggerTouchOrMouseBonus = useRef(() => {
    const st = useStore.getState();
    if (!st.startGame || st.endGame || st.isPaused || st.isGoalSlowMo) return;
    if (st.gameMode === "online" && st.onlineRole === "guest") return;
    activatePlayerBonus("playerOne");
  }).current;

  const { isTouchRef, usingPointerRef, touchStateRef } = useRinkThumbDrag({
    bodyRef,
    initialPos: positionPusher,
    onDoubleTap: triggerTouchOrMouseBonus,
    onMouseClick: triggerTouchOrMouseBonus,
  });

  const vec = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());
  const touchWorldVec = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const currentVec = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const store = useStore.getState();
    const isSideView = store.gameMode === "local";
    const isGuest = store.gameMode === "online" && store.onlineRole === "guest";
    const gp = readGamepadInput(0, isSideView, false);

    // Pause toggle via Xbox Controller Menu/Start button (edge-triggered)
    if (gp.pausePressed && store.startGame && !store.endGame) {
      store.togglePause();
    }

    // Pulse Rocket Armed ring
    if (rocketRingRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 12) * 0.14;
      rocketRingRef.current.scale.set(s, s, 1);
      rocketRingRef.current.rotation.z += delta * 4;
    }

    // Squash & stretch animation when hitting the puck
    if (visualGroup.current) {
      gameRefs.p1Pulse = Math.max(0, (gameRefs.p1Pulse || 0) - delta * 6.5);
      const p = gameRefs.p1Pulse;
      const sx = playerOneSize * (1 + Math.sin(p * Math.PI) * 0.22);
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
      touchStateRef.current.targetX = positionPusher[0];
      touchStateRef.current.targetZ = positionPusher[2];
      touchStateRef.current.needsAnchor = true;
      gameRefs.p1Pos.x = positionPusher[0];
      gameRefs.p1Pos.z = positionPusher[2];
      return;
    }

    if (store.isPaused) {
      return;
    }

    // Online Guest renders Host's streamed Pusher One coordinates
    if (isGuest) {
      const snap = netState.latestSnapshot;
      if (snap && Array.isArray(snap.p1)) {
        body.setTranslation({ x: snap.p1[0], y: PUSHER_Y, z: snap.p1[1] });
        if (groupRef.current) {
          groupRef.current.position.set(snap.p1[0], PUSHER_Y, snap.p1[1]);
        }
        gameRefs.p1Pos.x = snap.p1[0];
        gameRefs.p1Pos.z = snap.p1[1];
      }
      return;
    }

    const { forwardOne, backwardOne, leftwardOne, rightwardOne, launch } = getKeys();
    const arrowActive = forwardOne || backwardOne || leftwardOne || rightwardOne;
    const gpMoveActive = Math.abs(gp.dx) > 0.01 || Math.abs(gp.dz) > 0.01;

    if (arrowActive || gpMoveActive) {
      usingPointerRef.current = false;
    }

    const radius = 0.33 * playerOneSize;
    const maxX = Math.max(0.5, 2.92 - radius);
    const minZ = -4.32 + radius;
    const maxZ = -0.06 - radius;

    let desiredX = body.x;
    let desiredZ = body.z;

    if (gpMoveActive) {
      const padSpeed = 9.5 * playerOneSpeedMult * delta;
      desiredX = body.x + gp.dx * padSpeed;
      desiredZ = body.z + gp.dz * padSpeed;
    } else if (arrowActive) {
      const keySpeed = 9.0 * playerOneSpeedMult * delta;
      if (isSideView) {
        if (forwardOne) desiredX += keySpeed;
        if (backwardOne) desiredX -= keySpeed;
        if (leftwardOne) desiredZ -= keySpeed;
        if (rightwardOne) desiredZ += keySpeed;
      } else {
        if (forwardOne) desiredZ += keySpeed;
        if (backwardOne) desiredZ -= keySpeed;
        if (leftwardOne) desiredX += keySpeed;
        if (rightwardOne) desiredX -= keySpeed;
      }
    } else if (usingPointerRef.current && isTouchRef.current) {
      const ts = touchStateRef.current;
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
      desiredX = ts.targetX;
      desiredZ = ts.targetZ;
    } else if (usingPointerRef.current) {
      vec.current.set(state.mouse.x, state.mouse.y, 0.5);
      vec.current.unproject(state.camera);
      dir.current.copy(vec.current).sub(state.camera.position).normalize();
      const distance = (0.3 - state.camera.position.y) / dir.current.y;
      pos.current
        .copy(state.camera.position)
        .add(dir.current.multiplyScalar(distance));

      desiredX = pos.current.x;
      desiredZ = pos.current.z;
    }

    const clampedX = Math.max(-maxX, Math.min(maxX, desiredX));
    const clampedZ = Math.max(minZ, Math.min(maxZ, desiredZ));

    targetPos.current.set(clampedX, PUSHER_Y, clampedZ);
    currentVec.current.set(body.x, PUSHER_Y, body.z);

    const lerpFactor =
      gpMoveActive || arrowActive
        ? 1
        : isTouchRef.current
        ? Math.min(1, 26 * playerOneSpeedMult * delta)
        : Math.min(1, 18 * playerOneSpeedMult * delta);
    currentVec.current.lerp(targetPos.current, lerpFactor);

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

    gameRefs.p1Pos.x = currentVec.current.x;
    gameRefs.p1Pos.z = currentVec.current.z;

    const launchEdge = launch && !launchPrevRef.current;
    launchPrevRef.current = launch;
    if (launchEdge || gp.actionPressed) {
      activatePlayerBonus("playerOne");
    }
  });

  const striker = STRIKER_CATALOG[playerOneStriker] || STRIKER_CATALOG.blaze;
  const isFrozen = playerOneSpeedMult < 0.5;
  const isShrunk = playerOneSize < 1;
  const mainColor = isFrozen ? "#38bdf8" : isShrunk ? "#fb923c" : striker.color;
  const ringColor = isFrozen
    ? "#bae6fd"
    : playerOneRocketArmed
    ? "#ff0055"
    : playerOneSize > 1
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
        scale={[playerOneSize, playerOneSize, 1]}
        material={dropShadowMaterial}>
        <circleGeometry args={[0.37, 32]} />
      </mesh>

      {/* Rocket Puck Armed Aura */}
      {playerOneRocketArmed && (
        <mesh
          ref={rocketRingRef}
          position={[0, -0.34, 0]}
          rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.52, 8]} />
          <meshBasicMaterial color="#ff0055" />
        </mesh>
      )}

      <group ref={visualGroup} scale={[playerOneSize, 1, playerOneSize]}>
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

export default PusherOne;
