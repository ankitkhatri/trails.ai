import { NextResponse } from "next/server";
import { buildSavedPlanPayload } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { token } = await params;
  const plan = await prisma.trekPlan.findUnique({
    where: {
      shareToken: token,
    },
    include: {
      route: true,
      days: true,
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Shared plan not found." }, { status: 404 });
  }

  return NextResponse.json(buildSavedPlanPayload(plan, "shared-readonly"));
}
