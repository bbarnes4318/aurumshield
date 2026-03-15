"use client";

/* ================================================================
   AUTONOMOUS DEMO ENGINE — Launch Page
   Route: /demo/autopilot

   Full-screen dark UI with centered launch card.
   Shows the 6-phase checklist preview and a gold "INITIATE" button.
   On click, starts the AutopilotProvider which navigates away.
   ================================================================ */


import {
  Shield,
  Mountain,
  BarChart3,
  Zap,
  Truck,
  Landmark,
  Play,
  Radio,
} from "lucide-react";
import { AutopilotProvider, useAutopilot } from "@/demo/autopilot/AutopilotProvider";
import { AutopilotOverlay } from "@/demo/autopilot/AutopilotOverlay";
import { AutopilotPhase, PHASE_LABELS, PHASE_ORDER } from "@/demo/autopilot/autopilotTypes";

/* ---------- Phase Icon Map ---------- */

const PHASE_ICONS: Record<AutopilotPhase, React.ReactNode> = {
  [AutopilotPhase.PERIMETER]: <Shield style={{ width: 16, height: 16 }} />,
  [AutopilotPhase.ORIGINATION]: <Mountain style={{ width: 16, height: 16 }} />,
  [AutopilotPhase.MARKETPLACE]: <BarChart3 style={{ width: 16, height: 16 }} />,
  [AutopilotPhase.ATOMIC_SWAP]: <Zap style={{ width: 16, height: 16 }} />,
  [AutopilotPhase.LOGISTICS]: <Truck style={{ width: 16, height: 16 }} />,
  [AutopilotPhase.TREASURY]: <Landmark style={{ width: 16, height: 16 }} />,
};

/* ---------- Inner Content (needs AutopilotProvider context) ---------- */

function AutopilotLaunchContent() {
  const { state, start, isRunning } = useAutopilot();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A1128",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "var(--font-ibm-plex-sans, 'IBM Plex Sans', system-ui, sans-serif)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, padding: "0 24px" }}>
        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          <Radio
            style={{
              width: 14,
              height: 14,
              color: isRunning ? "#3fae7a" : "#c6a86b",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: isRunning ? "#3fae7a" : "#c6a86b",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            {isRunning ? "Engine Active" : "Standby"}
          </span>
        </div>

        {/* Main card */}
        <div
          style={{
            background: "rgba(15, 26, 43, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(198, 168, 107, 0.2)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "28px 32px 20px",
              borderBottom: "1px solid rgba(36, 54, 83, 0.5)",
            }}
          >
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#e7ecf4",
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              Autonomous Demonstration Engine
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "#7f8ca3",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Zero-touch automated product tour. The engine programmatically
              navigates routes, simulates UI interactions, triggers webhook
              responses, and synchronizes with the Vapi.ai voice agent.
            </p>
          </div>

          {/* Phase checklist */}
          <div style={{ padding: "16px 32px 20px" }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#7f8ca3",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 12,
              }}
            >
              Execution Phases
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PHASE_ORDER.map((phase, idx) => {
                const isActive =
                  isRunning && state.currentPhaseIndex === idx;
                const isComplete =
                  isRunning && state.currentPhaseIndex > idx;

                return (
                  <div
                    key={phase}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isActive
                        ? "rgba(198, 168, 107, 0.08)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(198, 168, 107, 0.2)"
                        : "1px solid transparent",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {/* Phase number */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        background: isComplete
                          ? "rgba(63, 174, 122, 0.15)"
                          : isActive
                            ? "rgba(198, 168, 107, 0.15)"
                            : "rgba(36, 54, 83, 0.4)",
                        color: isComplete
                          ? "#3fae7a"
                          : isActive
                            ? "#c6a86b"
                            : "#7f8ca3",
                        border: isActive
                          ? "1px solid rgba(198, 168, 107, 0.3)"
                          : "1px solid rgba(36, 54, 83, 0.5)",
                      }}
                    >
                      {isComplete ? "✓" : idx + 1}
                    </div>

                    {/* Icon */}
                    <div
                      style={{
                        color: isComplete
                          ? "#3fae7a"
                          : isActive
                            ? "#c6a86b"
                            : "#7f8ca3",
                      }}
                    >
                      {PHASE_ICONS[phase]}
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 500,
                        color: isComplete
                          ? "#3fae7a"
                          : isActive
                            ? "#e7ecf4"
                            : "#7f8ca3",
                      }}
                    >
                      {PHASE_LABELS[phase]}
                    </span>

                    {/* Active pulse */}
                    {isActive && (
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#c6a86b",
                          boxShadow: "0 0 8px rgba(198, 168, 107, 0.5)",
                          animation: "pulse 2s infinite",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div
            style={{
              padding: "16px 32px 28px",
              borderTop: "1px solid rgba(36, 54, 83, 0.5)",
            }}
          >
            <button
              onClick={start}
              disabled={isRunning}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 24px",
                background: isRunning
                  ? "rgba(198, 168, 107, 0.2)"
                  : "#c6a86b",
                color: isRunning ? "#c6a86b" : "#0A1128",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                border: "none",
                borderRadius: 8,
                cursor: isRunning ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              <Play
                style={{
                  width: 14,
                  height: 14,
                  fill: isRunning ? "#c6a86b" : "#0A1128",
                }}
              />
              {isRunning
                ? "Engine Running"
                : "Initiate Autonomous Demo"}
            </button>

            <p
              style={{
                fontSize: 9,
                color: "#7f8ca3",
                textAlign: "center",
                marginTop: 12,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              AurumShield · Goldwire Settlement Network · Sovereign
              Infrastructure
            </p>
          </div>
        </div>
      </div>

      {/* Pulse animation keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `,
        }}
      />
    </div>
  );
}

/* ---------- Page Component ---------- */

export default function AutopilotPage() {
  return (
    <AutopilotProvider>
      <AutopilotLaunchContent />
      <AutopilotOverlay />
    </AutopilotProvider>
  );
}
