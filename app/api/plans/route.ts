import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  buildDayWriteInput,
  buildPlanWriteInput,
  buildRouteWriteInput,
  buildSavedPlanPayload,
  buildSavedPlanSummary,
  remapPlanSnapshotDayIds,
  toNullableInputJsonValue,
} from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { SavePlanRequest } from "@/lib/types";

const planInclude = {
  route: true,
  days: true,
} as const;

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const plans = await prisma.trekPlan.findMany({
    where: { ownerId: session.user.id },
    include: planInclude,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    plans: plans.map((plan) => buildSavedPlanSummary(plan)),
  });
}

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SavePlanRequest;

    const createdPlan = await prisma.trekPlan.create({
      data: {
        ...buildPlanWriteInput(body),
        owner: {
          connect: {
            id: session.user.id,
          },
        },
        route: {
          create: {
            owner: {
              connect: {
                id: session.user.id,
              },
            },
            ...buildRouteWriteInput(body),
          },
        },
        days: {
          create: buildDayWriteInput(body.dayPlans),
        },
      },
      include: planInclude,
    });

    const { remappedAnalysis, remappedScenery } = remapPlanSnapshotDayIds(
      body.dayPlans,
      createdPlan.days,
      body.analysis,
      body.dayScenery
    );

    const hydratedPlan = await prisma.trekPlan.update({
      where: { id: createdPlan.id },
      data: {
        analysisSnapshot: toNullableInputJsonValue(remappedAnalysis),
        scenerySnapshot: toNullableInputJsonValue(remappedScenery),
      },
      include: planInclude,
    });

    return NextResponse.json(buildSavedPlanPayload(hydratedPlan, "owner"));
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "Unable to create plan.",
      },
      { status: 400 }
    );
  }
}
