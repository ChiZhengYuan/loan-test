"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { SignatureCanvas } from "./signature-canvas";
import { cn, maskId, maskPhone } from "@/lib/utils";
import { buildLegalDocumentText } from "@/lib/contract";

const steps = ["車主資料", "閱讀條款", "同意確認", "環境佐證", "驗證碼", "親簽", "完成"];
const consentItems = [
  ["full_read", "我已完整閱讀並同意本車主委託放租契約全部條款"],
  ["electronic_signature", "我同意以電子方式簽署本委託書"],
  ["privacy_notice", "我已閱讀並同意個人資料蒐集告知事項"],
  ["evidence_recording", "我同意系統記錄簽署驗證資料、簽名與操作歷程作為契約證明"],
  ["self_signature", "我確認本人親自簽署"]
] as const;

function formatTaiwanDateTime(value: string | number | Date) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${lookup("year")}/${lookup("month")}/${lookup("day")} ${lookup("dayPeriod")}${lookup("hour")}:${lookup("minute")}:${lookup("second")}`;
}

function toInputDateTime(value: string | number | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

type Props = {
  token: string;
  initial: any;
};

export function SigningWorkflow({ token, initial }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [profile, setProfile] = useState({
    fullName: initial.contract.lender?.name ?? initial.contract.lenderNameHint ?? "",
    identityNumber: "",
    birthDate: "",
    phone: initial.contract.lender?.phone ?? initial.contract.borrowerPhone ?? "",
    address: "",
    licenseNumber: "",
    vehiclePlate: initial.contract.vehicle?.plate ?? "",
    vehicleModel: initial.contract.vehicle?.model ?? "",
    vehicleColor: initial.contract.vehicle?.color ?? "",
    vehicleYear: String(initial.contract.vehicle?.year ?? ""),
    borrowStartAt: toInputDateTime(initial.contract.schedule.borrowStartAt),
    borrowEndAt: toInputDateTime(initial.contract.schedule.borrowEndAt)
  });
  const [consents, setConsents] = useState({
    full_read: false,
    electronic_signature: false,
    privacy_notice: false,
    evidence_recording: false,
    self_signature: false
  });
  const [gpsState, setGpsState] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [otpInfo, setOtpInfo] = useState<{ sentAt?: string; verified?: boolean; count?: number; mockCode?: string } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [signatureFullscreenOpen, setSignatureFullscreenOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [profileCommitted, setProfileCommitted] = useState(Boolean(initial.progress.profileComplete));
  const [consentsCommitted, setConsentsCommitted] = useState(Boolean(initial.progress.consentsComplete));
  const [gpsCommitted, setGpsCommitted] = useState(Boolean(initial.progress.gpsCaptured));
  const [signatureCommitted, setSignatureCommitted] = useState(Boolean(initial.progress.signatureCaptured));

  const liveSnapshot = useMemo(() => {
    const snapshot = initial.snapshot;
    return {
      lender: {
        ...snapshot.lender,
        name: profile.fullName || snapshot.lender.name,
        id: profile.identityNumber || snapshot.lender.id,
        phone: profile.phone || snapshot.lender.phone
      },
      borrowerHint: {
        name: (profile.fullName || snapshot.borrowerHint.name) ?? null,
        phone: profile.phone || snapshot.borrowerHint.phone
      },
      vehicle: {
        plate: profile.vehiclePlate || snapshot.vehicle.plate,
        model: profile.vehicleModel || snapshot.vehicle.model,
        color: profile.vehicleColor || snapshot.vehicle.color,
        year: Number(profile.vehicleYear) || snapshot.vehicle.year
      },
      schedule: {
        borrowStartAt: toIsoDateTime(profile.borrowStartAt) || snapshot.schedule.borrowStartAt,
        borrowEndAt: toIsoDateTime(profile.borrowEndAt) || snapshot.schedule.borrowEndAt
      },
      finance: snapshot.finance,
      terms: snapshot.terms
    };
  }, [initial.snapshot, profile]);

  const document = useMemo(() => buildLegalDocumentText(liveSnapshot, initial.contract.contractNo), [liveSnapshot, initial.contract.contractNo]);
  const sections = Array.isArray(document.sections) ? document.sections : [];
  const totalSections = sections.length;
  const canComplete = Boolean(signature && otpInfo?.verified);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setInterval(() => setOtpCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (!signatureFullscreenOpen) return;
    const originalOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    return () => {
      window.document.body.style.overflow = originalOverflow;
    };
  }, [signatureFullscreenOpen]);

  async function postJson(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "REQUEST_FAILED");
    return data;
  }

  function validateProfileDraft() {
    const requiredFields: Array<[string, string]> = [
      [profile.fullName, '姓名'],
      [profile.identityNumber, '身分證字號'],
      [profile.birthDate, '出生日期'],
      [profile.phone, '手機號碼'],
      [profile.address, '地址'],
      [profile.licenseNumber, '駕照號碼'],
      [profile.vehiclePlate, '車牌'],
      [profile.vehicleModel, '車型'],
      [profile.vehicleColor, '顏色'],
      [profile.vehicleYear, '出廠年份'],
      [profile.borrowStartAt, '委託起始時間'],
      [profile.borrowEndAt, '委託結束時間']
    ];
    const missing = requiredFields.filter(([value]) => !String(value ?? '').trim()).map(([, label]) => label);
    return missing.length ? `請先補齊：${missing.join('、')}` : null;
  }

  function updateProfileField(key: keyof typeof profile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
    setProfileCommitted(false);
  }

  function updateConsentField(key: keyof typeof consents, value: boolean) {
    setConsents((current) => ({ ...current, [key]: value }));
    setConsentsCommitted(false);
  }

  async function persistProfile() {
    const draftError = validateProfileDraft();
    if (draftError) {
      throw new Error(draftError);
    }
    const result = await postJson(`/api/sign/${token}/profile`, {
      ...profile,
      vehicleYear: Number(profile.vehicleYear),
      borrowStartAt: toIsoDateTime(profile.borrowStartAt),
      borrowEndAt: toIsoDateTime(profile.borrowEndAt)
    });
    setProfileCommitted(true);
    return result;
  }

  async function saveProfile() {
    setLoading(true);
    setStatusMessage(null);
    try {
      await persistProfile();
      setStatusMessage("資料已完成");
      setActiveStep(1);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "資料保存失敗");
    } finally {
      setLoading(false);
    }
  }

  async function persistConsents() {
    const result = await postJson(`/api/sign/${token}/consents`, consents);
    setConsentsCommitted(true);
    return result;
  }

  async function saveConsents() {
    setLoading(true);
    setStatusMessage(null);
    try {
      await persistConsents();
      setStatusMessage("同意內容已完成");
      setActiveStep(2);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "同意保存失敗");
    } finally {
      setLoading(false);
    }
  }

  async function captureGps() {
    setLoading(true);
    setStatusMessage("正在記錄佐證資料，請稍候...");
    const send = async (payload: any) => {
      const result = await postJson(`/api/sign/${token}/gps`, payload);
      setGpsState(result.gps);
      setGpsCommitted(true);
      setStatusMessage("佐證資料已完成");
      setActiveStep(3);
    };
    try {
      if (!navigator.geolocation) {
        await send({ gpsStatus: "unavailable", errorMessage: "此裝置或瀏覽器不支援定位功能" });
        return;
      }
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await send({
              gpsStatus: "granted",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString()
            });
            resolve();
          },
          async (error) => {
            await send({
              gpsStatus: error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "error",
              errorMessage: error.message
            });
            resolve();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    } catch (error) {
      await send({ gpsStatus: "error", errorMessage: error instanceof Error ? error.message : "佐證資料擷取失敗" });
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp() {
    setLoading(true);
    setStatusMessage("正在發送驗證碼，請稍候...");
    try {
      const result = await postJson(`/api/sign/${token}/send-otp`, {});
      setOtpCooldown(result.retryAfterSeconds ?? 60);
      setOtpInfo({ sentAt: result.otpSentAt, mockCode: result.mockCode });
      setStatusMessage(result.mockCode ? `驗證碼已送出：${result.mockCode}` : "驗證碼已送出");
    } catch (error) {
      setStatusMessage(error instanceof Error && error.message === "OTP_TOO_SOON" ? "驗證碼尚在冷卻中，請稍後再試" : error instanceof Error ? error.message : "驗證碼發送失敗");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setStatusMessage("正在驗證驗證碼，請稍候...");
    try {
      const result = await postJson(`/api/sign/${token}/verify-otp`, { code: otp });
      setOtpInfo((current) => ({ ...(current ?? {}), verified: result.verified, count: result.attemptCount }));
      setStatusMessage(result.verified ? "驗證碼已完成" : "驗證碼驗證失敗");
      if (result.verified) setActiveStep(4);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "驗證碼驗證失敗");
    } finally {
      setLoading(false);
    }
  }

  async function saveSignatureDraft(signatureDataUrl: string | null) {
    setSignature(signatureDataUrl);
    setSignatureCommitted(false);
  }

  async function confirmSignature(signatureDataUrl: string) {
    setLoading(true);
    setStatusMessage("正在確認簽名，請稍候...");
    try {
      await postJson(`/api/sign/${token}/signature`, {
        signatureDataUrl,
        signerName: profile.fullName
      });
      setSignature(signatureDataUrl);
      setSignatureCommitted(true);
      setStatusMessage("簽名已完成");
      setActiveStep(5);
      setSignatureFullscreenOpen(false);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "親簽保存失敗");
    } finally {
      setLoading(false);
    }
  }

  async function completeSigning() {
    setLoading(true);
    setCompleteError(null);
    setStatusMessage("正在封存簽署內容，請稍候...");
    try {
      if (!profileCommitted) {
        await persistProfile();
      }
      if (!consentsCommitted) {
        await persistConsents();
      }
      if (!gpsCommitted) {
        throw new Error("請先記錄佐證資料");
      }
      if (!otpInfo?.verified) {
        throw new Error("請先完成驗證碼驗證");
      }
      if (!signatureCommitted || !signature) {
        throw new Error("請先完成親簽");
      }
      await postJson(`/api/sign/${token}/complete`, {
        signatureDataUrl: signature,
        signerName: profile.fullName
      });
      setStatusMessage("簽署已完成，正在前往成功頁...");
      setShowConfirm(false);
      router.push(`/sign/${token}/success`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "完成失敗";
      setCompleteError(message);
      setStatusMessage(message);
    } finally {
      setLoading(false);
    }
  }

  const stepComplete = (index: number) => {
    if (index === 0) return profileCommitted;
    if (index === 1) return true;
    if (index === 2) return consentsCommitted;
    if (index === 3) return gpsCommitted;
    if (index === 4) return Boolean(otpInfo?.verified);
    if (index === 5) return signatureCommitted;
    return false;
  };

  return (
    <>
      <div className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-4 lg:px-8">
        <section className="mb-6 rounded-[24px] border border-border bg-white/90 p-4 shadow-soft sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image src="/logo-transparent.png" alt="將誠租車 Logo" width={60} height={60} className="h-14 w-14 rounded-2xl object-cover shadow-sm" priority />
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
                  <span>Vehicle Rental Commission</span>
                  <span>HTML Signing</span>
                  <span>Evidence-First</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">車主委託放租契約</div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{initial.contract.contractNo}</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  這是正式 HTML 簽署頁。你會在這裡完成車主資料填寫、契約確認、環境佐證、OTP 驗證與親簽；只有在簽署完成後，系統才會生成最終封存 PDF。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{initial.contract.status}</Badge>
                <Badge className="bg-slate-100 text-slate-700">連線記錄</Badge>
                <Badge className="bg-slate-100 text-slate-700">環境佐證</Badge>
                <Badge className="bg-slate-100 text-slate-700">OTP 驗證</Badge>
                <Badge className="bg-slate-100 text-slate-700">親簽封存</Badge>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-slate-50 p-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs text-muted-foreground">案件狀態</div>
                  <div className="mt-1 font-medium">{initial.contract.status}</div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs text-muted-foreground">條款段落</div>
                  <div className="mt-1 font-medium">{totalSections}</div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs text-muted-foreground">車輛</div>
                  <div className="mt-1 text-xs leading-5">
                    {liveSnapshot.vehicle.plate}
                    <br />
                    {liveSnapshot.vehicle.model} / {liveSnapshot.vehicle.color} / {liveSnapshot.vehicle.year}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs text-muted-foreground">委託期間</div>
                  <div className="mt-1 text-xs leading-5">
                    {formatTaiwanDateTime(liveSnapshot.schedule.borrowStartAt)}
                    <br />
                    至 {formatTaiwanDateTime(liveSnapshot.schedule.borrowEndAt)}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-6 text-emerald-900">
                車主資料與車輛資訊會即時同步到條款預覽與 PDF，方便你在手機上直接完成填寫與確認。
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((label, index) => (
            <div
              key={label}
              className={cn(
                "rounded-2xl border p-3 transition-colors sm:p-4",
                index <= activeStep ? "border-primary bg-primary/5" : "border-border bg-white"
              )}
            >
              <div className="text-xs text-muted-foreground">Step {index + 1}</div>
              <div className="mt-1 font-medium">{label}</div>
              <div className="mt-2 text-xs text-muted-foreground">{stepComplete(index) ? "已完成或可進行" : "待處理"}</div>
            </div>
          ))}
        </div>

        {statusMessage ? (
          <div className="mb-4 rounded-2xl border border-border bg-white px-4 py-3 text-sm shadow-sm">{statusMessage}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 1 車主與車輛資料</CardTitle>
                <CardDescription>請先填寫車主、車輛與委託期間，右側與條款內容會即時同步預覽。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 rounded-2xl border border-border bg-slate-50 p-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-sm font-medium">車主資料</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["fullName", "姓名"],
                        ["identityNumber", "身分證字號"],
                        ["birthDate", "出生日期"],
                        ["phone", "手機"],
                        ["licenseNumber", "駕照號碼"]
                      ].map(([key, label]) => (
                        <div className={cn("space-y-2", key === "licenseNumber" ? "sm:col-span-2" : "")} key={key}>
                          <Label>{label}</Label>
                          <Input
                            type={key === "birthDate" ? "date" : "text"}
                            value={(profile as any)[key]}
                            onChange={(e) => updateProfileField(key as keyof typeof profile, e.target.value)}
                            placeholder={label as string}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>地址</Label>
                      <Textarea
                        value={profile.address}
                        onChange={(e) => updateProfileField("address", e.target.value)}
                        className="min-h-[96px]"
                        placeholder="請輸入完整地址"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm font-medium">車輛與委託期間</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["vehiclePlate", "車牌"],
                        ["vehicleModel", "車型"],
                        ["vehicleColor", "顏色"],
                        ["vehicleYear", "出廠年份"]
                      ].map(([key, label]) => (
                        <div className="space-y-2" key={key as string}>
                          <Label>{label}</Label>
                          <Input
                            type={key === "vehicleYear" ? "number" : "text"}
                            value={(profile as any)[key]}
                            onChange={(e) => updateProfileField(key as keyof typeof profile, e.target.value)}
                            placeholder={label as string}
                          />
                        </div>
                      ))}
                      <div className="space-y-2 sm:col-span-2">
                        <Label>委託起始時間</Label>
                        <Input
                          type="datetime-local"
                          value={profile.borrowStartAt}
                          onChange={(e) => setProfile((current) => ({ ...current, borrowStartAt: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>委託結束時間</Label>
                        <Input
                          type="datetime-local"
                          value={profile.borrowEndAt}
                          onChange={(e) => setProfile((current) => ({ ...current, borrowEndAt: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">
                      你輸入的車主與車輛資料會同步更新右側摘要與條款預覽，最後封存 PDF 也會使用這份內容。
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={saveProfile} disabled={loading}>
                    {profileCommitted ? "資料已完成" : "確認資料並更新預覽"}
                  </Button>
                  <span className="text-xs text-muted-foreground">資料會封存到案件快照中，並同步更新契約內容。</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 2 車主委託放租契約</CardTitle>
                <CardDescription>請完整閱讀全文後再勾選同意項目。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-2xl border border-border bg-slate-50 p-4 text-sm leading-7 sm:p-5">
                  <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <h3 className="text-lg font-semibold">車主委託放租契約</h3>
                      <p className="mt-1 text-xs text-muted-foreground">以下為簽署當下的正式全文，請逐段閱讀。</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 text-xs text-muted-foreground">文件段落 {totalSections} 段</div>
                  </div>
                  <div className="space-y-4">
                    {sections.map((section: any, index: number) => (
                      <section key={section.title} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
                          <h4 className="font-semibold">{section.title}</h4>
                          <span className="text-xs text-muted-foreground">第 {index + 1} 段</span>
                        </div>
                        <div className="space-y-3 text-sm leading-7 text-slate-700">
                          {(Array.isArray(section.paragraphs) ? section.paragraphs : []).map((paragraph: string, paraIndex: number) => (
                            <p key={paraIndex}>{paragraph}</p>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-white p-3 text-sm">
                    <div className="text-xs text-muted-foreground">車牌</div>
                    <div className="mt-1 font-medium">{liveSnapshot.vehicle.plate}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-3 text-sm">
                    <div className="text-xs text-muted-foreground">車型</div>
                    <div className="mt-1 font-medium">{liveSnapshot.vehicle.model}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-3 text-sm">
                    <div className="text-xs text-muted-foreground">顏色 / 年份</div>
                    <div className="mt-1 text-sm">{liveSnapshot.vehicle.color} / {liveSnapshot.vehicle.year}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-3 text-sm">
                    <div className="text-xs text-muted-foreground">委託期間</div>
                    <div className="mt-1 text-sm">
                      {formatTaiwanDateTime(liveSnapshot.schedule.borrowStartAt)} - {formatTaiwanDateTime(liveSnapshot.schedule.borrowEndAt)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 3 同意勾選</CardTitle>
                <CardDescription>每一項都必須獨立勾選，系統會將其作為證據紀錄。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {consentItems.map(([key, label]) => (
                  <label key={key} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <Checkbox checked={(consents as any)[key]} onChange={(e) => updateConsentField(key, e.target.checked)} />
                    <span>{label}</span>
                  </label>
                ))}
                <Button type="button" onClick={saveConsents} disabled={loading}>{consentsCommitted ? "同意內容已完成" : "儲存同意內容"}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 4 環境佐證</CardTitle>
                <CardDescription>佐證資料為簽署輔助證明，若拒絕也會記錄狀態，不影響流程。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="rounded-xl border border-border bg-slate-50 p-3">系統將記錄簽署環境資訊作為簽署證明。</p>
                <Button type="button" onClick={captureGps} disabled={loading}>{loading ? "記錄中..." : gpsCommitted ? "佐證資料已完成" : "記錄佐證資料"}</Button>
                {gpsState ? (
                  <div className="rounded-xl border border-border bg-slate-50 p-3 text-xs">
                    <div>佐證狀態：{gpsState.gpsStatus}</div>
                    <div>位置：{gpsState.latitude ?? "-"}</div>
                    <div>位置座標：{gpsState.longitude ?? "-"}</div>
                    <div>精度值：{gpsState.accuracy ?? "-"}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 5 驗證碼驗證</CardTitle>
                <CardDescription>完成驗證碼驗證後，才可進入親簽。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button type="button" onClick={sendOtp} disabled={loading || otpCooldown > 0}>
                    {otpCooldown > 0 ? `重新發送 ${otpCooldown}s` : "發送驗證碼"}
                  </Button>
                  <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} placeholder="輸入 6 碼 OTP" className="max-w-xs" />
                  <Button type="button" onClick={verifyOtp} disabled={loading || otp.length !== 6}>{otpInfo?.verified ? "驗證碼已完成" : loading ? "驗證中..." : "驗證驗證碼"}</Button>
                </div>
                {otpInfo?.mockCode ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">驗證碼：{otpInfo.mockCode}</div> : null}
                <div className="text-xs text-muted-foreground">已送出時間：{otpInfo?.sentAt ? formatTaiwanDateTime(otpInfo.sentAt) : "尚未送出"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 6 親簽</CardTitle>
                <CardDescription>請開啟全螢幕簽名板完成親簽，完成後可進行最終封存。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">全螢幕簽名板</div>
                      <div className="text-xs leading-6 text-muted-foreground">
                        手機建議橫向使用，簽名空間會更大。完成後請返回此頁繼續送出。
                      </div>
                    </div>
                    <Button type="button" onClick={() => setSignatureFullscreenOpen(true)}>開啟全螢幕簽名</Button>
                  </div>
                  <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
                    {signature ? "已完成簽名，可重新開啟全螢幕簽名板調整或覆寫。" : "尚未簽名，請先開啟全螢幕簽名板。"}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-700">
                  簽署完成後將產生正式 PDF 合約。送出前請再次確認上方條款、OTP 與車主資料。
                </div>
                <Button type="button" onClick={() => setShowConfirm(true)} disabled={!signature || loading || !otpInfo?.verified}>送出並完成簽署</Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-6 self-start">
            <Card>
              <CardHeader>
                <CardTitle>案件資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="text-xs text-muted-foreground">契約編號</div>
                  <div className="mt-1 font-medium">{initial.contract.contractNo}</div>
                </div>
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="text-xs text-muted-foreground">甲方</div>
                  <div className="mt-1">{liveSnapshot.lender.name}</div>
                </div>
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="text-xs text-muted-foreground">甲方身分證</div>
                  <div className="mt-1">{liveSnapshot.lender.id ? maskId(liveSnapshot.lender.id) : "-"}</div>
                </div>
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="text-xs text-muted-foreground">甲方電話</div>
                  <div className="mt-1">{maskPhone(liveSnapshot.lender.phone ?? "")}</div>
                </div>
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="text-xs text-muted-foreground">車輛</div>
                  <div className="mt-1">{liveSnapshot.vehicle.plate} / {liveSnapshot.vehicle.model} / {liveSnapshot.vehicle.color} / {liveSnapshot.vehicle.year}</div>
                </div>
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="text-xs text-muted-foreground">委託期間</div>
                  <div className="mt-1 text-xs leading-5">
                    {formatTaiwanDateTime(liveSnapshot.schedule.borrowStartAt)}
                    <br />
                    至 {formatTaiwanDateTime(liveSnapshot.schedule.borrowEndAt)}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-6 text-emerald-900">
                  右側資訊會跟著你剛剛輸入的內容即時更新，方便在手機上快速校對。
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>簽署進度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>基本資料：{stepComplete(0) ? "已完成" : "未完成"}</p>
                <p>契約確認：已完成</p>
                <p>同意內容：{initial.progress.consentsComplete ? "已完成" : "未完成"}</p>
                <p>驗證碼：{initial.progress.otpVerified ? "已完成" : "未完成"}</p>
                <p>親簽：{initial.progress.signatureCaptured ? "已封存" : "未封存"}</p>
                <p>佐證：{initial.contract.gpsStatus ?? "-"}</p>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {signatureFullscreenOpen ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 p-4 text-white">
          <div className="mx-auto flex h-full max-w-6xl flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Full Screen Signature</p>
                <h3 className="text-lg font-semibold">請在下方完成親簽</h3>
                <p className="text-sm leading-6 text-slate-300">手機建議橫向，畫面會自動維持較大的簽名區；請先完成簽名，再按確認簽名。</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setSignatureFullscreenOpen(false)}>關閉簽名板</Button>
            </div>
            <div className="flex-1 rounded-3xl bg-white p-3 shadow-2xl">
              <SignatureCanvas
                onChange={saveSignatureDraft}
                onConfirm={confirmSignature}
                className="h-full"
                canvasClassName="h-[calc(100dvh-250px)] min-h-[360px] md:h-[calc(100dvh-220px)]"
                confirmLabel="確認全螢幕簽名"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
              已簽完成後，按右上角關閉回到流程頁，系統會保留簽名紀錄。
            </div>
          </div>
        </div>
      ) : null}

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">確認完成簽署</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              確認送出後，系統會封存條款、簽名、驗證紀錄與 PDF，且不可覆蓋修改。
            </p>
            {completeError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{completeError}</div>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setShowConfirm(false)} disabled={loading}>
                取消
              </Button>
              <Button type="button" onClick={completeSigning} disabled={loading}>
                {loading ? '正在封存...' : '確認送出'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
