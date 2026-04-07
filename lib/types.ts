export type ContractStatus = "PENDING_SIGN" | "SIGNED" | "CANCELLED";

export type GpsStatus = "granted" | "denied" | "unavailable" | "timeout" | "error";

export type ContractSnapshot = {
  lender: {
    name: string;
    id: string;
    phone: string;
  };
  borrowerHint: {
    name?: string | null;
    phone: string;
  };
  vehicle: {
    plate: string;
    model: string;
    color: string;
    year: number;
  };
  schedule: {
    borrowStartAt: string;
    borrowEndAt: string;
  };
  finance: {
    depositAmount: string;
    overduePenaltyPerDay: string;
  };
  terms: {
    specialTerms: string;
    courtJurisdiction: string;
  };
};

export type SignProfile = {
  fullName: string;
  identityNumber: string;
  birthDate: string;
  phone: string;
  address: string;
  licenseNumber: string;
};

export type SignGpsPayload = {
  gpsStatus: GpsStatus;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  capturedAt?: string | null;
  errorMessage?: string | null;
};

export type ConsentKey =
  | "full_read"
  | "electronic_signature"
  | "privacy_notice"
  | "evidence_recording"
  | "self_signature";

