import { prisma } from "./db";

export async function writeAuditLog(params: {
  contractCaseId?: string | null;
  action: string;
  actorType: string;
  actorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  meta?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      contractCaseId: params.contractCaseId ?? null,
      action: params.action,
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metaJson: params.meta === undefined ? null : JSON.stringify(params.meta)
    }
  });
}
