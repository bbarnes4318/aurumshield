/* ================================================================
   BROKER COMMAND CENTER — Landing page stub
   ================================================================
   TODO: Build out the broker dashboard with deal metrics,
   client overview, and pending DvP swaps.
   ================================================================ */

export default function BrokerCommandCenter() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
        Command Center
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Broker dashboard — deal metrics, client overview, and pending DvP swaps.
      </p>

      {/* Placeholder grid */}
      <div className="mt-8 grid grid-cols-3 gap-6">
        {[
          { label: "Active Deals", value: "—" },
          { label: "Client Entities", value: "—" },
          { label: "Commission (MTD)", value: "—" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-6"
          >
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold font-mono text-slate-300">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
