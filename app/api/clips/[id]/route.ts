import { NextResponse } from "next/server";
import { getClip } from "@/lib/clips/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  let clip = null;

  try {
    clip = await getClip(id);
  } catch {
    return NextResponse.json({ error: "Failed to read clip" }, { status: 500 });
  }

  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  return NextResponse.json(clip);
}
