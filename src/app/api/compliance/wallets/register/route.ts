/* ================================================================
   POST /api/compliance/wallets/register
   ================================================================
   HTTP bridge for serverRegisterFundingWallet().
   Called by the funding page after saving wallet details.

   Body: { address, network, asset, legalName? }
   Response: { status, walletId?, isNew?, error? }
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import {
  serverRegisterFundingWallet,
} from "@/lib/actions/register-wallet-action";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { address, network, asset, legalName } = body as {
      address?: string;
      network?: string;
      asset?: string;
      legalName?: string;
    };

    if (!address || !network || !asset) {
      return NextResponse.json(
        {
          status: "ERROR" as const,
          error: "Missing required fields: address, network, asset",
        },
        { status: 400 },
      );
    }

    const result = await serverRegisterFundingWallet({
      address,
      network,
      asset,
      legalName,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[COMPLIANCE] POST /api/compliance/wallets/register failed:", err);
    return NextResponse.json(
      {
        status: "ERROR" as const,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
