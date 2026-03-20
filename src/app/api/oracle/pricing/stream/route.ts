import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Pyth Network XAU/USD Feed ID
const PYTH_XAU_USD_ID = "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2";
const PYTH_URL = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_XAU_USD_ID}`;

export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send an initial connection success event
      controller.enqueue(encoder.encode("event: connected\ndata: true\n\n"));

      const fetchPrice = async () => {
        try {
          const res = await fetch(PYTH_URL, { cache: "no-store" });
          if (!res.ok) throw new Error("Pyth Network unavailable");

          const json = await res.json();
          const priceData = json.parsed?.[0]?.price;

          if (priceData) {
            // Pyth math: actual price = price * 10^expo
            const rawPrice = Number(priceData.price);
            const expo = Number(priceData.expo);
            const actualPrice = rawPrice * Math.pow(10, expo);

            // Format to match our existing frontend useGoldPrice hook
            const payload = {
              spotPriceUsd: Number(actualPrice.toFixed(2)),
              timestamp: new Date().toISOString(),
              status: "LIVE_PYTH_ORACLE",
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            );
          }
        } catch (error) {
          console.error("[ORACLE] Pyth Fetch Error:", error);
        }
      };

      // Fetch immediately, then poll every 2 seconds
      await fetchPrice();
      const intervalId = setInterval(fetchPrice, 2000);

      // Cleanup when the client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
