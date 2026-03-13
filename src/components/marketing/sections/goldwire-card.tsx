"use client";

/* ================================================================
   GOLDWIRE CARD — Physical Corporate Instrument Showcase
   ================================================================ */

export function GoldwireCardSection() {
  return (
    <section
      id="card"
      className="py-24 lg:py-32 relative overflow-hidden bg-slate-950 border-t border-slate-800/50"
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C6A86B]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="bg-[#0B0E14] border border-slate-800 rounded-3xl p-8 lg:p-16 shadow-2xl overflow-hidden relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
            {/* Left Column: The Copy */}
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px w-8 bg-[#C6A86B]/50" />
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]">
                  THE CORPORATE INSTRUMENT
                </p>
              </div>
              <h2 className="font-heading text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight text-white leading-tight mb-6">
                Physical Sovereignty.
                <br />
                <span className="text-gray-400">Digital Velocity.</span>
              </h2>
              <p className="text-lg leading-relaxed text-gray-300 mb-8">
                Anchor your digital settlement network in undeniable physical
                reality. The Goldwire Corporate Card allows institutional
                treasuries to instantly liquidate vaulted bullion to local fiat
                at any point of sale globally.
              </p>

              <ul className="space-y-4 mb-10">
                {[
                  "Direct API liquidation to local fiat",
                  "Zero legacy FX friction or banking limits",
                  "Milled from heavy metal for sovereign-tier clients",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-[#C6A86B]" />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-[#C6A86B]/10 border border-[#C6A86B]/30 px-6 py-3 text-sm font-semibold text-[#C6A86B] transition-all hover:bg-[#C6A86B]/20"
              >
                Request Card Issuance
              </a>
            </div>

            {/* Right Column: The Floating Card Image */}
            <div className="relative flex justify-center items-center h-full min-h-[400px]">
              {/* Inner glow directly behind the card */}
              <div className="absolute inset-0 bg-linear-to-tr from-[#C6A86B]/20 to-transparent blur-3xl opacity-50 rounded-full" />

              {/* The Image with a continuous floating animation */}
              <div
                className="relative w-full max-w-[450px] transform hover:scale-105 transition-transform duration-700 ease-out"
                style={{ animation: "goldwireFloat 6s ease-in-out infinite" }}
              >
                <style>{`
                  @keyframes goldwireFloat {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                    100% { transform: translateY(0px); }
                  }
                `}</style>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/gold-wire.png"
                  alt="Goldwire Corporate Card"
                  className="w-full h-auto drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)] relative z-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
