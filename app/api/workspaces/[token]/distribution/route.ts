import type { DistributionPlatform, DistributionRequest } from "@/types/ai";
import { NextResponse } from "next/server";
import { generateDistributionDrafts } from "@/lib/server/ai";
import { AppError, apiError } from "@/lib/server/errors";
import { readJson, requireString } from "@/lib/server/http";

type RouteContext = { params: Promise<{ token: string }> };

const platforms: DistributionPlatform[] = ["twitter", "linkedin", "facebook", "instagram", "reddit"];

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await readJson<DistributionRequest>(request);
    const postId = requireString(body.postId, "Choose a post to repurpose.");
    const platform = requireString(body.platform, "Choose a platform.") as DistributionPlatform;
    if (!platforms.includes(platform)) {
      throw new AppError("Platform must be twitter, linkedin, facebook, instagram, or reddit.", 400);
    }

    return NextResponse.json({ drafts: await generateDistributionDrafts(token, postId, platform) });
  } catch (error) {
    return apiError(error, "Could not generate distribution drafts.");
  }
}
