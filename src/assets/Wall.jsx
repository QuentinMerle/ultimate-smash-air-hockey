import React from "react";
import { toonGradientMap, outlineMaterial } from "./Effects";

const Wall = ({ nodes }) => {
  return (
    <group position={[0.02, 0, 0]}>
      <mesh geometry={nodes.geometry}>
        <meshToonMaterial color={"#ffffff"} gradientMap={toonGradientMap} />
      </mesh>
      {/* Crisp outer cartoon ink outline on the rink walls */}
      <mesh
        geometry={nodes.geometry}
        scale={[1.022, 1.08, 1.016]}
        material={outlineMaterial}
      />
    </group>
  );
};

export default Wall;
