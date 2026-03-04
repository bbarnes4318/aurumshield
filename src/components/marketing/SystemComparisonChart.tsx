import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  Building2,
  Banknote,
  Zap,
  Landmark,
  Globe,
  Clock,
} from "lucide-react";

type Highlight = "red" | "green";

type FlowNodeData = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  highlight?: Highlight;
};

type FlowColumnProps = {
  title: string;
  titleClassName: string;
  nodes: FlowNodeData[];
  summaryText: string;
  summaryHighlight?: boolean;
  cadenceMs: number; // animation speed per node
};

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const ArrowConnector: React.FC<{ dim?: boolean }> = ({ dim }) => (
  <div className={cx("flex justify-center py-2", dim ? "text-slate-700" : "text-slate-500")}>
    <ArrowDown size={18} />
  </div>
);

const SummaryCard: React.FC<{
  text: string;
  highlight?: boolean;
  active?: boolean;
}> = ({ text, highlight, active }) => (
  <div
    className={cx(
      "mt-6 p-4 rounded-xl border text-sm font-semibold text-center transition-all duration-500",
      highlight
        ? "border-emerald-500/50 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
        : "border-white/10 text-slate-300",
      active && highlight && "shadow-[0_0_26px_rgba(16,185,129,0.55)]"
    )}
  >
    {text}
  </div>
);

const FlowNode: React.FC<{
  data: FlowNodeData;
  isActive: boolean;
  isRevealed: boolean;
  side: "left" | "right";
}> = ({ data, isActive, isRevealed }) => {
  const baseColor =
    data.highlight === "red"
      ? "border-red-500/30"
      : data.highlight === "green"
      ? "border-emerald-500/40"
      : "border-white/10";

  const textColor =
    data.highlight === "red"
      ? "text-red-200"
      : data.highlight === "green"
      ? "text-emerald-200"
      : "text-slate-200";

  const activeGlow =
    data.highlight === "red"
      ? "shadow-[0_0_22px_rgba(239,68,68,0.35)]"
      : data.highlight === "green"
      ? "shadow-[0_0_22px_rgba(16,185,129,0.35)]"
      : "shadow-[0_0_18px_rgba(148,163,184,0.18)]";

  return (
    <div
      className={cx(
        "flex gap-4 items-start p-4 rounded-xl border bg-slate-900/60 transition-all duration-700 will-change-transform",
        baseColor,
        isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        isActive && cx("scale-[1.01]", activeGlow)
      )}
    >
      <div
        className={cx(
          "mt-1 rounded-lg p-2 border transition-all duration-700",
          data.highlight === "red"
            ? "border-red-500/20 text-red-300 bg-red-500/5"
            : data.highlight === "green"
            ? "border-emerald-500/25 text-emerald-300 bg-emerald-500/5"
            : "border-white/10 text-slate-300 bg-white/5",
          isActive &&
            (data.highlight === "red"
              ? "shadow-[0_0_16px_rgba(239,68,68,0.35)]"
              : data.highlight === "green"
              ? "shadow-[0_0_16px_rgba(16,185,129,0.35)]"
              : "shadow-[0_0_14px_rgba(148,163,184,0.18)]")
        )}
      >
        {data.icon}
      </div>

      <div className="min-w-0">
        <div className={cx("font-semibold text-sm", textColor)}>
          {data.title}
        </div>
        {data.description && (
          <div className="text-xs text-slate-400 mt-1">{data.description}</div>
        )}

        {/* Active pulse bar */}
        <div className="mt-3">
          <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={cx(
                "h-full rounded-full transition-all duration-700",
                isActive ? "w-full" : "w-0",
                data.highlight === "red"
                  ? "bg-red-400/60"
                  : data.highlight === "green"
                  ? "bg-emerald-400/60"
                  : "bg-slate-300/40"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const FlowColumn: React.FC<FlowColumnProps> = ({
  title,
  titleClassName,
  nodes,
  summaryText,
  summaryHighlight,
  cadenceMs,
}) => {
  // We animate each column independently so SWIFT can feel "slow" and Goldwire "fast".
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  useEffect(() => {
    let mounted = true;
    let t: number;

    const tick = (currentIndex: number) => {
      if (!mounted) return;

      setActiveIndex(currentIndex);

      if (currentIndex >= nodes.length) {
        // We reached the end of the flow.
        // Hold this fully illuminated state for 8 seconds so the user can read it.
        t = window.setTimeout(() => {
          if (mounted) tick(-1);
        }, 8000);
      } else {
        // Normal step. Wait for the cadence duration, then advance.
        t = window.setTimeout(() => {
          if (mounted) tick(currentIndex + 1);
        }, cadenceMs);
      }
    };

    // Kick off the initial animation
    t = window.setTimeout(() => tick(0), 500);

    return () => {
      mounted = false;
      window.clearTimeout(t);
    };
  }, [cadenceMs, nodes.length]);

  const revealedCount = useMemo(() => {
    if (activeIndex < 0) return 0;
    if (activeIndex >= nodes.length) return nodes.length;
    return activeIndex + 1;
  }, [activeIndex, nodes.length]);

  const inSummary = activeIndex >= nodes.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h3 className={cx("text-lg font-semibold", titleClassName)}>{title}</h3>

        {/* Micro status chip */}
        <div
          className={cx(
            "ml-auto inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-slate-900/50",
            summaryHighlight
              ? "border-emerald-500/30 text-emerald-300"
              : "border-white/10 text-slate-300"
          )}
        >
          <Clock size={14} />
          {summaryHighlight ? "Deterministic" : "Probabilistic"}
        </div>
      </div>

      {nodes.map((n, i) => (
        <React.Fragment key={n.id}>
          <FlowNode
            data={n}
            isActive={i === activeIndex}
            isRevealed={i < revealedCount}
            side={summaryHighlight ? "right" : "left"}
          />
          {i !== nodes.length - 1 && <ArrowConnector dim={i >= revealedCount} />}
        </React.Fragment>
      ))}

      <SummaryCard text={summaryText} highlight={summaryHighlight} active={inSummary} />
    </div>
  );
};

const SystemComparisonChart: React.FC = () => {
  const swiftNodes: FlowNodeData[] = [
    {
      id: "swift-1",
      icon: <Building2 size={20} />,
      title: "Initiation: US Business sends $500k",
      description: "Time: Day 1 | Fee: $50",
    },
    {
      id: "swift-2",
      icon: <Landmark size={20} />,
      title: "Clearing House: FedWire / Intermediary",
      description: "Time: Day 1-2",
    },
    {
      id: "swift-3",
      icon: <Globe size={20} />,
      title: "Correspondent Bank: Global Docking",
      description: "Time: Day 2-3 | Fee: $25-$50",
    },
    {
      id: "swift-4",
      icon: <Banknote size={20} />,
      title: "FX Trading Desk: USD to SGD Conversion",
      description: "Hidden 2% FX Spread: ~$10,000",
      highlight: "red",
    },
    {
      id: "swift-5",
      icon: <Building2 size={20} />,
      title: "Final Delivery: Singapore Supplier",
      description: "Time: Day 4-5",
    },
  ];

  const goldwireNodes: FlowNodeData[] = [
    {
      id: "gw-1",
      icon: <Banknote size={20} />,
      title: "The On-Ramp",
      description:
        "Fiat instantly mapped to allocated gold | Time: 1 sec | Transparent Margin: Spot + 1%",
      highlight: "green",
    },
    {
      id: "gw-2",
      icon: <Zap size={20} />,
      title: "The Goldwire",
      description:
        "Cryptographic title transfer via API | Time: 2 sec | Execution Fee: 0.25% in gold",
      highlight: "green",
    },
    {
      id: "gw-3",
      icon: <Building2 size={20} />,
      title: "The Off-Ramp",
      description:
        "Supplier instantly liquidates gold to local fiat | Time: 1 sec | Transparent Margin: Spot - 1%",
      highlight: "green",
    },
  ];

  return (
    <div className="bg-slate-900/40 border border-white/10 backdrop-blur-md rounded-2xl p-8">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-400">
            System Comparison
          </div>
          <h2 className="text-2xl font-semibold text-white mt-1">
            Settlement: Legacy SWIFT vs Goldwire
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Watch the flow illuminate. SWIFT cascades through multi-day, multi-party friction.
            Goldwire settles deterministically via cryptographic title transfer.
          </p>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 border border-white/10 bg-slate-900/40 rounded-full px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70 shadow-[0_0_10px_rgba(239,68,68,0.35)]" />
            Friction / Hidden Loss
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 border border-white/10 bg-slate-900/40 rounded-full px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70 shadow-[0_0_10px_rgba(16,185,129,0.35)]" />
            Deterministic / Transparent
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        <FlowColumn
          title="Legacy Fiat Rail (SWIFT)"
          titleClassName="text-red-400"
          nodes={swiftNodes}
          summaryText="Total Time: 5 Days | Total Cost: ~$10,100+"
          cadenceMs={1200} // slower cadence to feel “legacy”
        />

        <FlowColumn
          title="AurumShield Deterministic Settlement"
          titleClassName="text-emerald-400"
          nodes={goldwireNodes}
          summaryText="Total Time: < 10 Seconds | Total Cost: Transparent Spreads | Friction: ZERO"
          summaryHighlight
          cadenceMs={450} // fast cadence to feel “instant”
        />
      </div>
    </div>
  );
};

export default SystemComparisonChart;