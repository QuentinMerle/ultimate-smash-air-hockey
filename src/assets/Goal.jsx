import React, { useState, useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useStore, gameRefs, registerTimeout } from "../store";
import { announcer } from "../announcer";
import {
  toonGradientMap,
  outlineMaterial,
  spawnImpactBurst,
  triggerScreenShake,
} from "./Effects";

// Registry so physicsWorld.onGoalCallback can notify the matching Goal component
export const goalListeners = new Map();

function createOrganicNetTexture(accentColor) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);

  // Diagonal woven nylon mesh cords (outline + bright core cord)
  const step = 32;
  const drawWeave = (strokeStyle, lineWidth) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    for (let offset = -size; offset <= size * 2; offset += step) {
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + size, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset - size, size);
      ctx.stroke();
    }
  };

  drawWeave("#0f172a", 7);
  drawWeave(accentColor, 4.2);
  drawWeave("#f8fafc", 2.1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.needsUpdate = true;
  return texture;
}

const Goal = ({ nodes, name, position, net, collider, rotationy }) => {
  const [intersecting, setIntersection] = useState(false);
  const [goalSpeed, setGoalSpeed] = useState(98);
  const lastGoalRef = useRef(0);
  const netSpringRef = useRef({ disp: 0, vel: 0, phase: 0 });
  const goalTextRef = useRef(null);
  const textPopRef = useRef(0);

  const startGame = useStore((state) => state.startGame);
  const isGoalSlowMo = useStore((state) => state.isGoalSlowMo);
  const gameMode = useStore((state) => state.gameMode);
  const onlineRole = useStore((state) => state.onlineRole);
  const addScore = useStore((state) => state.increaseScore);
  const reinit = useStore((state) => state.reinitPosition);

  const frameColor = name === "playerOne" ? "#00b4d8" : "#ff2a54";
  const celebrationColor = name === "playerOne" ? "#ff2a54" : "#00b4d8";

  const netTexture = useMemo(() => createOrganicNetTexture(frameColor), [frameColor]);

  // Clone net geometry per Goal instance so dynamic spring billowing stays isolated
  const { netGeo, basePos, radialDirs, flexWeights } = useMemo(() => {
    const cloned = nodes.net.geometry.clone();
    const posAttr = cloned.attributes.position;
    if (!posAttr) {
      return { netGeo: cloned, basePos: null, radialDirs: null, flexWeights: null };
    }
    const base = new Float32Array(posAttr.array);
    const count = posAttr.count;
    const dirs = new Float32Array(base.length);
    const weights = new Float32Array(count);

    let minY = Infinity;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      cx += x;
      cy += y;
      cz += z;
      if (y < minY) minY = y;
    }
    cx /= Math.max(1, count);
    cy /= Math.max(1, count);
    cz /= Math.max(1, count);

    for (let i = 0; i < count; i++) {
      const dx = base[i * 3] - cx;
      const dy = base[i * 3 + 1] - cy;
      const dz = base[i * 3 + 2] - cz;
      const len = Math.hypot(dx, dy, dz) || 1;
      dirs[i * 3] = dx / len;
      dirs[i * 3 + 1] = dy / len;
      dirs[i * 3 + 2] = dz / len;

      // Pin bottom edge close to ice and allow mid/back cords to billow freely
      const heightRatio = Math.min(1, Math.max(0, (base[i * 3 + 1] - minY) / 0.35));
      weights[i] = heightRatio * 0.85 + 0.15;
    }

    return { netGeo: cloned, basePos: base, radialDirs: dirs, flexWeights: weights };
  }, [nodes.net.geometry]);

  useEffect(() => {
    return () => {
      netTexture.dispose();
      netGeo.dispose();
    };
  }, [netTexture, netGeo]);

  useEffect(() => {
    if (!isGoalSlowMo || !startGame) {
      setIntersection(false);
    }
  }, [isGoalSlowMo, startGame]);

  // Spring-damped organic nylon net deformation + subtle idle air-cushion ripple
  useFrame((_, delta) => {
    if (!basePos || !radialDirs || !flexWeights) return;
    const posAttr = netGeo.attributes.position;
    if (!posAttr) return;

    const sp = netSpringRef.current;
    const dt = Math.min(delta, 0.05);
    sp.phase += dt * 4.5;

    // Spring-damper physics for goal bulge
    const stiffness = 140;
    const damping = 7.5;
    const accel = -stiffness * sp.disp - damping * sp.vel;
    sp.vel += accel * dt;
    sp.disp += sp.vel * dt;

    const arr = posAttr.array;
    const bulgeAmp = sp.disp * 0.28;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const w = flexWeights[i];
      const ripple =
        Math.sin(sp.phase + basePos[idx] * 5.0 + basePos[idx + 2] * 4.0) *
        (0.006 + Math.abs(sp.disp) * 0.025);
      const offset = (bulgeAmp + ripple) * w;

      arr[idx] = basePos[idx] + radialDirs[idx] * offset;
      arr[idx + 1] = basePos[idx + 1] + radialDirs[idx + 1] * offset * 0.45;
      arr[idx + 2] = basePos[idx + 2] + radialDirs[idx + 2] * offset;
    }
    posAttr.needsUpdate = true;

    // Elastic pop + gentle micro-shake on 3D GOAL! billboard
    if (goalTextRef.current) {
      if (intersecting) {
        textPopRef.current += dt;
        const t = textPopRef.current;
        const s =
          t < 0.16
            ? 0.25 + (t / 0.16) * 0.96
            : 1 + Math.exp(-(t - 0.16) * 8) * Math.cos((t - 0.16) * 26) * 0.18;
        goalTextRef.current.scale.setScalar(s);
        goalTextRef.current.position.x =
          Math.sin(t * 36) * 0.07 * Math.exp(-t * 3.5);
      } else {
        textPopRef.current = 0;
        goalTextRef.current.scale.setScalar(1);
        goalTextRef.current.position.x = 0;
      }
    }
  });

  useEffect(() => {
    const handleGoal = (speedKmh = 98) => {
      const now = performance.now();
      if (now - lastGoalRef.current < 1050) return;
      lastGoalRef.current = now;

      const state = useStore.getState();
      if (!state.startGame || state.endGame || state.isGoalSlowMo) return;

      gameRefs.rocketFlight = false;
      gameRefs.curveSpin = 0;
      gameRefs.hitStopUntil = now + 115; // Sakurai impact freeze frame
      gameRefs.timeScale = 0.16; // Masahiro Sakurai KO Slow-Mo

      netSpringRef.current.vel = 15; // Organic net billows dynamically!
      textPopRef.current = 0;

      setGoalSpeed(speedKmh);
      setIntersection(true);
      addScore(name, speedKmh);
      state.setGoalSlowMo(true);

      announcer.announceGoal(name, speedKmh);

      spawnImpactBurst(0, collider[2] * 0.85, celebrationColor, 26, 1.85);
      spawnImpactBurst(0, collider[2] * 0.85, "#fde047", 18, 1.5);
      spawnImpactBurst(0, collider[2] * 0.85, "#ffffff", 12, 1.2);
      triggerScreenShake(0.24);

      // Keep slow-mo for ~950ms so player savors the net ripple & pop, then snap puck cleanly
      registerTimeout(() => {
        gameRefs.timeScale = 1.0;
        const latest = useStore.getState();
        latest.setGoalSlowMo(false);
        setIntersection(false);
        if (!latest.startGame || latest.endGame) return;

        reinit(true);
        registerTimeout(() => {
          reinit(false);
        }, 65);
      }, 950);
    };

    goalListeners.set(name, handleGoal);
    return () => goalListeners.delete(name);
  }, [name, collider, celebrationColor, addScore, reinit]);

  const textRotation =
    gameMode === "local"
      ? [0.35, -Math.PI / 2, 0]
      : gameMode === "online" && onlineRole === "guest"
      ? [0.35, 0, 0]
      : [0.35, Math.PI, 0];

  return (
    <>
      <group scale={[1.35, 1, 1]}>
        <group position={position} rotation-y={rotationy}>
          <mesh geometry={nodes.goal.geometry}>
            <meshToonMaterial color={frameColor} gradientMap={toonGradientMap} />
          </mesh>
          <mesh
            geometry={nodes.goal.geometry}
            scale={[1.05, 1.05, 1.05]}
            material={outlineMaterial}
          />
        </group>
        <mesh geometry={netGeo} position={net} rotation-y={rotationy}>
          <meshBasicMaterial
            map={netTexture}
            transparent
            opacity={0.94}
            alphaTest={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      <Text
        ref={goalTextRef}
        visible={intersecting && isGoalSlowMo && startGame}
        color={celebrationColor}
        outlineWidth={0.09}
        outlineColor="#0f172a"
        position={[0, 1.58, 0]}
        rotation={textRotation}
        font="./russo-one-v14-latin-regular.woff"
        fontSize={1.32}
        textAlign="center"
        anchorX="center"
        anchorY="middle">
        {`GOAL!\n${goalSpeed} KM/H`}
      </Text>
    </>
  );
};

export default Goal;
