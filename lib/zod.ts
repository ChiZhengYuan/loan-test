import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const contractCreateSchema = z.object({
  lenderName: z.string().min(1).max(100),
  lenderId: z.string().min(1).max(32),
  lenderPhone: z.string().min(6).max(20),
  vehiclePlate: z.string().min(1).max(20),
  vehicleModel: z.string().min(1).max(100),
  vehicleColor: z.string().min(1).max(40),
  vehicleYear: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  borrowStartAt: z.string().datetime(),
  borrowEndAt: z.string().datetime(),
  depositAmount: z.coerce.number().nonnegative(),
  overduePenaltyPerDay: z.coerce.number().nonnegative(),
  specialTerms: z.string().min(1),
  courtJurisdiction: z.string().min(1),
  borrowerPhone: z.string().min(6).max(20),
  borrowerNameHint: z.string().max(100).optional().nullable()
});

export const borrowerProfileSchema = z.object({
  fullName: z.string().min(1).max(100),
  identityNumber: z.string().min(4).max(20),
  birthDate: z.string().date(),
  phone: z.string().min(6).max(20),
  address: z.string().min(3).max(200),
  licenseNumber: z.string().min(4).max(30)
});

const dateTimeStringSchema = z.string().min(1).refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Invalid datetime value'
});

export const signProfileSchema = borrowerProfileSchema.extend({
  vehiclePlate: z.string().min(1).max(20),
  vehicleModel: z.string().min(1).max(100),
  vehicleColor: z.string().min(1).max(40),
  vehicleYear: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  borrowStartAt: dateTimeStringSchema,
  borrowEndAt: dateTimeStringSchema
});

export const gpsSchema = z.object({
  gpsStatus: z.enum(["granted", "denied", "unavailable", "timeout", "error"]),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  capturedAt: z.string().datetime().nullable().optional(),
  errorMessage: z.string().nullable().optional()
});

export const verifyOtpSchema = z.object({
  code: z.string().length(6)
});

export const completeSchema = z.object({
  signatureDataUrl: z.string().min(1),
  signerName: z.string().min(1).max(100)
});

export const consentSchema = z.object({
  full_read: z.boolean(),
  electronic_signature: z.boolean(),
  privacy_notice: z.boolean(),
  evidence_recording: z.boolean(),
  self_signature: z.boolean()
});

export const documentMetaSchema = z.object({
  documentType: z.enum(["id_front", "license_front"]),
  fileName: z.string().min(1)
});

