import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message: "TODO: list clip metadata from local JSON storage.",
    },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      message:
        "TODO: accept raw upload, save the audio file locally, and persist clip metadata to local JSON storage.",
    },
    { status: 501 }
  );
}
