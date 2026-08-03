import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import queueModule from "../../../../../server/jobs/queue";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await params;
  const queueName = new URL(req.url).searchParams.get("queue") || "smart-manage";
  const status = await queueModule.getQueue(queueName).getStatus(jobId);
  return status ? NextResponse.json(status) : NextResponse.json({ error: "Job not found" }, { status: 404 });
}
