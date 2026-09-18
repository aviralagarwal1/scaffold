import type { AskRequest } from "@/types/ai";
import { NextResponse } from "next/server";
import { answerArchiveQuestion } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";
import { appendChatExchange, getChatSessionTurns } from "@/lib/server/history";
import { readJson, requireString } from "@/lib/server/http";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function POST(request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    const userId = await requireWorkspaceAccess(token, "edit");
    const body = await readJson<AskRequest>(request);
    const message = requireString(body.message, "Ask a question.");
    const requestedSessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const history = await getChatSessionTurns(token, userId, requestedSessionId);
    const response = await answerArchiveQuestion(token, message, { history });
    const sessionId = await appendChatExchange({
      token,
      userId,
      sessionId: requestedSessionId,
      message,
      answer: response.answer,
      sources: response.sources ?? [],
    });
    return NextResponse.json({ ...response, sessionId });
  } catch (error) {
    return apiError(error, "Could not answer from your library.");
  }
}
