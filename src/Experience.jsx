import { Suspense, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { useControls } from "leva";
import * as THREE from "three";
import Placeholder from "./Placeholder";
import { AirHockey } from "./AirHockey";
import { ArenaEnvironment } from "./assets/Arenas";
import { useStore, gameRefs } from "./store";
import { pollMenuGamepad } from "./gamepad";

function DynamicCamera() {
  const lookAtTarget = useRef(new THREE.Vector3(0, -0.2, 0));
  const { size } = useThree();

  useFrame((state, delta) => {
    const {
      countdown,
      startGame,
      endGame,
      isPaused,
      isGoalSlowMo,
      lastGoalBy,
      gameMode,
      onlineRole,
    } = useStore.getState();

    // Gamepad navigation on all menus & pause dialog (Xbox Edge / Tilt.gl)
    if (!startGame || endGame || isPaused) {
      pollMenuGamepad();
    }

    const aspect = size.width / Math.max(1, size.height);
    const isPortrait = aspect < 1.0;

    let targetX = 0;
    let targetY = 6.65;
    let targetZ = -8.55;
    let lookX = 0;
    let lookY = -0.2;
    let lookZ = 0;
    let lerpSpeed = 5;

    if (isGoalSlowMo) {
      // Sakurai Dramatic KO Finisher Punch-In Zoom toward scored goal
      const goalSign = lastGoalBy === "playerOne" ? 1 : -1;
      if (gameMode === "local") {
        targetX = isPortrait ? -10.2 : -7.4;
        targetY = isPortrait ? 7.6 : 5.4;
        targetZ = goalSign * 1.45;
      } else {
        targetX = (gameRefs.mainPuckPos.x || 0) * 0.25;
        targetY = isPortrait ? 6.8 : 4.55;
        targetZ = (gameMode === "online" && onlineRole === "guest" ? 1 : -1) * (isPortrait ? 8.2 : 5.8);
      }
      lookX = gameRefs.mainPuckPos.x * 0.4;
      lookY = 0.05;
      lookZ = goalSign * 2.1;
      lerpSpeed = 8.5;
    } else if (startGame && gameMode === "local") {
      // Local 2P Side View: camera on -X so Player 1 (-Z) is LEFT and Player 2 (+Z) is RIGHT
      targetX = isPortrait ? -12.6 : -9.4;
      targetY = isPortrait ? 9.8 : 7.4;
      targetZ = gameRefs.mainPuckPos.z * 0.12;
      lookZ = targetZ * 0.4;
      lerpSpeed = 6;
    } else if (startGame && gameMode === "online" && onlineRole === "guest") {
      // Online Guest mirrored perspective (bottom of screen = +Z)
      const inMenuOrCountdown = countdown !== null;
      targetY = inMenuOrCountdown ? 6.65 : isPortrait ? 8.8 : 6.05;
      targetZ = inMenuOrCountdown ? 8.55 : isPortrait ? 10.6 : 7.85;
      targetX = gameRefs.mainPuckPos.x * 0.14;
      targetZ += gameRefs.mainPuckPos.z * 0.06;
      lookX = targetX * 0.4;
    } else {
      // Standard 1P / Menu / Online Host (-Z perspective)
      const isMenuOrCountdown = !startGame || countdown !== null;
      targetY = isMenuOrCountdown ? (isPortrait ? 8.9 : 6.65) : isPortrait ? 8.8 : 6.05;
      targetZ = isMenuOrCountdown
        ? isPortrait
          ? -10.8
          : -8.55
        : (isPortrait ? -10.6 : -7.85) + gameRefs.mainPuckPos.z * 0.06;
      targetX = startGame ? gameRefs.mainPuckPos.x * 0.14 : 0;
      lookX = targetX * 0.4;
    }

    // Decay screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (gameRefs.shake > 0.002 && !isPaused) {
      shakeX = (Math.random() - 0.5) * gameRefs.shake;
      shakeY = (Math.random() - 0.5) * gameRefs.shake;
      gameRefs.shake = Math.max(0, gameRefs.shake - delta * 1.4);
    } else if (!isPaused) {
      gameRefs.shake = 0;
    }

    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x,
      targetX + shakeX,
      delta * lerpSpeed
    );
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      targetY + shakeY,
      delta * lerpSpeed
    );
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      targetZ,
      delta * lerpSpeed
    );

    lookAtTarget.current.x = THREE.MathUtils.lerp(
      lookAtTarget.current.x,
      lookX,
      delta * 8
    );
    lookAtTarget.current.y = THREE.MathUtils.lerp(
      lookAtTarget.current.y,
      lookY,
      delta * 8
    );
    lookAtTarget.current.z = THREE.MathUtils.lerp(
      lookAtTarget.current.z,
      lookZ,
      delta * 8
    );
    state.camera.lookAt(lookAtTarget.current);
  });

  return null;
}

export default function Experience() {
  const { perfVisible } = useControls({
    perfVisible: false,
  });

  return (
    <>
      {perfVisible ? <Perf position="top-left" /> : null}

      <DynamicCamera />

      <ambientLight intensity={0.78} />
      <directionalLight position={[6, 12, -5]} intensity={1.1} />

      <ArenaEnvironment />

      <Suspense fallback={<Placeholder position-y={0.5} scale={[5, 1, 7]} />}>
        <AirHockey position={[0, 0, 0]} />
      </Suspense>
    </>
  );
}
