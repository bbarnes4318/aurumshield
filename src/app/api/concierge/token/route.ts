/* ================================================================
   CONCIERGE TOKEN API — Mints ephemeral Gemini Live API tokens
   
   POST /api/concierge/token
   
   Returns a short-lived token that the browser uses to connect
   directly to Gemini's WebSocket servers. Audio never touches our
   backend — this eliminates proxy latency entirely.
   
   Requires GEMINI_API_KEY in server environment.
   ================================================================ */

import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  CONCIERGE_TOOL_DECLARATIONS,
  CONCIERGE_SYSTEM_INSTRUCTION,
} from "@/demo/concierge/conciergeTypes";

const MODEL = "gemini-3.1-flash-live-preview";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("[Concierge Token] GEMINI_API_KEY not configured");
    return NextResponse.json(
      { error: "Voice concierge not configured" },
      { status: 503 },
    );
  }

  try {
    const client = new GoogleGenAI({ apiKey });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            temperature: 0.2,
            systemInstruction: CONCIERGE_SYSTEM_INSTRUCTION,
            tools: CONCIERGE_TOOL_DECLARATIONS,
          },
        },
        httpOptions: {
          apiVersion: "v1alpha",
        },
      },
    });

    if (!token?.name) {
      console.error("[Concierge Token] Token creation returned no name");
      return NextResponse.json(
        { error: "Failed to create voice session token" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      token: token.name,
      model: MODEL,
      expiresAt: expireTime,
    });
  } catch (err) {
    console.error("[Concierge Token] Failed to create ephemeral token:", err);
    return NextResponse.json(
      { error: "Failed to create voice session" },
      { status: 500 },
    );
  }
}
