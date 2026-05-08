import { NextResponse } from "next/server";
import { getGrammarAudit, runGrammarAudit } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await getGrammarAudit(token));
  } catch (error) {
    return apiError(error, "Could not load grammar audit.");
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await runGrammarAudit(token));
  } catch (error) {
    return apiError(error, "Could not run grammar audit.");
  }
}
