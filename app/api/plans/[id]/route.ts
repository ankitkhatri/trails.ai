import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  buildDayWriteInput,
  buildPlanWriteInput,
  buildRouteWriteInput,
  buildSavedPlanPayload,
  remapPlanSnapshotDayIds,
  toNullableInputJsonValue,
} from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { SavePlanRequest } from "@/lib/types";

const planInclude = {
  route: true,
  days: true,
} as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const plan = await prisma.trekPlan.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: planInclude,
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json(buildSavedPlanPayload(plan, "owner"));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SavePlanRequest;

    const existingPlan = await prisma.trekPlan.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const updatedPlan = await prisma.trekPlan.update({
      where: { id },
      data: {
        ...buildPlanWriteInput(body),
        route: {
          update: buildRouteWriteInput(body),
        },
        days: {
          deleteMany: {},
          create: buildDayWriteInput(body.dayPlans),
        },
      },
      include: planInclude,
    });

    const { remappedAnalysis, remappedScenery } = remapPlanSnapshotDayIds(
      body.dayPlans,
      updatedPlan.days,
      body.analysis,
      body.dayScenery
    );

    const hydratedPlan = await prisma.trekPlan.update({
      where: { id },
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
          caughtError instanceof Error ? caughtError.message : "Unable to update plan.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const existingPlan = await prisma.trekPlan.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingPlan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  await prisma.trekPlan.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
