"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ================================================================
   INSTITUTIONAL BAR SHOWCASE
   ================================================================
   Interactive 3D visualization of a 400-oz LBMA Good Delivery bar.
   Clean SaaS layout with generous whitespace, clear typography
   hierarchy, and a responsive spec-card grid.
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

/* ── Spec card data ── */
const SPEC_CARDS = [
  {
    label: "Gross Weight",
    value: "400.000",
    unit: "troy oz",
    detail: "Cast ingot, LBMA tolerance ±0.025%",
  },
  {
    label: "Purity",
    value: "999.9",
    unit: "fineness",
    detail: "Minimum 995.0 per Good Delivery standard",
  },
  {
    label: "Standard",
    value: "LBMA GD",
    unit: "certified",
    detail: "London Bullion Market Association accredited",
  },
  {
    label: "Refinery",
    value: "Argor-Heraeus",
    unit: "SA, Switzerland",
    detail: "LBMA-accredited since 1978, ISO 9001 certified",
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
    const bw = 1.4;
    const bh = 0.6;
    const tw = 1.1;
    const th = 0.45;
    const h = 0.3;

    const vertices = new Float32Array([
      -bw / 2,
      0,
      -bh / 2,
      bw / 2,
      0,
      -bh / 2,
      bw / 2,
      0,
      bh / 2,
      -bw / 2,
      0,
      bh / 2,
      -tw / 2,
      h,
      -th / 2,
      tw / 2,
      h,
      -th / 2,
      tw / 2,
      h,
      th / 2,
      -tw / 2,
      h,
      th / 2,
    ]);

    const indices = new Uint16Array([
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 3, 6, 2, 3, 7, 6, 0, 1, 5, 0, 5, 4, 0,
      4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#D4AF37" roughness={0.65} metalness={0.8} />

      {/* ── HUD Hallmark Annotations ── */}
      {HALLMARKS.map((hm) => (
        <Html
          key={hm.label}
          position={hm.position}
          distanceFactor={3.5}
          occlude={false}
          style={{ pointerEvents: "none" }}
        >
          <div
            className="flex flex-col items-center"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="h-1.5 w-1.5 rounded-full mb-1"
              style={{
                backgroundColor: "#D4AF37",
                boxShadow: "0 0 6px rgba(212,175,55,0.4)",
              }}
            />
            <div
              className="w-px h-4 mb-1"
              style={{ backgroundColor: "rgba(148,163,184,0.4)" }}
            />
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
    <section
      className="py-28 lg:py-40 relative overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Section Header — generous spacing ── */}
        <div className="mb-16 max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-px w-10"
              style={{ backgroundColor: "rgba(212,175,55,0.5)" }}
            />
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "#D4AF37" }}
            >
              400-OZ GOOD DELIVERY STANDARD
            </p>
          </div>
          <h2
            className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight leading-[1.15]"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              color: "#f1f5f9",
            }}
          >
            Industrial Scale.{" "}
            <span style={{ color: "#94a3b8" }}>Institutional Precision.</span>
          </h2>
          <p
            className="mt-6 text-lg max-w-2xl"
            style={{ lineHeight: 1.75, color: "#cbd5e1" }}
          >
            Every bar settled through the Goldwire network is a cast
            400-troy-ounce LBMA Good Delivery bar bearing four mandatory
            hallmarks. Institutional chain-of-custody verification is
            structurally enforced — not optional.
          </p>
        </div>

        {/* ── 3D Canvas Container ── */}
        <div
          className="relative rounded-lg border border-slate-800/80 overflow-hidden"
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

          {/* ── Bottom HUD ── */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3.5 border-t border-slate-800"
            style={{
              backgroundColor: "rgba(10,10,10,0.85)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                INTERACTIVE • DRAG TO ROTATE
              </span>
            </div>
            <span
              className="hidden sm:block font-mono text-[9px] uppercase tracking-wider"
              style={{ color: "rgba(212,175,55,0.5)" }}
            >
              INSTITUTIONAL VIEW
            </span>
          </div>
        </div>

        {/* ── Spec Card Grid — 4-column responsive ── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPEC_CARDS.map((card) => (
            <div
              key={card.label}
              className="group relative rounded-lg border border-slate-800/80 p-6 transition-all duration-300 hover:border-[rgba(212,175,55,0.3)]"
              style={{ backgroundColor: "#0D1320" }}
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-[rgba(212,175,55,0.03)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    {card.value}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {card.unit}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-400 mt-3">
                  {card.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
