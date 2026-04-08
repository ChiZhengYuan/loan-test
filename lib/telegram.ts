import fs from "fs/promises";
import { env } from "./env";

export async function sendTelegramPdf(options: {
  pdfPath: string;
  fileName: string;
  caption: string;
}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, reason: "尚未設定 Telegram 連線資訊" as const };

  const fileBytes = await fs.readFile(options.pdfPath);
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", options.caption);
  form.append("document", new Blob([fileBytes], { type: "application/pdf" }), options.fileName);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const description = data?.description ? `Telegram 傳送失敗：${data.description}` : `Telegram 傳送失敗：狀態碼 ${response.status}`;
    throw new Error(description);
  }

  return { sent: true as const, messageId: data.result?.message_id ?? null };
}
