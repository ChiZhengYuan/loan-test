import { ZodError } from "zod";

const fieldLabels: Record<string, string> = {
  fullName: "姓名",
  identityNumber: "身分證字號",
  birthDate: "出生日期",
  phone: "手機號碼",
  address: "地址",
  licenseNumber: "駕照號碼",
  vehiclePlate: "車牌",
  vehicleModel: "車型",
  vehicleColor: "顏色",
  vehicleYear: "出廠年份",
  borrowStartAt: "委託起始時間",
  borrowEndAt: "委託結束時間",
  signatureDataUrl: "簽名圖",
  signerName: "簽署人姓名",
  code: "驗證碼"
};

const appErrors: Record<string, string> = {
  CASE_NOT_FOUND: "找不到案件。",
  INVALID_CREDENTIALS: "帳號或密碼錯誤。",
  UNAUTHORIZED: "尚未登入或權限不足。",
  CASE_NOT_SIGNABLE: "此案件目前不可簽署。",
  PROFILE_NOT_COMPLETE: "請先完成基本資料。",
  CONSENTS_NOT_COMPLETE: "請先完成同意勾選。",
  OTP_NOT_VERIFIED: "請先完成驗證碼驗證。",
  OTP_NOT_SENT: "請先發送驗證碼。",
  OTP_TOO_SOON: "驗證碼尚在冷卻中，請稍後再試。",
  OTP_TOO_MANY_ATTEMPTS: "驗證碼嘗試次數過多，請稍後再試。",
  OTP_INVALID: "驗證碼錯誤。",
  INVALID_SIGNATURE: "簽名資料不正確，請重新簽名。",
  ALREADY_SIGNED: "此案件已完成簽署。",
  NOT_FOUND: "找不到資料。",
  PROFILE_SAVE_FAILED: "資料保存失敗。",
  SIGNATURE_SAVE_FAILED: "簽名保存失敗。",
  SIGNATURE_NOT_CAPTURED: "請先完成親簽。",
  COMPLETE_FAILED: "完成簽署失敗。",
  REQUEST_FAILED: "請求失敗，請稍後再試。"
};

function translateIssueMessage(issue: ZodError['issues'][number]) {
  const field = issue.path[0];
  const fieldLabel = typeof field === 'string' ? fieldLabels[field] ?? field : '欄位';
  switch (issue.code) {
    case 'too_small':
      if (issue.type === 'string') return `${fieldLabel}至少需要 ${issue.minimum} 個字元。`;
      if (issue.type === 'number') return `${fieldLabel}不得小於 ${issue.minimum}。`;
      return `${fieldLabel}資料不足。`;
    case 'too_big':
      if (issue.type === 'string') return `${fieldLabel}不得超過 ${issue.maximum} 個字元。`;
      if (issue.type === 'number') return `${fieldLabel}不得大於 ${issue.maximum}。`;
      return `${fieldLabel}資料過長。`;
    case 'invalid_string':
      if (issue.validation === 'email') return `${fieldLabel}格式不正確。`;
      if (issue.validation === 'url') return `${fieldLabel}網址格式不正確。`;
      if (issue.validation === 'datetime') return `${fieldLabel}時間格式不正確。`;
      if (issue.validation === 'date') return `${fieldLabel}日期格式不正確。`;
      return `${fieldLabel}格式不正確。`;
    case 'invalid_type':
      return `${fieldLabel}格式不正確。`;
    case 'custom':
      return `${fieldLabel}格式不正確。`;
    default:
      return `${fieldLabel}格式不正確。`;
  }
}

export function formatApiError(error: unknown, fallback = '發生錯誤。') {
  if (error instanceof ZodError) {
    return error.issues.map(translateIssueMessage).join('；');
  }
  if (error instanceof Error) {
    return appErrors[error.message] ?? fallback;
  }
  if (typeof error === 'string') {
    return appErrors[error] ?? fallback;
  }
  return fallback;
}
