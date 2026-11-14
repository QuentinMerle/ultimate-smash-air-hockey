import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useStore } from "../store";

const SCALE = 220; // pixels per meter
const WIDTH_M = 6.052;
const LENGTH_M = 8.894;

const ARENA_THEMES = {
  nhl94: {
    iceBase: "#e2f4ff",
    stripeAlt: "#d5eeff",
    dots: "#9fd8f8",
    p1Color: "#ff2a54",
    p1Crease: "rgba(255, 42, 84, 0.25)",
    p2Color: "#00b4d8",
    p2Crease: "rgba(0, 180, 216, 0.25)",
    centerLine: "#fde047",
    medallionOuter: "#bae6fd",
    medallionRing: "#00b4d8",
    medallionInner: "#1e293b",
    emblem: "star",
    emblemColor: "#fde047",
    outline: "#0f172a",
  },
  strikers: {
    iceBase: "#0f2922",
    stripeAlt: "#13332a",
    dots: "#1f5444",
    p1Color: "#ff2a54",
    p1Crease: "rgba(255, 42, 84, 0.24)",
    p2Color: "#4ade80",
    p2Crease: "rgba(74, 222, 128, 0.24)",
    centerLine: "#fde047",
    medallionOuter: "#164e3f",
    medallionRing: "#4ade80",
    medallionInner: "#091e1a",
    emblem: "bolt",
    emblemColor: "#fde047",
    outline: "#04100d",
  },
  cosmos: {
    iceBase: "#1a1033",
    stripeAlt: "#221542",
    dots: "#3b2375",
    p1Color: "#f43f5e",
    p1Crease: "rgba(244, 63, 94, 0.25)",
    p2Color: "#38bdf8",
    p2Crease: "rgba(56, 189, 248, 0.25)",
    centerLine: "#c084fc",
    medallionOuter: "#2e1a5e",
    medallionRing: "#c084fc",
    medallionInner: "#0f0722",
    emblem: "nova",
    emblemColor: "#fde047",
    outline: "#090414",
  },
};

function createPopCartoonRinkTexture(arenaId = "nhl94") {
  const normalizedId = arenaId === "smash" ? "cosmos" : arenaId;
  const theme = ARENA_THEMES[normalizedId] || ARENA_THEMES.nhl94;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(WIDTH_M * SCALE);
  canvas.height = Math.round(LENGTH_M * SCALE);
  const ctx = canvas.getContext("2d");

  const toX = (x) => (x + WIDTH_M / 2) * SCALE;
  const toZ = (z) => (z + LENGTH_M / 2) * SCALE;
  const toR = (r) => r * SCALE;

  // 1. Base Ice / Turf Color
  ctx.fillStyle = theme.iceBase;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Subtle Alternating Stadium Stripes
  const numStripes = 12;
  const stripeH = canvas.height / numStripes;
  for (let i = 0; i < numStripes; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = theme.stripeAlt;
      ctx.fillRect(0, i * stripeH, canvas.width, stripeH);
    }
  }

  // 3. Air-Hockey Micro Air-Cushion Dots Grid
  ctx.fillStyle = theme.dots;
  for (let x = -2.75; x <= 2.75; x += 0.25) {
    for (let z = -4.1; z <= 4.1; z += 0.25) {
      ctx.beginPath();
      ctx.arc(toX(x), toZ(z), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Helper to draw a cartoon-outlined horizontal line
  const drawCartoonBand = (z, thicknessM, fillColor) => {
    const y = toZ(z);
    const h = toR(thicknessM);
    const border = 5;
    ctx.fillStyle = theme.outline;
    ctx.fillRect(0, y - h / 2 - border, canvas.width, h + border * 2);
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, y - h / 2, canvas.width, h);
  };

  // 4. Goal Lines (z = ±3.18)
  drawCartoonBand(-3.18, 0.045, theme.p1Color);
  drawCartoonBand(3.18, 0.045, theme.p2Color);

  // 5. Defensive Zone Lines (z = ±1.35)
  drawCartoonBand(-1.35, 0.065, theme.p1Color);
  drawCartoonBand(1.35, 0.065, theme.p2Color);

  // 6. Center Line (z = 0)
  drawCartoonBand(0, 0.08, theme.centerLine);

  // 7. Goal Crease Semi-Circles (z = ±3.18)
  const drawGoalCrease = (goalZ, towardCenterSign, fillTint, strokeColor) => {
    const cx = toX(0);
    const cz = toZ(goalZ);
    const r = toR(1.06);
    const startAngle = towardCenterSign > 0 ? 0 : Math.PI;
    const endAngle = towardCenterSign > 0 ? Math.PI : Math.PI * 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cz, r, startAngle, endAngle, false);
    ctx.closePath();
    ctx.fillStyle = fillTint;
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = theme.outline;
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
    ctx.restore();
  };

  drawGoalCrease(-3.18, 1, theme.p1Crease, theme.p1Color);
  drawGoalCrease(3.18, -1, theme.p2Crease, theme.p2Color);

  // 8. Four Face-off Circles
  const drawFaceoffCircle = (x, z, color) => {
    const cx = toX(x);
    const cz = toZ(z);
    const r = toR(0.55);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cz, r, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = theme.outline;
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cz, toR(0.09), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.outline;
    ctx.stroke();
    ctx.restore();
  };

  drawFaceoffCircle(-1.45, -2.2, theme.p1Color);
  drawFaceoffCircle(1.45, -2.2, theme.p1Color);
  drawFaceoffCircle(-1.45, 2.2, theme.p2Color);
  drawFaceoffCircle(1.45, 2.2, theme.p2Color);

  // 9. Center Stadium Medallion + Arena Emblem
  const cx = toX(0);
  const cz = toZ(0);

  ctx.beginPath();
  ctx.arc(cx, cz, toR(0.98), 0, Math.PI * 2);
  ctx.fillStyle = theme.medallionOuter;
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.strokeStyle = theme.outline;
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = theme.medallionRing;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cz, toR(0.62), 0, Math.PI * 2);
  ctx.fillStyle = theme.medallionInner;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = theme.outline;
  ctx.stroke();

  if (theme.emblem === "bolt") {
    // Strikers Thunder Bolt
    const s = toR(0.42);
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.12, cz - s * 1.05);
    ctx.lineTo(cx - s * 0.52, cz + s * 0.12);
    ctx.lineTo(cx - s * 0.02, cz + s * 0.12);
    ctx.lineTo(cx - s * 0.18, cz + s * 1.05);
    ctx.lineTo(cx + s * 0.56, cz - s * 0.12);
    ctx.lineTo(cx + s * 0.05, cz - s * 0.12);
    ctx.closePath();
    ctx.fillStyle = theme.emblemColor;
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.lineJoin = "round";
    ctx.strokeStyle = theme.outline;
    ctx.stroke();
  } else if (theme.emblem === "nova") {
    // Original 8-Pointed Nova Starburst & Twin Orbital Rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cz, toR(0.47), 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();

    const rays = 8;
    const outerR = toR(0.45);
    const innerR = toR(0.18);
    ctx.beginPath();
    for (let i = 0; i < rays * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / rays - Math.PI / 2;
      const sx = cx + Math.cos(angle) * r;
      const sy = cz + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = theme.emblemColor;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.strokeStyle = theme.outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cz, toR(0.11), 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.outline;
    ctx.stroke();
    ctx.restore();
  } else {
    // 5-Pointed Star Emblem (NHL '94 / Retro Forum)
    const outerR = toR(0.46);
    const innerR = toR(0.21);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const sx = cx + Math.cos(angle) * r;
      const sy = cz + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = theme.emblemColor;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.strokeStyle = theme.outline;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function RinkSurface({ terrainGeometry }) {
  const arena = useStore((state) => state.arena);

  const customGeo = useMemo(() => {
    const geo = terrainGeometry.clone();
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      uvs[i * 2] = (x + WIDTH_M / 2) / WIDTH_M;
      uvs[i * 2 + 1] = (z + LENGTH_M / 2) / LENGTH_M;
    }

    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    return geo;
  }, [terrainGeometry]);

  const rinkTexture = useMemo(() => createPopCartoonRinkTexture(arena), [arena]);

  useEffect(() => {
    return () => {
      rinkTexture.dispose();
    };
  }, [rinkTexture]);

  return (
    <mesh geometry={customGeo} position={[0.02, 0, 0]}>
      <meshBasicMaterial map={rinkTexture} />
    </mesh>
  );
}
