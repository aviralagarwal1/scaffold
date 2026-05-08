import { NextResponse } from "next/server";

import { AppError } from "./app-error";
export { AppError } from "./app-error";

export function apiError(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
