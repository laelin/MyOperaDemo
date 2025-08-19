import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ParticleCloud from "./ParticleCloud";

export default function App() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#0c0c10"]} />
      <ParticleCloud count={20000} />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
