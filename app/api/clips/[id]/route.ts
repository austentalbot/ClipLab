import { NextResponse } from "next/server";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, { params }: RouteContext) {
  return NextResponse.json(
    {
      message: `TODO: fetch clip ${params.id} from local JSON storage.`,
    },
    { status: 501 }
  );
}
