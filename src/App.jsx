import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Leva } from "leva";
import GlobalStyle from "./GlobalStyle";
import Experience from "./Experience";
import Hud from "./Hud";

const isDebug =
  typeof window !== "undefined" && window.location.hash === "#debug";

const App = () => {
  return (
    <>
      <GlobalStyle />
      <Hud />
      <KeyboardControls
        map={[
          { name: "forwardOne", keys: ["ArrowUp"] },
          { name: "backwardOne", keys: ["ArrowDown"] },
          { name: "leftwardOne", keys: ["ArrowLeft"] },
          { name: "rightwardOne", keys: ["ArrowRight"] },
          { name: "forwardTwo", keys: ["KeyW"] },
          { name: "backwardTwo", keys: ["KeyS"] },
          { name: "leftwardTwo", keys: ["KeyA"] },
          { name: "rightwardTwo", keys: ["KeyD"] },
          { name: "launch", keys: ["Space"] },
          { name: "bonusTwo", keys: ["KeyE", "ShiftLeft"] },
        ]}>
        <Leva hidden={!isDebug} collapsed />
        <Canvas
          dpr={[1, 1.5]}
          camera={{
            fov: 45,
            near: 0.1,
            far: 50,
            position: [0, 6.2, -8],
          }}>
          <Experience />
        </Canvas>
      </KeyboardControls>
    </>
  );
};

export default App;
