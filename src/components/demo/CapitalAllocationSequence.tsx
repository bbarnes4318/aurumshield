/* ================================================================
   CAPITAL ALLOCATION SEQUENCE

   Animated capital metrics shown after activation payment success.
   Clean count-up numbers (300ms duration), no spinners.
   Monospace, tabular numerals, institutional typography.
   ================================================================ */

"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Shield, AlertTriangle } from "lucide-react";

interface CapitalMetric {
  label: string;
  from: number;
  to: number;
  format: "usd" | "ratio" | "percent";
  direction: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

const METRICS: CapitalMetric[] = [
  {
    label: "Capital Base",
    from: 0,
    to: 25_000_000,
    format: "usd",
    direction: "neutral",
    icon: <Shield className="h-3.5 w-3.5 text-text-muted" />,
  },
  {
    label: "Exposure",
    from: 0,
    to: 4_850_000,
    format: "usd",
    direction: "up",
    icon: <TrendingUp className="h-3.5 w-3.5 text-warning" />,
  },
  {
    label: "Available Capacity",
    from: 0,
    to: 20_150_000,
    format: "usd",
    direction: "down",
    icon: <TrendingDown className="h-3.5 w-3.5 text-text-muted" />,
  },
  {
    label: "Hardstop Utilization",
    from: 0,
    to: 19.4,
    format: "percent",
    direction: "neutral",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-text-faint" />,
  },
];

function formatValue(value: number, format: CapitalMetric["format"]): string {
  switch (format) {
    case "usd":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "ratio":
      return `${value.toFixed(2)}x`;
    case "percent":
      return `${value.toFixed(1)}%`;
    default:
      return String(value);
  }
}

function useCountUp(
  to: number,
  duration: number = 300,
  trigger: boolean = true,
): number {
  const [current, setCurrent] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) {
      setCurrent(0);
      return;
    }

    startRef.current = null;

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * to);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [to, duration, trigger]);

  return current;
}

function MetricRow({
  metric,
  trigger,
  delay,
}: {
  metric: CapitalMetric;
  trigger: boolean;
  delay: number;
}) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [trigger, delay]);

  const value = useCountUp(metric.to, 300, started);

  return (
    <div
      className={`flex items-center justify-between rounded-sm border border-border bg-surface-2 px-4 py-3 transition-opacity duration-300 ${
        started ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {metric.icon}
        <span className="text-xs font-medium text-text-muted">
          {metric.label}
        </span>
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums text-text">
        {formatValue(value, metric.format)}
      </span>
    </div>
  );
}

interface CapitalAllocationSequenceProps {
  /** Whether to trigger the animation */
  active?: boolean;
}

export function CapitalAllocationSequence({
  active = true,
}: CapitalAllocationSequenceProps) {
  return (
    <div
      className="card-base border border-border p-5 space-y-3"
      data-tour="capital-allocation"
    >
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text">
          Capital Allocation
        </h3>
      </div>

      <p className="text-[10px] uppercase tracking-wider text-text-faint">
        Post-Activation Capital Position
      </p>

      <div className="space-y-2">
        {METRICS.map((metric, idx) => (
          <MetricRow
            key={metric.label}
            metric={metric}
            trigger={active}
            delay={idx * 120}
          />
        ))}
      </div>

      {/* Hardstop indicator */}
      <div className="flex items-center gap-2 rounded-sm bg-success/5 border border-success/20 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="text-[11px] font-medium text-success">
          Hardstop Clear — Capacity Available
        </span>
      </div>
    </div>
  );
}
