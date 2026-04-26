"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useState, useRef, useMemo, useEffect, Suspense } from "react";
import * as THREE from "three";

const POSTER_IMAGES = [
  "/posters/Angelina Jolie (Acting).png",
  "/posters/Billy Wilder (Writing).png",
  "/posters/Cantinflas (Acting).jpeg",
  "/posters/Cary Grant (Acting).jpg",
  "/posters/Charlize Theron (Acting).png",
  "/posters/Grace Kelly (Acting).png",
  "/posters/Humphrey Bogart (Acting).jpg",
  "/posters/Jake Gyllenhaal (Acting).png",
  "/posters/Joker (2019).jpg",
  "/posters/Kevin Smith (Directing).jpg",
  "/posters/Kevin Spacey (Acting).png",
  "/posters/Liam Neeson (Acting).png",
  "/posters/Martin Scorsese (Directing).jpg",
  "/posters/Moneyball (2011).jpg",
  "/posters/Quentin Tarantino (Directing).jpg",
  "/posters/Skyfall (2012).jpg",
  "/posters/Steven Spielberg (Directing).jpg"
];

const POSTER_QUOTES = [
  "Now It’s Your Turn",
  "Your Move Now",
  "Time To Rise",
  "Step Into Light",
  "Make Your Mark",
  "The Stage Awaits",
  "Claim Your Moment",
  "Ready To Shine",
  "Start Your Story",
  "Show Your Fire",
  "Own This Moment",
  "Take The Lead",
  "Be Seen Now",
  "Your Time Starts",
  "Dare To Begin",
  "Rise And Rule",
  "Enter The Spotlight"
];

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null!);
  const particles = useMemo(() => {
    const count = 1000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions.set([(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 30], i * 3);
    }
    return positions;
  }, []);

  useFrame((state) => {
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particles.length / 3} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#400" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

function Poster({ url, position, scale, mouse, index, quote }: { 
  url: string, 
  position: [number, number, number], 
  scale: [number, number, number],
  mouse: React.MutableRefObject<{ x: number, y: number }>,
  index: number,
  quote: string
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const texture = useLoader(THREE.TextureLoader, url);

  const textRef = useRef<any>(null!);
  const brandRef = useRef<any>(null!);

  // Create the octagonal shape once
  const cardShape = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 1;
    const h = 1;
    const cut = 0.15;
    
    shape.moveTo(-w/2 + cut, h/2);
    shape.lineTo(w/2, h/2);
    shape.lineTo(w/2, -h/2 + cut);
    shape.lineTo(w/2 - cut, -h/2);
    shape.lineTo(-w/2, -h/2);
    shape.lineTo(-w/2, h/2 - cut);
    shape.closePath();
    return shape;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const mx = mouse.current.x * 45;
    const my = mouse.current.y * 25;
    
    const dx = meshRef.current.position.x - mx;
    const dy = meshRef.current.position.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const isClose = dist < 7;
    if (isClose !== hovered) setHovered(isClose);

    // Scaling & Rotation on the Group (Slower for 'weighted' feel)
    const targetScale = isClose ? 1.1 : 1.0;
    const targetRotationY = isClose ? Math.PI : 0;
    
    const group = meshRef.current;
    group.scale.set(
      THREE.MathUtils.lerp(group.scale.x, scale[0] * targetScale, 0.04),
      THREE.MathUtils.lerp(group.scale.y, scale[1] * targetScale, 0.04),
      1
    );
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetRotationY, 0.04);

    // Hide text until flipped past 90 degrees
    const backVisible = Math.abs(group.rotation.y) > Math.PI / 2;
    if (textRef.current) textRef.current.visible = backVisible;
    if (brandRef.current) brandRef.current.visible = backVisible;

    // Entrance Fade Logic
    const entranceDelay = 2.5 + (index * 0.1);
    const entranceDuration = 2.0;
    const entranceProgress = THREE.MathUtils.smoothstep(state.clock.elapsedTime, entranceDelay, entranceDelay + entranceDuration);

    // Update individual material uniforms
    const frontMesh = group.children[0] as THREE.Mesh;
    if (frontMesh && frontMesh.material instanceof THREE.ShaderMaterial) {
      const targetOpacity = (isClose ? 1.0 : 0.3) * entranceProgress;
      frontMesh.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        frontMesh.material.uniforms.uOpacity.value,
        targetOpacity,
        0.05
      );
      frontMesh.material.uniforms.uGrayscale.value = THREE.MathUtils.lerp(
        frontMesh.material.uniforms.uGrayscale.value,
        isClose ? 0.0 : 1.0,
        0.1
      );
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Front Side: Poster */}
      <mesh position={[0, 0, 0.01]}>
        <shapeGeometry args={[cardShape]} />
        <shaderMaterial
          transparent
          side={THREE.FrontSide}
          uniforms={{
            uTexture: { value: texture },
            uOpacity: { value: 0.0 }, 
            uGrayscale: { value: 1.0 }
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              // Standard ShapeGeometry UVs can be unreliable, use position for mapping
              vUv = position.xy + 0.5;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform sampler2D uTexture;
            uniform float uOpacity;
            uniform float uGrayscale;
            varying vec2 vUv;
            void main() {
              // Custom UV mapping for shape geometry to ensure centered texture
              vec2 uv = vUv;
              vec4 tex = texture2D(uTexture, uv);
              float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
              vec3 finalColor = mix(tex.rgb, vec3(gray), uGrayscale);
              gl_FragColor = vec4(finalColor, tex.a * uOpacity);
            }
          `}
        />
      </mesh>

      {/* Back Side: Solid Red + Text */}
      <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
        <shapeGeometry args={[cardShape]} />
        <meshBasicMaterial color="#400" side={THREE.FrontSide} />
        <Text
          ref={textRef}
          position={[0, 0.05, 0.02]} // Shifted up slightly
          fontSize={0.15}
          fontWeight={900}
          letterSpacing={-0.05}
          lineHeight={0.9}
          color="white"
          maxWidth={0.8}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          visible={false}
        >
          {quote}
        </Text>
        <Text
          ref={brandRef}
          position={[0, -0.15, 0.02]} // Positioned below the quote
          fontSize={0.05} // Smaller size
          fontWeight={900}
          letterSpacing={0.1}
          color="white"
          opacity={0.6} // Slightly muted
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          visible={false} 
        >
          MM8
        </Text>
      </mesh>
    </group>
  );
}

function PosterGrid({ mouse }: { mouse: React.MutableRefObject<{ x: number, y: number }> }) {
  const { viewport } = useThree();
  const isMobile = viewport.width < 10; // Simple threshold based on viewport units

  const gridData = useMemo(() => {
    const cols = isMobile ? 3 : 6;
    const spacingX = isMobile ? 6 : 14; 
    const spacingY = isMobile ? 9 : 18; 
    
    return POSTER_IMAGES.map((url, i) => {
      // On mobile, maybe don't skip the top-right slot as aggressively 
      // or skip index 2 (top right in 3-col)
      const skipIndex = isMobile ? 2 : 5;
      const slotIndex = i < skipIndex ? i : i + 1;
      
      const col = slotIndex % cols;
      const row = Math.floor(slotIndex / cols);
      return {
        url,
        position: [
          (col - (cols - 1) / 2) * spacingX,
          (1 - row) * spacingY,
          isMobile ? -8 : -15 
        ] as [number, number, number],
        scale: (isMobile ? [4, 6, 1] : [8, 12, 1]) as [number, number, number]
      };
    });
  }, [isMobile]);

  return (
    <group>
      {gridData.map((data, i) => (
        <Poster
          key={i}
          url={data.url}
          position={data.position}
          scale={data.scale}
          mouse={mouse}
          index={i}
          quote={POSTER_QUOTES[i]}
        />
      ))}
    </group>
  );
}

export default function BackgroundCanvas() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-black pointer-events-none overflow-hidden">
      <Canvas camera={{ position: [0, 0, 25], fov: 50 }}>
        <color attach="background" args={["black"]} />
        <ambientLight intensity={0.5} />
        <PosterGrid mouse={mouse} />
        <ParticleField />
      </Canvas>
      
      {/* Advanced Digital Overlays */}
      <div className="absolute inset-0 z-0">
        <div className="absolute h-[1px] w-full bg-brand-red-neon/15 top-[25%] animate-scan-slow" />
        <div className="absolute h-[1px] w-full bg-brand-red-neon/10 top-[75%] animate-scan-fast" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,0,0,0.05)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-90 pointer-events-none" />
      
      {/* Digital Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}
