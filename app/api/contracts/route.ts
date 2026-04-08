import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createContractCase, listContracts } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";
import { writeAuditLog } from "@/lib/audit";
import { formatApiError } from "@/lib/api-errors";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: formatApiError("UNAUTHORIZED", "尚未登入。") }, { status: 401 });
  const contracts = await listContracts();
  return NextResponse.json({ ok: true, contracts });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: formatApiError("UNAUTHORIZED", "尚未登入。") }, { status: 401 });
  const body = await request.json();
  const contract = await createContractCase(body, admin.id);
  await writeAuditLog({
    action: "create_case_api",
    actorType: "admin",
    actorId: admin.id,
    contractCaseId: contract.id,
    ipAddress: getRequestIp(request),
    userAgent: getRequestUserAgent(request),
    meta: { contractNo: contract.contractNo }
  });
  return NextResponse.json({
    ok: true,
    contract
  });
}
