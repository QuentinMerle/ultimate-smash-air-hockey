import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toonGradientMap, outlineMaterial } from "./Effects";
import { resolveArenaMeta } from "../data/catalogs";
import { useStore } from "../store";

// Tracks 2.2s goal celebration pulse & which end-zone scored (+1 = +Z cage, -1 = -Z cage)
function useGoalCelebration() {
  const startGame = useStore((s) => s.startGame);
  const isGoalSlowMo = useStore((s) => s.isGoalSlowMo);
  const lastGoalBy = useStore((s) => s.lastGoalBy);
  const endGame = useStore((s) => s.endGame);

  const celebRef = useRef({ until: 0, scoredZSign: 0, allGoals: false });

  useEffect(() => {
    if (!startGame) {
      celebRef.current.until = 0;
      celebRef.current.scoredZSign = 0;
      celebRef.current.allGoals = false;
      return;
    }
    if (isGoalSlowMo) {
      celebRef.current.until = performance.now() + 2200;
      celebRef.current.scoredZSign = lastGoalBy === "playerOne" ? 1 : -1;
      celebRef.current.allGoals = endGame;
    }
  }, [startGame, isGoalSlowMo, lastGoalBy, endGame]);

  return celebRef;
}

// 1. RETRO FORUM '94 (Stadium Bleachers, Reactive NHL Goal Horns & Floodlights)
export function RetroForumArena() {
  const celebRef = useGoalCelebration();
  const bleachersRef = useRef();
  const floodConesRef = useRef([]);

  const negBeaconSpin = useRef();
  const negDomeMat = useRef();
  const negBeamL = useRef();
  const negBeamR = useRef();
  const negHalo = useRef();
  const negHaloMat = useRef();

  const posBeaconSpin = useRef();
  const posDomeMat = useRef();
  const posBeamL = useRef();
  const posBeamR = useRef();
  const posHalo = useRef();
  const posHaloMat = useRef();

  const bleachers = [
    { pos: [0, -0.05, -5.8], size: [8.8, 0.75, 0.9], color: "#1e3a8a" },
    { pos: [0, 0.4, -6.6], size: [9.6, 0.85, 0.9], color: "#172554" },
    { pos: [0, -0.05, 5.8], size: [8.8, 0.75, 0.9], color: "#1e3a8a" },
    { pos: [0, 0.4, 6.6], size: [9.6, 0.85, 0.9], color: "#172554" },
    { pos: [-4.6, -0.05, 0], size: [0.9, 0.75, 9.8], color: "#1e3a8a" },
    { pos: [-5.4, 0.4, 0], size: [0.9, 0.85, 10.8], color: "#172554" },
    { pos: [4.6, -0.05, 0], size: [0.9, 0.75, 9.8], color: "#1e3a8a" },
    { pos: [5.4, 0.4, 0], size: [0.9, 0.85, 10.8], color: "#172554" },
  ];

  const floodlights = [
    [-4.3, 1.3, -4.5],
    [4.3, 1.3, -4.5],
    [-4.3, 1.3, 4.5],
    [4.3, 1.3, 4.5],
  ];

  useFrame((state, delta) => {
    const now = performance.now();
    const c = celebRef.current;
    const active = now < c.until;
    const pulse = active ? 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 28) : 0;

    const negLit = active && (c.allGoals || c.scoredZSign === -1);
    const posLit = active && (c.allGoals || c.scoredZSign === 1);

    const updateSiren = (lit, spin, domeMat, beamL, beamR, halo, haloMat, dir) => {
      if (spin.current) {
        spin.current.rotation.y += delta * (lit ? 18 : 2.2) * dir;
        const s = lit ? 1.18 + pulse * 0.22 : 1;
        spin.current.scale.setScalar(s);
      }
      if (domeMat.current) {
        domeMat.current.color.set(lit ? (pulse > 0.5 ? "#ff0044" : "#fde047") : "#7f1d1d");
      }
      if (beamL.current) beamL.current.visible = lit;
      if (beamR.current) beamR.current.visible = lit;
      if (halo.current && haloMat.current) {
        halo.current.visible = lit;
        halo.current.scale.setScalar(1 + pulse * 0.45);
        haloMat.current.opacity = 0.35 + pulse * 0.5;
      }
    };

    updateSiren(negLit, negBeaconSpin, negDomeMat, negBeamL, negBeamR, negHalo, negHaloMat, 1);
    updateSiren(posLit, posBeaconSpin, posDomeMat, posBeamL, posBeamR, posHalo, posHaloMat, -1);

    if (bleachersRef.current) {
      bleachersRef.current.position.y = active
        ? Math.abs(Math.sin(state.clock.elapsedTime * 19)) * 0.16
        : 0;
    }
    floodConesRef.current.forEach((mat) => {
      if (mat) mat.opacity = active ? 0.08 + pulse * 0.16 : 0.07;
    });
  });

  return (
    <group>
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshBasicMaterial color="#1d2b53" />
      </mesh>
      <mesh position={[0.02, -0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.5, 5.85, 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
      </mesh>

      <group ref={bleachersRef}>
        {bleachers.map((b, i) => (
          <group key={i} position={b.pos}>
            <mesh>
              <boxGeometry args={b.size} />
              <meshToonMaterial color={b.color} gradientMap={toonGradientMap} />
            </mesh>
            <mesh scale={[1.02, 1.06, 1.04]} material={outlineMaterial}>
              <boxGeometry args={b.size} />
            </mesh>
          </group>
        ))}
      </group>

      {floodlights.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, -0.85, 0]}>
            <cylinderGeometry args={[0.14, 0.22, 1.7, 6]} />
            <meshToonMaterial color="#475569" gradientMap={toonGradientMap} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.65, 0.28, 0.35]} />
            <meshBasicMaterial color="#fde047" />
          </mesh>
          <mesh position={[pos[0] > 0 ? -0.4 : 0.4, -0.45, pos[2] > 0 ? -0.4 : 0.4]}>
            <coneGeometry args={[0.9, 1.4, 8, 1, true]} />
            <meshBasicMaterial
              ref={(el) => {
                floodConesRef.current[i] = el;
              }}
              color="#fef08a"
              transparent
              opacity={0.07}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* -Z NHL Goal Siren Beacon & Floor Halo */}
      <group position={[0.02, 0.14, -4.65]}>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.24, 0.3, 0.18, 8]} />
          <meshToonMaterial color="#334155" gradientMap={toonGradientMap} />
        </mesh>
        <group ref={negBeaconSpin}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.34, 8]} />
            <meshBasicMaterial ref={negDomeMat} color="#7f1d1d" />
          </mesh>
          <mesh scale={[1.12, 1.12, 1.12]} position={[0, 0.05, 0]} material={outlineMaterial}>
            <cylinderGeometry args={[0.2, 0.22, 0.34, 8]} />
          </mesh>
          <mesh ref={negBeamL} visible={false} position={[0.95, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.42, 1.65, 10, 1, true]} />
            <meshBasicMaterial color="#ff2a54" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={negBeamR} visible={false} position={[-0.95, 0.08, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.42, 1.65, 10, 1, true]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <mesh ref={negHalo} visible={false} position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 1.25, 24]} />
          <meshBasicMaterial ref={negHaloMat} color="#ff0044" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* +Z NHL Goal Siren Beacon & Floor Halo */}
      <group position={[0.02, 0.14, 4.65]}>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.24, 0.3, 0.18, 8]} />
          <meshToonMaterial color="#334155" gradientMap={toonGradientMap} />
        </mesh>
        <group ref={posBeaconSpin}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.34, 8]} />
            <meshBasicMaterial ref={posDomeMat} color="#7f1d1d" />
          </mesh>
          <mesh scale={[1.12, 1.12, 1.12]} position={[0, 0.05, 0]} material={outlineMaterial}>
            <cylinderGeometry args={[0.2, 0.22, 0.34, 8]} />
          </mesh>
          <mesh ref={posBeamL} visible={false} position={[0.95, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.42, 1.65, 10, 1, true]} />
            <meshBasicMaterial color="#ff2a54" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={posBeamR} visible={false} position={[-0.95, 0.08, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.42, 1.65, 10, 1, true]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <mesh ref={posHalo} visible={false} position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 1.25, 24]} />
          <meshBasicMaterial ref={posHaloMat} color="#ff0044" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// 2. THUNDER DOME (Charged Cyber Turf, Reactive Goal Tesla Coils & Electric Rails)
export function ThunderDomeArena() {
  const celebRef = useGoalCelebration();
  const pulseRef = useRef();
  const negTeslaRef = useRef();
  const negArcRef = useRef();
  const posTeslaRef = useRef();
  const posArcRef = useRef();
  const pylonTopsRef = useRef([]);

  const teslaPositions = [
    [-4.1, 0.25, -4.2],
    [4.1, 0.25, -4.2],
    [-4.1, 0.25, 4.2],
    [4.1, 0.25, 4.2],
    [-4.35, 0.2, -1.6],
    [-4.35, 0.2, 1.6],
    [4.35, 0.2, -1.6],
    [4.35, 0.2, 1.6],
  ];

  useFrame((state, delta) => {
    const now = performance.now();
    const c = celebRef.current;
    const active = now < c.until;
    const pulse = active ? 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 30) : 0;

    if (pulseRef.current) {
      const s = active ? 1.03 + pulse * 0.08 : 1 + Math.sin(state.clock.elapsedTime * 5) * 0.03;
      pulseRef.current.scale.set(s, s, 1);
    }

    const negLit = active && (c.allGoals || c.scoredZSign === -1);
    const posLit = active && (c.allGoals || c.scoredZSign === 1);

    const updateCoil = (lit, ref, arcRef, dir) => {
      if (ref.current) {
        ref.current.rotation.y += delta * (lit ? 22 : 2) * dir;
        ref.current.scale.setScalar(lit ? 1.25 + pulse * 0.35 : 1);
      }
      if (arcRef.current) {
        arcRef.current.visible = lit;
        arcRef.current.scale.set(1 + pulse * 0.7, 1 + pulse * 0.85, 1 + pulse * 0.7);
      }
    };
    updateCoil(negLit, negTeslaRef, negArcRef, 1);
    updateCoil(posLit, posTeslaRef, posArcRef, -1);

    pylonTopsRef.current.forEach((m, idx) => {
      if (!m) return;
      m.rotation.y += delta * (active ? 12 : 1.8);
      m.scale.setScalar(active ? 1.25 + ((idx + Math.round(pulse)) % 2) * 0.28 : 1);
    });
  });

  return (
    <group>
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshBasicMaterial color="#091e1a" />
      </mesh>
      <mesh ref={pulseRef} position={[0.02, -0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.4, 5.75, 6]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.48} />
      </mesh>

      <mesh position={[-4.2, 0.45, 0]}>
        <boxGeometry args={[0.07, 0.07, 8.6]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
      <mesh position={[4.2, 0.45, 0]}>
        <boxGeometry args={[0.07, 0.07, 8.6]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
      <mesh position={[0, 0.45, -4.2]}>
        <boxGeometry args={[8.4, 0.07, 0.07]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>
      <mesh position={[0, 0.45, 4.2]}>
        <boxGeometry args={[8.4, 0.07, 0.07]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>

      {/* Behind-Goal Reactive Tesla Coils */}
      {[
        { z: -4.68, coilRef: negTeslaRef, arcRef: negArcRef },
        { z: 4.68, coilRef: posTeslaRef, arcRef: posArcRef },
      ].map((cfg, idx) => (
        <group key={idx} position={[0, 0.15, cfg.z]}>
          <mesh>
            <cylinderGeometry args={[0.24, 0.34, 0.55, 6]} />
            <meshToonMaterial color="#1e293b" gradientMap={toonGradientMap} />
          </mesh>
          <group ref={cfg.coilRef} position={[0, 0.48, 0]}>
            <mesh>
              <octahedronGeometry args={[0.28, 0]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.38, 0.055, 6, 18]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          </group>
          <mesh ref={cfg.arcRef} visible={false} position={[0, 0.72, 0]}>
            <torusGeometry args={[0.68, 0.06, 6, 20]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {teslaPositions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.34, 1.15, 6]} />
            <meshToonMaterial color="#1e293b" gradientMap={toonGradientMap} />
          </mesh>
          <mesh scale={[1.08, 1.05, 1.08]} material={outlineMaterial}>
            <cylinderGeometry args={[0.2, 0.34, 1.15, 6]} />
          </mesh>
          <mesh
            ref={(el) => {
              pylonTopsRef.current[i] = el;
            }}
            position={[0, 0.62, 0]}>
            <octahedronGeometry args={[0.22, 0]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#4ade80" : "#fde047"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 3. STARLIGHT NEBULA (Zero-G Orbital Stage, Supernova Goal Stargates & Energy Crystals)
export function StarlightNebulaArena() {
  const celebRef = useGoalCelebration();
  const outerRingRef = useRef();
  const innerRingRef = useRef();
  const crystalsRef = useRef();
  const negGateRef = useRef();
  const negPillarRef = useRef();
  const posGateRef = useRef();
  const posPillarRef = useRef();

  const stars = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const angle = (i / 48) * Math.PI * 2 + (i % 3) * 0.4;
      const dist = 6.2 + (i % 7) * 1.4;
      return {
        x: Math.cos(angle) * dist,
        y: -1.8 + ((i * 1.7) % 4.5),
        z: Math.sin(angle) * dist,
        s: 0.08 + (i % 4) * 0.04,
      };
    });
  }, []);

  useFrame((state, delta) => {
    const now = performance.now();
    const c = celebRef.current;
    const active = now < c.until;
    const pulse = active ? 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 22) : 0;
    const boost = active ? 6 : 1;

    if (outerRingRef.current) outerRingRef.current.rotation.z += delta * 0.25 * boost;
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * 0.4 * boost;
    if (crystalsRef.current) {
      crystalsRef.current.rotation.y += delta * 0.18 * boost;
      crystalsRef.current.position.y = active
        ? 0.55 + Math.sin(state.clock.elapsedTime * 8) * 0.22
        : Math.sin(state.clock.elapsedTime * 1.5) * 0.14;
    }

    const negLit = active && (c.allGoals || c.scoredZSign === -1);
    const posLit = active && (c.allGoals || c.scoredZSign === 1);

    const updateGate = (lit, gateRef, pillarRef, dir) => {
      if (gateRef.current) {
        gateRef.current.rotation.z += delta * (lit ? 9.5 : 1.2) * dir;
        gateRef.current.scale.setScalar(lit ? 1.38 + pulse * 0.24 : 1);
      }
      if (pillarRef.current) {
        pillarRef.current.visible = lit;
        pillarRef.current.scale.set(1 + pulse * 0.4, 1 + pulse * 0.35, 1 + pulse * 0.4);
      }
    };
    updateGate(negLit, negGateRef, negPillarRef, 1);
    updateGate(posLit, posGateRef, posPillarRef, -1);
  });

  return (
    <group>
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshBasicMaterial color="#160f29" />
      </mesh>

      <mesh
        ref={outerRingRef}
        position={[0.02, -0.5, 0]}
        rotation={[Math.PI / 2 + 0.06, 0.05, 0]}>
        <torusGeometry args={[6.0, 0.1, 8, 48]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.65} />
      </mesh>
      <mesh
        ref={innerRingRef}
        position={[0.02, -0.35, 0]}
        rotation={[Math.PI / 2 - 0.05, -0.05, 0]}>
        <torusGeometry args={[5.35, 0.07, 8, 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
      </mesh>

      {/* Behind-Goal Reactive Stargate Nova Portals */}
      {[
        { z: -4.68, gateRef: negGateRef, pillarRef: negPillarRef },
        { z: 4.68, gateRef: posGateRef, pillarRef: posPillarRef },
      ].map((cfg, idx) => (
        <group key={idx} position={[0, 0.36, cfg.z]}>
          <group ref={cfg.gateRef}>
            <mesh>
              <torusGeometry args={[0.45, 0.07, 6, 16]} />
              <meshBasicMaterial color="#c084fc" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <octahedronGeometry args={[0.22, 0]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          </group>
          <mesh ref={cfg.pillarRef} visible={false} position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.25, 0.55, 2.4, 12, 1, true]} />
            <meshBasicMaterial color="#f43f5e" transparent opacity={0.48} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      <group ref={crystalsRef}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 6.4, 0.4, Math.sin(a) * 6.4]}>
              <mesh>
                <octahedronGeometry args={[0.38, 0]} />
                <meshToonMaterial
                  color={i % 2 === 0 ? "#f43f5e" : "#38bdf8"}
                  gradientMap={toonGradientMap}
                />
              </mesh>
              <mesh scale={[1.1, 1.1, 1.1]} material={outlineMaterial}>
                <octahedronGeometry args={[0.38, 0]} />
              </mesh>
            </group>
          );
        })}
      </group>

      {stars.map((st, idx) => (
        <mesh key={idx} position={[st.x, st.y, st.z]}>
          <octahedronGeometry args={[st.s, 0]} />
          <meshBasicMaterial color={idx % 3 === 0 ? "#fde047" : "#f8fafc"} />
        </mesh>
      ))}
    </group>
  );
}

export function ArenaEnvironment() {
  const arena = useStore((state) => state.arena);
  const meta = resolveArenaMeta(arena);

  return (
    <>
      <color attach="background" args={[meta.bg]} />
      <fog attach="fog" args={[meta.bg, 16, 32]} />
      {meta.id === "strikers" ? (
        <ThunderDomeArena />
      ) : meta.id === "cosmos" ? (
        <StarlightNebulaArena />
      ) : (
        <RetroForumArena />
      )}
    </>
  );
}
