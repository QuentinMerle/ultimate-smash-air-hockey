import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gameRefs } from "../store";

// Shared 4-tone Cel-Shading GradientMap for crisp Pop-Cartoon lighting
export const toonGradientMap = (() => {
  const colors = new Uint8Array([
    85, 85, 100, 255,
    155, 155, 170, 255,
    220, 220, 230, 255,
    255, 255, 255, 255,
  ]);
  const texture = new THREE.DataTexture(colors, 4, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

// Shared reusable materials for cartoon ink outlines & drop shadows (reduces draw state switches)
export const outlineMaterial = new THREE.MeshBasicMaterial({
  color: "#0f172a",
  side: THREE.BackSide,
});

export const dropShadowMaterial = new THREE.MeshBasicMaterial({
  color: "#0f172a",
  transparent: true,
  opacity: 0.32,
});

const MAX_PARTICLES = 64;
const particlePool = Array.from({ length: MAX_PARTICLES }, () => ({
  active: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  rotSpeed: 0,
  age: 0,
  maxAge: 0.35,
  scale: 1,
  color: new THREE.Color("#ffffff"),
}));

let nextParticleIdx = 0;

export const spawnImpactBurst = (
  x,
  z,
  colorHex = "#fde047",
  count = 10,
  speedMult = 1
) => {
  for (let i = 0; i < count; i++) {
    const p = particlePool[nextParticleIdx];
    nextParticleIdx = (nextParticleIdx + 1) % MAX_PARTICLES;

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = (2.2 + Math.random() * 3.8) * speedMult;

    p.active = true;
    p.x = x;
    p.y = 0.14;
    p.z = z;
    p.vx = Math.cos(angle) * speed;
    p.vy = 1.8 + Math.random() * 2.6;
    p.vz = Math.sin(angle) * speed;
    p.rotSpeed = (Math.random() - 0.5) * 14;
    p.age = 0;
    p.maxAge = 0.28 + Math.random() * 0.2;
    p.scale = 0.08 + Math.random() * 0.07;
    p.color.set(colorHex);
  }
};

export const triggerScreenShake = (amount = 0.12) => {
  gameRefs.shake = Math.min(0.45, Math.max(gameRefs.shake || 0, amount));
};

export function ImpactParticles() {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const inst = meshRef.current;
    if (!inst) return;

    let anyUpdated = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particlePool[i];
      if (!p.active) {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        continue;
      }

      anyUpdated = true;
      p.age += delta;
      if (p.age >= p.maxAge) {
        p.active = false;
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.vy -= 9.5 * delta; // cartoon gravity

      const lifeRatio = 1 - p.age / p.maxAge;
      const s = p.scale * lifeRatio;

      dummy.position.set(p.x, Math.max(0.02, p.y), p.z);
      dummy.rotation.set(p.age * p.rotSpeed, p.age * 5, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();

      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, p.color);
    }

    if (anyUpdated) {
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, MAX_PARTICLES]}
      frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
