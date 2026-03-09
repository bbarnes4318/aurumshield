"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ================================================================
   INSTITUTIONAL BAR SHOWCASE
   ================================================================
   Interactive 3D visualization of a 400-oz LBMA Good Delivery bar
   with HUD-style hallmark annotations.
   ================================================================ */

/* ── Hallmark annotation data ── */
const HALLMARKS = [
  {
    label: "SERIAL",
    value: "GD-2026-049817",
    position: [0.6, 0.32, 0.3] as [number, number, number],
  },
  {
    label: "REFINERY",
    value: "ARGOR-HERAEUS SA",
    position: [-0.6, 0.32, 0.3] as [number, number, number],
  },
  {
    label: "FINENESS",
    value: "999.9",
    position: [0.5, 0.32, -0.35] as [number, number, number],
  },
  {
    label: "YEAR",
    value: "2026",
    position: [-0.5, 0.32, -0.35] as [number, number, number],
  },
] as const;

/* ── 400-oz Good Delivery bar geometry (trapezoidal prism) ── */
function GoldBar() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Slow, subtle auto-rotation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
  });

  // Trapezoidal prism via custom BufferGeometry
  const geometry = useMemo(() => {
    // 400-oz bar approximate proportions (scaled):
    // Bottom face wider, top face narrower (tapered cast mold shape)
    const bw = 1.4; // bottom width
    const bh = 0.6; // bottom depth
    const tw = 1.1; // top width
    const th = 0.45; // top depth
    const h = 0.3; // height

    // 8 vertices: bottom quad (wider) + top quad (narrower)
    const vertices = new Float32Array([
      // Bottom face (y = 0)
      -bw / 2, 0, -bh / 2, // 0: back-left
       bw / 2, 0, -bh / 2, // 1: back-right
       bw / 2, 0,  bh / 2, // 2: front-right
      -bw / 2, 0,  bh / 2, // 3: front-left
      // Top face (y = h)
      -tw / 2, h, -th / 2, // 4: back-left
       tw / 2, h, -th / 2, // 5: back-right
       tw / 2, h,  th / 2, // 6: front-right
      -tw / 2, h,  th / 2, // 7: front-left
    ]);

    // 12 triangles (6 faces × 2 tris each)
    const indices = new Uint16Array([
      // Bottom
      0, 2, 1, 0, 3, 2,
      // Top
      4, 5, 6, 4, 6, 7,
      // Front
      3, 6, 2, 3, 7, 6,
      // Back
      0, 1, 5, 0, 5, 4,
      // Left
      0, 4, 7, 0, 7, 3,
      // Right
      1, 2, 6, 1, 6, 5,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#D4AF37"
        roughness={0.65}
        metalness={0.8}
      />

      {/* ── HUD Hallmark Annotations ── */}
      {HALLMARKS.map((hm) => (
        <Html
          key={hm.label}
          position={hm.position}
          distanceFactor={3.5}
          occlude={false}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex flex-col items-center" style={{ pointerEvents: "none" }}>
            {/* Connector dot */}
            <div
              className="h-1.5 w-1.5 rounded-full mb-1"
              style={{ backgroundColor: "#D4AF37", boxShadow: "0 0 6px rgba(212,175,55,0.4)" }}
            />
            {/* Connector line */}
            <div className="w-px h-4 mb-1" style={{ backgroundColor: "rgba(148,163,184,0.4)" }} />
            {/* Data tag */}
            <div
              className="px-2.5 py-1.5 rounded font-mono text-center whitespace-nowrap shadow-xl"
              style={{
                backgroundColor: "rgba(10,10,10,0.92)",
                border: "1px solid rgba(51,65,85,0.7)",
              }}
            >
              <span className="block text-[8px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0.5">
                {hm.label}
              </span>
              <span className="block text-[11px] font-bold text-slate-300">
                {hm.value}
              </span>
            </div>
          </div>
        </Html>
      ))}
    </mesh>
  );
}

/* ── Fallback while canvas loads ── */
function CanvasFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-slate-700 border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Initializing 3D Viewport
        </span>
      </div>
    </div>
  );
}

export function InstitutionalBarShowcase() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" style={{ backgroundColor: "#0A0A0A" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section Header ── */}
        <div className="mb-12 max-w-3xl">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px w-8" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "#D4AF37" }}
            >
              400-OZ GOOD DELIVERY STANDARD
            </p>
          </div>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-white leading-tight"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Industrial Scale.{" "}
            <span className="text-slate-400">Institutional Precision.</span>
          </h2>
          <p className="mt-4 text-base text-slate-400 max-w-2xl" style={{ lineHeight: 1.6 }}>
            Every bar settled through the Goldwire network is a cast 400-troy-ounce
            LBMA Good Delivery bar bearing four mandatory hallmarks for institutional
            chain-of-custody verification.
          </p>
        </div>

        {/* ── 3D Canvas Container ── */}
        <div
          className="relative rounded-md border border-slate-800 overflow-hidden"
          style={{
            height: "min(520px, 60vh)",
            backgroundColor: "#070B12",
          }}
        >
          {/* Background ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 60%, rgba(212,175,55,0.04) 0%, transparent 60%)",
            }}
          />

          <Suspense fallback={<CanvasFallback />}>
            <Canvas
              camera={{ position: [0, 1.2, 2.8], fov: 35 }}
              shadows
              gl={{ antialias: true, alpha: true }}
              style={{ background: "transparent" }}
            >
              {/* Lighting: soft ambient + targeted spots for cast-metal look */}
              <ambientLight intensity={0.3} />
              <directionalLight
                position={[3, 4, 2]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <directionalLight position={[-2, 3, -1]} intensity={0.4} />
              <spotLight
                position={[0, 5, 0]}
                angle={0.4}
                penumbra={0.8}
                intensity={0.6}
                castShadow
              />

              <Environment preset="warehouse" />

              <GoldBar />

              <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2.2}
                minAzimuthAngle={-Math.PI / 3}
                maxAzimuthAngle={Math.PI / 3}
                autoRotate={false}
              />
            </Canvas>
          </Suspense>

          {/* ── Bottom HUD info strip ── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 border-t border-slate-800" style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-center gap-6">
              <div>
                <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  WEIGHT
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  400.000 ozt
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div>
                <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  PURITY
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  999.9
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div>
                <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  STANDARD
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  LBMA GD
                </span>
              </div>
            </div>
            <span className="hidden sm:block font-mono text-[9px] uppercase tracking-wider" style={{ color: "rgba(212,175,55,0.5)" }}>
              DRAG TO ROTATE • INSTITUTIONAL VIEW
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
