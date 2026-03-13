"use client";

/* ================================================================
   DEMO TOOLTIP — Floating Gold Arrow Tooltip
   ================================================================
   Renders adjacent to spotlighted elements during the demo tour.
   Uses the AurumShield gold palette with bounce animation.
   ================================================================ */

interface DemoTooltipProps {
  text: string;
  /** Position relative to the spotlighted element */
  position?: "top" | "bottom";
}

export function DemoTooltip({ text, position = "top" }: DemoTooltipProps) {
  const isTop = position === "top";

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-110 animate-bounce ${
        isTop ? "bottom-full mb-3" : "top-full mt-3"
      }`}
    >
      <div className="bg-gold-primary text-slate-950 text-sm font-bold px-4 py-2 rounded shadow-2xl whitespace-nowrap">
        {text}
      </div>
      {/* Arrow */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent ${
          isTop
            ? "top-full border-t-[6px] border-t-gold-primary"
            : "bottom-full border-b-[6px] border-b-gold-primary"
        }`}
      />
    </div>
  );
}
