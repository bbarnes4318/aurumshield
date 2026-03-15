import { NextResponse } from "next/server";
import { getPoolClient } from "@/lib/db";

export async function GET() {
  try {
    // Deep Check: Physically verify the connection pool can reach the RDS instance
    const client = await getPoolClient();
    await client.query("SELECT 1 AS health_check");
    client.release();

    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HEALTH CHECK FAILED] Database unreachable:", error);
    
    // 503 Status signals the AWS Application Load Balancer to drain traffic 
    // from this ECS task and flag it for replacement.
    return NextResponse.json(
      { 
        status: "error", 
        message: "Database connection failed", 
        timestamp: new Date().toISOString() 
      },
      { status: 503 } 
    );
  }
}
