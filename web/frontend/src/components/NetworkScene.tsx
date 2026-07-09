import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

function Swarm() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta * 0.05;
      ref.current.rotation.y += delta * 0.07;
    }
  });

  const count = 1000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 5 + Math.random() * 3;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  return (
    <group ref={ref}>
      <Points positions={positions}>
        <PointMaterial 
          transparent 
          color="#2dd4bf" 
          size={0.05} 
          sizeAttenuation={true} 
          depthWrite={false} 
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

export function NetworkScene() {
  return (
    <div className="network-scene-wrapper">
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 45 }} 
        dpr={[1, 1.5]} 
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={2} color="#8b5cf6" />
        <directionalLight position={[-10, -10, -5]} intensity={2} color="#2dd4bf" />
        
        <Swarm />
        
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.3} intensity={1.2} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
