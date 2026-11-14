import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import { BackSide } from "three";
import { randFloat } from "three/src/math/MathUtils";
import { collectBonusForPlayer } from "../utils";
import { useStore, gameRefs } from "../store";
import { physicsWorld } from "../physics2d";
import { profiler } from "../profiler";
import {
  toonGradientMap,
  dropShadowMaterial,
  spawnImpactBurst,
} from "./Effects";

const Bonus = ({ nodes }) => {
  const spinGroup = useRef();
  const spawnedRef = useRef(false);
  const spawnElapsedRef = useRef(0);
  const nextDelayRef = useRef(3800);

  const startGame = useStore((state) => state.startGame);
  const endGame = useStore((state) => state.endGame);

  const [bonusPos, setBonusPos] = useState({ x: 0, z: 0 });
  const [spawned, setSpawned] = useState(false);

  const [springs, api] = useSpring(() => ({
    scale: 0,
    config: { mass: 1.1, tension: 260, friction: 14 },
  }));

  useEffect(() => {
    if (!startGame || endGame) {
      spawnedRef.current = false;
      spawnElapsedRef.current = 0;
      nextDelayRef.current = 3800;
      setSpawned(false);
      gameRefs.bonusPos = { active: false, x: 0, z: 0 };
      api.start({ scale: 0 });
    }
  }, [startGame, endGame, api]);

  // Register 2D sensor callback in physicsWorld
  useEffect(() => {
    physicsWorld.onBonusCollectCallback = (otherName) => {
      if (!spawnedRef.current) return;
      const state = useStore.getState();
      if (!state.startGame || state.endGame || state.isPaused || state.isGoalSlowMo) {
        return;
      }

      let collector = null;
      if (otherName === "pusherOne") {
        collector = "playerOne";
      } else if (otherName === "pusherTwo") {
        collector = "playerTwo";
      } else if (otherName === "palet") {
        collector = gameRefs.lastTouchedBy || "playerOne";
      } else {
        return;
      }

      spawnedRef.current = false;
      spawnElapsedRef.current = 0;
      nextDelayRef.current = randFloat(5500, 8800);
      setSpawned(false);
      const { x, z } = gameRefs.bonusPos;
      gameRefs.bonusPos = { active: false, x: 0, z: 0 };
      api.start({ scale: 0 });

      spawnImpactBurst(x, z, "#fde047", 16, 1.2);

      // Single-slot replacement rule: collecting a new item replaces the held slot directly
      if (collector === "playerOne") {
        profiler.recordBonusCollected();
      }
      collectBonusForPlayer(collector);
    };

    return () => {
      physicsWorld.onBonusCollectCallback = null;
    };
  }, [api]);

  useFrame((state, delta) => {
    const store = useStore.getState();

    if (spinGroup.current && spawnedRef.current) {
      if (!store.isPaused) {
        spinGroup.current.rotation.y += 1.8 * delta;
        spinGroup.current.position.y =
          0.04 + Math.sin(state.clock.elapsedTime * 4.0) * 0.06;
      }
      return;
    }

    // Pause-aware item box spawn accumulator
    if (
      store.startGame &&
      !store.endGame &&
      !store.isPaused &&
      !store.isGoalSlowMo &&
      store.countdown === null &&
      !spawnedRef.current
    ) {
      spawnElapsedRef.current += delta * 1000;
      if (spawnElapsedRef.current >= nextDelayRef.current) {
        spawnElapsedRef.current = 0;
        const diff = store.playerOne - store.playerTwo;
        const x = randFloat(-2.1, 2.1);

        let z;
        const r = Math.random();
        if (diff <= -2 && r < 0.7) {
          z = randFloat(-2.3, -0.6);
        } else if (diff >= 2 && r < 0.7) {
          z = randFloat(0.6, 2.3);
        } else {
          z = randFloat(-2.2, 2.2);
        }

        spawnedRef.current = true;
        setBonusPos({ x, z });
        setSpawned(true);
        gameRefs.bonusPos = { active: true, x, z };
        api.start({ scale: 1 });
        spawnImpactBurst(x, z, "#38bdf8", 8, 0.7);
      }
    }
  });

  return (
    <animated.group
      scale={springs.scale}
      position={[bonusPos.x, spawned ? 0 : -2, bonusPos.z]}>
      {/* Cartoon shadow + glowing ring on the ice */}
      <mesh
        position={[0, 0.006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={dropShadowMaterial}>
        <circleGeometry args={[0.26, 24]} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.37, 28]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>

      <group ref={spinGroup}>
        <mesh geometry={nodes.icecube.geometry} position={[0, 0.34, 0]}>
          <meshToonMaterial
            color={"#38bdf8"}
            gradientMap={toonGradientMap}
            transparent
            opacity={0.55}
          />
        </mesh>
        <mesh
          geometry={nodes.icecube.geometry}
          position={[0, 0.34, 0]}
          scale={[1.06, 1.06, 1.06]}>
          <meshBasicMaterial
            color="#0f172a"
            side={BackSide}
            transparent
            opacity={0.7}
          />
        </mesh>
        <mesh
          geometry={nodes["question-bottom"].geometry}
          position={[0, 0.2, 0]}>
          <meshToonMaterial color={"#fde047"} gradientMap={toonGradientMap} />
        </mesh>
        <mesh
          geometry={nodes["question-top"].geometry}
          position={[-0.05, 0.51, 0]}>
          <meshToonMaterial color={"#fde047"} gradientMap={toonGradientMap} />
        </mesh>
      </group>
    </animated.group>
  );
};

export default Bonus;
