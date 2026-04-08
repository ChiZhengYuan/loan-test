import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
import { ContractCase, ContractPdfArchive, ContractSignature } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { randomOtp, randomToken, sha256 } from "./crypto";
import { ensureContractDirs, ensureStorage, pdfRoot, safeFileName } from "./storage";
import {
  borrowerProfileSchema,
  signProfileSchema,
  completeSchema,
  consentSchema,
  contractCreateSchema,
  gpsSchema,
  verifyOtpSchema
} from "./zod";
import { writeAuditLog } from "./audit";
import { buildLegalDocumentText } from "./contract";
import { ContractSnapshot, SignGpsPayload, SignProfile } from "./types";
import { generateContractPdf } from "./pdf";
import { sendTelegramPdf } from "./telegram";

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toContractSnapshot(contract: ContractCase): ContractSnapshot {
  const clauseSnapshot = parseJson<any>(contract.clauseSnapshotJson, {
    specialTerms: contract.specialTerms,
    courtJurisdiction: contract.courtJurisdiction
  });
  return {
    lender: parseJson(contract.lenderSnapshotJson, { name: contract.lenderName, id: contract.lenderId, phone: contract.lenderPhone }),
    borrowerHint: parseJson(contract.borrowerSnapshotJson, { name: contract.borrowerNameHint, phone: contract.borrowerPhone }),
    vehicle: parseJson(contract.vehicleSnapshotJson, {
      plate: contract.vehiclePlate,
      model: contract.vehicleModel,
      color: contract.vehicleColor,
      year: contract.vehicleYear
    }),
    schedule: {
      borrowStartAt: contract.borrowStartAt.toISOString(),
      borrowEndAt: contract.borrowEndAt.toISOString()
    },
    finance: {
      depositAmount: contract.depositAmount.toString(),
      overduePenaltyPerDay: contract.overduePenaltyPerDay.toString()
    },
    terms: {
      specialTerms: clauseSnapshot.specialTerms ?? contract.specialTerms,
      courtJurisdiction: clauseSnapshot.courtJurisdiction ?? contract.courtJurisdiction
    }
  };
}

export async function makeContractNo() {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  const count = await prisma.contractCase.count({
    where: {
      createdAt: {
        gte: start,
        lte: end
      }
    }
  });
  return `BV${format(today, "yyyyMMdd")}-${String(count + 1).padStart(3, "0")}`;
}

export async function createContractCase(input: unknown, actorId?: string | null) {
  await ensureStorage();
  const data = contractCreateSchema.parse(input);
  const contractNo = await makeContractNo();
  const signToken = randomToken(32);
  const publicSigningUrl = `${env.APP_URL.replace(/\/$/, "")}/sign/${signToken}`;
  const lenderSnapshot = { name: data.lenderName, id: data.lenderId, phone: data.lenderPhone };
  const borrowerHint = { name: data.borrowerNameHint ?? null, phone: data.borrowerPhone };
  const vehicleSnapshot = {
    plate: data.vehiclePlate,
    model: data.vehicleModel,
    color: data.vehicleColor,
    year: data.vehicleYear
  };
  const frozenContractDocument = buildLegalDocumentText(
    {
      lender: lenderSnapshot,
      borrowerHint,
      vehicle: vehicleSnapshot,
      schedule: {
        borrowStartAt: new Date(data.borrowStartAt).toISOString(),
        borrowEndAt: new Date(data.borrowEndAt).toISOString()
      },
      finance: {
        depositAmount: String(data.depositAmount),
        overduePenaltyPerDay: String(data.overduePenaltyPerDay)
      },
      terms: {
        specialTerms: data.specialTerms,
        courtJurisdiction: data.courtJurisdiction
      }
    },
    contractNo
  );

  const contract = await prisma.contractCase.create({
    data: {
      contractNo,
      signToken,
      publicSigningUrl,
      lenderName: data.lenderName,
      lenderId: data.lenderId,
      lenderPhone: data.lenderPhone,
      borrowerNameHint: data.borrowerNameHint ?? null,
      borrowerPhone: data.borrowerPhone,
      vehiclePlate: data.vehiclePlate,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
      vehicleYear: data.vehicleYear,
      borrowStartAt: new Date(data.borrowStartAt),
      borrowEndAt: new Date(data.borrowEndAt),
      depositAmount: data.depositAmount,
      overduePenaltyPerDay: data.overduePenaltyPerDay,
      specialTerms: data.specialTerms,
      courtJurisdiction: data.courtJurisdiction,
      lenderSnapshotJson: JSON.stringify(lenderSnapshot),
      borrowerSnapshotJson: JSON.stringify(borrowerHint),
      vehicleSnapshotJson: JSON.stringify(vehicleSnapshot),
      clauseSnapshotJson: JSON.stringify(frozenContractDocument)
    }
  });

  await ensureContractDirs(contractNo);
  await writeAuditLog({
    contractCaseId: contract.id,
    action: "create_case",
    actorType: "admin",
    actorId: actorId ?? null,
    meta: { contractNo, publicSigningUrl }
  });

  return contract;
}

export async function listContracts() {
  return prisma.contractCase.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pdfArchive: true,
      signature: true,
      borrowerSnapshot: true
    }
  });
}

export async function getContractById(id: string) {
  return prisma.contractCase.findUnique({
    where: { id },
    include: {
      borrowerSnapshot: true,
      documents: true,
      consentLogs: true,
      otpLogs: true,
      signature: true,
      pdfArchive: true,
      auditLogs: true
    }
  });
}

export async function getContractByToken(token: string) {
  return prisma.contractCase.findUnique({
    where: { signToken: token },
    include: {
      borrowerSnapshot: true,
      documents: true,
      consentLogs: true,
      otpLogs: true,
      signature: true,
      pdfArchive: true,
      auditLogs: true
    }
  });
}

export async function updateBorrowerProfile(token: string, input: unknown, requestInfo?: { ip?: string | null; userAgent?: string | null }) {
  const profile = signProfileSchema.parse(input);
  const contract = await prisma.contractCase.findUnique({ where: { signToken: token } });
  if (!contract) throw new Error('CASE_NOT_FOUND');
  if (contract.status !== 'PENDING_SIGN') throw new Error('CASE_NOT_SIGNABLE');

  const borrowerSnapshot = {
    fullName: profile.fullName,
    identityNumber: profile.identityNumber,
    birthDate: new Date(profile.birthDate),
    phone: profile.phone,
    address: profile.address,
    licenseNumber: profile.licenseNumber,
    profileJson: JSON.stringify(profile)
  };
  const vehicleSnapshot = {
    plate: profile.vehiclePlate,
    model: profile.vehicleModel,
    color: profile.vehicleColor,
    year: profile.vehicleYear
  };
  const borrowStartAt = new Date(profile.borrowStartAt);
  const borrowEndAt = new Date(profile.borrowEndAt);

  const updatedBorrower = await prisma.$transaction(async (tx) => {
    const updatedContract = await tx.contractCase.update({
      where: { id: contract.id },
      data: {
        borrowerNameHint: profile.fullName,
        borrowerPhone: profile.phone,
        borrowerSnapshotJson: JSON.stringify({ name: profile.fullName, phone: profile.phone }),
        vehiclePlate: profile.vehiclePlate,
        vehicleModel: profile.vehicleModel,
        vehicleColor: profile.vehicleColor,
        vehicleYear: profile.vehicleYear,
        borrowStartAt,
        borrowEndAt,
        vehicleSnapshotJson: JSON.stringify(vehicleSnapshot)
      }
    });

    const refreshedSnapshot = toContractSnapshot(updatedContract as any);
    const refreshedDocument = buildLegalDocumentText(refreshedSnapshot, updatedContract.contractNo);
    await tx.contractCase.update({
      where: { id: contract.id },
      data: {
        clauseSnapshotJson: JSON.stringify(refreshedDocument)
      }
    });

    return tx.borrowerSnapshot.upsert({
      where: { contractCaseId: contract.id },
      update: borrowerSnapshot,
      create: {
        contractCaseId: contract.id,
        ...borrowerSnapshot
      }
    });
  });

  await writeAuditLog({
    contractCaseId: contract.id,
    action: 'submit_profile',
    actorType: 'borrower',
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: {
      fullName: profile.fullName,
      vehiclePlate: profile.vehiclePlate,
      borrowStartAt: profile.borrowStartAt,
      borrowEndAt: profile.borrowEndAt
    }
  });

  return updatedBorrower;
}

export async function saveBorrowerDocuments(
  token: string,
  files: Array<{ documentType: "id_front" | "license_front"; fileName: string; mimeType: string; buffer: Buffer }>
) {
  const contract = await prisma.contractCase.findUnique({ where: { signToken: token } });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  if (contract.status !== "PENDING_SIGN") throw new Error("CASE_NOT_SIGNABLE");
  await ensureContractDirs(contract.contractNo);
  const dir = path.join(process.cwd(), env.STORAGE_DIR, "contracts", contract.contractNo, "documents");
  const saved: string[] = [];

  for (const file of files) {
    const safeName = safeFileName(`${file.documentType}-${file.fileName}`);
    const filePath = path.join(dir, `${Date.now()}-${safeName}`);
    await fs.writeFile(filePath, file.buffer);
    const hash = sha256(file.buffer);
    saved.push(filePath);

    await prisma.borrowerDocument.create({
      data: {
        contractCaseId: contract.id,
        documentType: file.documentType,
        fileName: file.fileName,
        filePath,
        mimeType: file.mimeType,
        fileSize: file.buffer.byteLength,
        sha256: hash
      }
    });
  }

  await writeAuditLog({
    contractCaseId: contract.id,
    action: "upload_documents",
    actorType: "borrower",
    meta: { count: files.length, files: saved }
  });
}

export async function saveConsents(token: string, input: unknown, requestInfo?: { ip?: string | null; userAgent?: string | null }) {
  const consents = consentSchema.parse(input);
  const contract = await prisma.contractCase.findUnique({ where: { signToken: token } });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  if (contract.status !== "PENDING_SIGN") throw new Error("CASE_NOT_SIGNABLE");

  await prisma.contractConsentLog.createMany({
    data: Object.entries(consents).map(([key, value]) => ({
      contractCaseId: contract.id,
      consentKey: key,
      consentValue: value,
      ipAddress: requestInfo?.ip ?? null,
      userAgent: requestInfo?.userAgent ?? null
    }))
  });

  await prisma.contractCase.update({
    where: { id: contract.id },
    data: {
      consentsSnapshotJson: JSON.stringify({
        consents,
        capturedAt: new Date().toISOString(),
        ipAddress: requestInfo?.ip ?? null,
        userAgent: requestInfo?.userAgent ?? null
      })
    }
  });

  await writeAuditLog({
    contractCaseId: contract.id,
    action: "confirm_consents",
    actorType: "borrower",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: consents
  });
}

export async function saveGps(token: string, input: unknown, requestInfo?: { ip?: string | null; userAgent?: string | null }) {
  const gps = gpsSchema.parse(input) as SignGpsPayload;
  const contract = await prisma.contractCase.findUnique({ where: { signToken: token } });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  if (contract.status !== "PENDING_SIGN") throw new Error("CASE_NOT_SIGNABLE");

  await prisma.contractCase.update({
    where: { id: contract.id },
    data: {
      gpsLatitude: gps.latitude ?? null,
      gpsLongitude: gps.longitude ?? null,
      gpsAccuracy: gps.accuracy ?? null,
      gpsStatus: gps.gpsStatus,
      gpsCapturedAt: gps.capturedAt ? new Date(gps.capturedAt) : new Date(),
      updatedAt: new Date()
    }
  });

  await writeAuditLog({
    contractCaseId: contract.id,
    action: "capture_gps",
    actorType: "borrower",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: gps
  });
  return gps;
}

export async function sendOtp(token: string, requestInfo?: { ip?: string | null; userAgent?: string | null }) {
  const contract = await prisma.contractCase.findUnique({ where: { signToken: token } });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  if (contract.status !== "PENDING_SIGN") throw new Error("CASE_NOT_SIGNABLE");

  const now = Date.now();
  const lastSentAt = contract.otpSentAt ? new Date(contract.otpSentAt).getTime() : 0;
  if (lastSentAt && now - lastSentAt < 60_000) {
    throw new Error("OTP_TOO_SOON");
  }

  const code = process.env.OTP_MOCK_ENABLED === "false" ? randomOtp() : (process.env.OTP_DEFAULT_CODE ?? randomOtp());
  const hash = sha256(code);
  const otpSentAt = new Date();
  await prisma.contractCase.update({
    where: { id: contract.id },
    data: {
      otpCodeHash: hash,
      otpSentAt,
      otpAttemptCount: 0
    }
  });
  await prisma.contractOtpLog.create({
    data: {
      contractCaseId: contract.id,
      action: "send",
      phone: contract.borrowerPhone,
      otpHash: hash,
      attemptNo: 0,
      status: "sent",
      metaJson: JSON.stringify({ mock: process.env.OTP_MOCK_ENABLED !== "false", code })
    }
  });
  await writeAuditLog({
    contractCaseId: contract.id,
    action: "send_otp",
    actorType: "system",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: { phone: contract.borrowerPhone, mockCode: code }
  });
  return {
    phone: contract.borrowerPhone,
    otpSentAt,
    mockCode: process.env.OTP_MOCK_ENABLED !== "false" ? code : undefined,
    retryAfterSeconds: 60
  };
}
export async function verifyOtp(token: string, input: unknown, requestInfo?: { ip?: string | null; userAgent?: string | null }) {
  const { code } = verifyOtpSchema.parse(input);
  const contract = await prisma.contractCase.findUnique({ where: { signToken: token } });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  if (contract.status !== "PENDING_SIGN") throw new Error("CASE_NOT_SIGNABLE");
  if (!contract.otpCodeHash) throw new Error("OTP_NOT_SENT");
  const attemptCount = contract.otpAttemptCount + 1;
  if (attemptCount > 8) throw new Error("OTP_TOO_MANY_ATTEMPTS");
  const verified = sha256(code) === contract.otpCodeHash;

  await prisma.contractCase.update({
    where: { id: contract.id },
    data: {
      otpAttemptCount: attemptCount,
      otpVerifiedAt: verified ? new Date() : contract.otpVerifiedAt
    }
  });
  await prisma.contractOtpLog.create({
    data: {
      contractCaseId: contract.id,
      action: "verify",
      phone: contract.borrowerPhone,
      otpHash: sha256(code),
      attemptNo: attemptCount,
      status: verified ? "verified" : "failed",
      metaJson: JSON.stringify({ verified })
    }
  });
  await writeAuditLog({
    contractCaseId: contract.id,
    action: verified ? "otp_verified" : "otp_failed",
    actorType: "borrower",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: { attemptCount, verified }
  });

  return { verified, attemptCount };
}

export async function saveSignature(
  token: string,
  input: unknown,
  requestInfo?: { ip?: string | null; userAgent?: string | null }
) {
  const parsed = completeSchema.pick({ signatureDataUrl: true, signerName: true }).parse(input);
  const contract = await prisma.contractCase.findUnique({ where: { signToken: token }, include: { borrowerSnapshot: true } });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  if (contract.status !== "PENDING_SIGN") throw new Error("CASE_NOT_SIGNABLE");
  if (!contract.otpVerifiedAt) throw new Error("OTP_NOT_VERIFIED");
  const [, base64] = parsed.signatureDataUrl.split(",");
  if (!base64) throw new Error("INVALID_SIGNATURE");
  await ensureContractDirs(contract.contractNo);
  const signatureBytes = Buffer.from(base64, "base64");
  const signaturePath = path.join(process.cwd(), env.STORAGE_DIR, "contracts", contract.contractNo, "signature", `signature-${Date.now()}.png`);
  await fs.writeFile(signaturePath, signatureBytes);
  const signatureSha256 = sha256(signatureBytes);
  const signerIdentity = contract.borrowerSnapshot?.identityNumber ?? contract.borrowerNameHint ?? parsed.signerName;
  const signerPhone = contract.borrowerSnapshot?.phone ?? contract.borrowerPhone;

  const saved = await prisma.contractSignature.upsert({
    where: { contractCaseId: contract.id },
    update: {
      signaturePath,
      signatureSha256,
      signerName: parsed.signerName,
      signerIdentity,
      signerPhone,
      signatureMetaJson: JSON.stringify({
        userAgent: requestInfo?.userAgent ?? null,
        ipAddress: requestInfo?.ip ?? null
      })
    },
    create: {
      contractCaseId: contract.id,
      signaturePath,
      signatureSha256,
      signerName: parsed.signerName,
      signerIdentity,
      signerPhone,
      signatureMetaJson: JSON.stringify({
        userAgent: requestInfo?.userAgent ?? null,
        ipAddress: requestInfo?.ip ?? null
      })
    }
  });

  await writeAuditLog({
    contractCaseId: contract.id,
    action: "capture_signature",
    actorType: "borrower",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: { signaturePath, signatureSha256 }
  });

  return saved;
}

function requireReadyToComplete(contract: ContractCase & { borrowerSnapshot: any; signature: ContractSignature | null }) {
  if (contract.status !== "PENDING_SIGN") throw new Error("CASE_NOT_SIGNABLE");
  if (!contract.borrowerSnapshot) throw new Error("PROFILE_NOT_COMPLETE");
  if (!contract.consentsSnapshotJson) throw new Error("CONSENTS_NOT_COMPLETE");
  if (!contract.otpVerifiedAt) throw new Error("OTP_NOT_VERIFIED");
  if (!contract.signature) throw new Error("SIGNATURE_NOT_CAPTURED");
}

export async function completeContract(token: string, requestInfo?: { ip?: string | null; userAgent?: string | null }) {
  const contract = await prisma.contractCase.findUnique({
    where: { signToken: token },
    include: { borrowerSnapshot: true, signature: true, pdfArchive: true }
  });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  requireReadyToComplete(contract as any);
  if (contract.pdfArchive?.pdfPath) {
    let telegramSent = false;
    let telegramReason: string | null = null;
    try {
      const telegramResult = await sendTelegramPdf({
        pdfPath: contract.pdfArchive.pdfPath,
        fileName: `contract-${contract.contractNo}.pdf`,
        caption: `契約 ${contract.contractNo} 已簽署完成，PDF 已封存。`
      });
      telegramSent = Boolean(telegramResult.sent);
      telegramReason = telegramResult.sent ? null : telegramResult.reason;
      await writeAuditLog({
        contractCaseId: contract.id,
        action: "send_pdf_telegram",
        actorType: "system",
        ipAddress: requestInfo?.ip ?? contract.ipAddress ?? null,
        userAgent: requestInfo?.userAgent ?? contract.userAgent ?? null,
        meta: { pdfPath: contract.pdfArchive.pdfPath, pdfHash: contract.pdfArchive.pdfHash, telegramSent, telegramReason }
      });
    } catch (telegramError) {
      console.error("[telegram] failed to send pdf", telegramError);
      telegramReason = telegramError instanceof Error ? telegramError.message : "Telegram 傳送失敗";
      await writeAuditLog({
        contractCaseId: contract.id,
        action: "send_pdf_telegram_failed",
        actorType: "system",
        ipAddress: requestInfo?.ip ?? contract.ipAddress ?? null,
        userAgent: requestInfo?.userAgent ?? contract.userAgent ?? null,
        meta: {
          pdfPath: contract.pdfArchive.pdfPath,
          pdfHash: contract.pdfArchive.pdfHash,
          error: telegramReason
        }
      });
    }
    return {
      pdfPath: contract.pdfArchive.pdfPath,
      pdfHash: contract.pdfArchive.pdfHash,
      signedAt: contract.signedAt?.toISOString() ?? null,
      alreadyGenerated: true,
      telegramSent,
      telegramReason
    };
  }

  const snapshot = toContractSnapshot(contract);
  const signaturePath = contract.signature!.signaturePath;
  const pdfPath = path.join(process.cwd(), env.STORAGE_DIR, "contracts", contract.contractNo, "pdf", `contract-${contract.contractNo}.pdf`);

  await generateContractPdf({
    contract: contract as any,
    snapshot,
    signaturePngPath: signaturePath,
    outputPath: pdfPath
  });

  const pdfBytes = await fs.readFile(pdfPath);
  const pdfHash = sha256(pdfBytes);
  const archivedAt = new Date();
  const archiveSnapshot = {
    contractNo: contract.contractNo,
    snapshot,
    signedAt: archivedAt.toISOString(),
    pdfHash,
    ipAddress: requestInfo?.ip ?? contract.ipAddress ?? null,
    userAgent: requestInfo?.userAgent ?? contract.userAgent ?? null
  };

  await prisma.$transaction([
    prisma.contractCase.update({
      where: { id: contract.id },
      data: {
        status: "SIGNED",
        signedAt: archivedAt,
        ipAddress: requestInfo?.ip ?? contract.ipAddress ?? null,
        userAgent: requestInfo?.userAgent ?? contract.userAgent ?? null,
        pdfPath,
        pdfHash,
        archivedAt
      }
    }),
    prisma.contractPdfArchive.create({
      data: {
        contractCaseId: contract.id,
        pdfPath,
        pdfHash,
        generatedAt: archivedAt,
        snapshotJson: JSON.stringify(archiveSnapshot)
      }
    })
  ]);

  await writeAuditLog({
    contractCaseId: contract.id,
    action: "generate_pdf",
    actorType: "system",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: { pdfPath, pdfHash }
  });

  let telegramSent = false;
  let telegramReason: string | null = null;

  try {
    const telegramResult = await sendTelegramPdf({
      pdfPath,
      fileName: `contract-${contract.contractNo}.pdf`,
      caption: `契約 ${contract.contractNo} 已簽署完成，PDF 已封存。`
    });
    telegramSent = Boolean(telegramResult.sent);
    telegramReason = telegramResult.sent ? null : telegramResult.reason;
    await writeAuditLog({
      contractCaseId: contract.id,
      action: "send_pdf_telegram",
      actorType: "system",
      ipAddress: requestInfo?.ip ?? contract.ipAddress ?? null,
      userAgent: requestInfo?.userAgent ?? contract.userAgent ?? null,
      meta: { pdfPath, pdfHash, telegramSent, telegramReason }
    });
  } catch (telegramError) {
    console.error("[telegram] failed to send pdf", telegramError);
    telegramReason = telegramError instanceof Error ? telegramError.message : "Telegram 傳送失敗";
    await writeAuditLog({
      contractCaseId: contract.id,
      action: "send_pdf_telegram_failed",
      actorType: "system",
      ipAddress: requestInfo?.ip ?? contract.ipAddress ?? null,
      userAgent: requestInfo?.userAgent ?? contract.userAgent ?? null,
      meta: {
        pdfPath,
        pdfHash,
        error: telegramReason
      }
    });
  }

  await writeAuditLog({
    contractCaseId: contract.id,
    action: "complete_signing",
    actorType: "borrower",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null,
    meta: {
      signedAt: archivedAt.toISOString(),
      pdfPath,
      pdfHash
    }
  });

  return {
    pdfPath,
    pdfHash,
    signedAt: archivedAt.toISOString(),
    alreadyGenerated: false,
    telegramSent,
    telegramReason
  };
}

export async function cancelContract(id: string, requestInfo?: { ip?: string | null; userAgent?: string | null }) {
  const contract = await prisma.contractCase.findUnique({ where: { id } });
  if (!contract) throw new Error("CASE_NOT_FOUND");
  if (contract.status === "SIGNED") throw new Error("ALREADY_SIGNED");
  const updated = await prisma.contractCase.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date()
    }
  });
  await writeAuditLog({
    contractCaseId: contract.id,
    action: "cancel_case",
    actorType: "admin",
    ipAddress: requestInfo?.ip ?? null,
    userAgent: requestInfo?.userAgent ?? null
  });
  return updated;
}

export async function getPdfDownloadPath(contract: ContractCase) {
  if (contract.pdfPath) return contract.pdfPath;
  const pathName = path.join(process.cwd(), env.STORAGE_DIR, "contracts", contract.contractNo, "pdf", `contract-${contract.contractNo}.pdf`);
  return pathName;
}

export async function getPdfResponse(contract: ContractCase) {
  const pdfPath = await getPdfDownloadPath(contract);
  const bytes = await fs.readFile(pdfPath);
  return { pdfPath, bytes };
}

export async function saveGpsFromRequestBody(token: string, body: SignGpsPayload) {
  return saveGps(token, body);
}

export function buildPdfName(contractNo: string) {
  return `contract-${contractNo}.pdf`;
}

export async function ensureFinalPdf(contract: ContractCase) {
  const pdfPath = await getPdfDownloadPath(contract);
  try {
    await fs.access(pdfPath);
    return pdfPath;
  } catch {
    return null;
  }
}


