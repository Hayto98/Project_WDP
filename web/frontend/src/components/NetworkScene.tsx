import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Points, PointMaterial, Sparkles, Float, Sphere, MeshDistortMaterial, Text } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const aberrationOffset = new THREE.Vector2(0.002, 0.002);

function Core() {
  const materialRef = useRef<any>(null!);
  useFrame((state) => {
    if (materialRef.current) {
       materialRef.current.distort = 0.4 + Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
      <Sphere args={[2, 32, 32]}>
        <MeshDistortMaterial 
          ref={materialRef}
          color="#1e1b4b" 
          emissive="#4c1d95"
          emissiveIntensity={1.5}
          roughness={0.2} 
          metalness={0.8}
          distort={0.3} 
          speed={1.5} 
        />
      </Sphere>
      
      {/* Wireframe shell */}
      <Sphere args={[2.2, 16, 16]}>
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.15} />
      </Sphere>
    </Float>
  );
}

function Swarm() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta * 0.05;
      ref.current.rotation.y += delta * 0.07;
    }
  });

  const count = 800;
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
      <Points positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#2dd4bf"
          size={0.04}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

function ResearchData() {
  const groupRef = useRef<THREE.Group>(null!);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Rings / Streams */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.01, 16, 100]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0.2, 0]}>
        <torusGeometry args={[4, 0.01, 16, 100]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.2} />
      </mesh>
      <mesh rotation={[Math.PI / 1.8, -0.2, 0]}>
        <torusGeometry args={[5, 0.01, 16, 100]} />
        <meshBasicMaterial color="#4c1d95" transparent opacity={0.4} />
      </mesh>
      
      {/* Floating Holographic Texts */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
        <Text
          position={[3.5, 1.5, 0]}
          rotation={[0, -0.5, 0]}
          fontSize={0.2}
          color="#2dd4bf"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.8}
        >
          [Analyzing: 1,280,000 Nodes]
        </Text>
      </Float>

      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
        <Text
          position={[-3.5, -1, 1]}
          rotation={[0, 0.5, 0]}
          fontSize={0.15}
          color="#c084fc"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.6}
        >
          &gt; Identifying Research Gaps...
        </Text>
      </Float>

      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.8}>
        <Text
          position={[0, 3, -2]}
          fontSize={0.15}
          color="#2dd4bf"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.5}
        >
          Citation Momentum: High
        </Text>
      </Float>
    </group>
  );
}

function CameraRig({ entered }: { entered: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    // Group rotation (replaces OrbitControls autoRotate)
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }

    // Camera animation
    if (!entered) {
      state.camera.position.lerp(new THREE.Vector3(0, 5, 35), 0.1);
    } else {
      state.camera.position.lerp(new THREE.Vector3(0, 0, 10), delta * 2);
    }
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={groupRef}>
      <Core />
      <Swarm />
      <ResearchData />
      <Sparkles count={400} scale={20} size={1.5} speed={0.4} opacity={0.3} color="#c084fc" />
    </group>
  );
}

export function NetworkScene({ entered = true }: { entered?: boolean }) {
  return (
    <div className="network-scene-wrapper">
      <Canvas 
        camera={{ position: [0, 5, 35], fov: 45 }} 
        dpr={[1, 1.5]} 
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={2} color="#8b5cf6" />
        <directionalLight position={[-10, -10, -5]} intensity={2} color="#2dd4bf" />
        
        <CameraRig entered={entered} />
        
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.3} intensity={1.2} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
