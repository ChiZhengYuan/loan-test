import fs from "fs/promises";
import https from "https";
import { env } from "./env";

function buildMultipartBody(fields: Record<string, string>, file: { name: string; contentType: string; bytes: Buffer }) {
  const boundary = `----codex-telegram-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  const chunks: Buffer[] = [];
  const crlf = "\r\n";

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}${crlf}`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"${crlf}${crlf}`));
    chunks.push(Buffer.from(`${value}${crlf}`));
  }

  chunks.push(Buffer.from(`--${boundary}${crlf}`));
  chunks.push(Buffer.from(`Content-Disposition: form-data; name="document"; filename="${file.name}"${crlf}`));
  chunks.push(Buffer.from(`Content-Type: ${file.contentType}${crlf}${crlf}`));
  chunks.push(file.bytes);
  chunks.push(Buffer.from(crlf));
  chunks.push(Buffer.from(`--${boundary}--${crlf}`));

  return {
    boundary,
    body: Buffer.concat(chunks)
  };
}

export async function sendTelegramPdf(options: {
  pdfPath: string;
  fileName: string;
  caption: string;
}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, reason: "尚未設定 Telegram 連線資訊" as const };

  const fileBytes = await fs.readFile(options.pdfPath);
  const { boundary, body } = buildMultipartBody(
    {
      chat_id: chatId,
      caption: options.caption
    },
    {
      name: options.fileName,
      contentType: "application/pdf",
      bytes: fileBytes
    }
  );

  const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${token}/sendDocument`,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.byteLength
        }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });

  let data: any = null;
  try {
    data = JSON.parse(response.body);
  } catch {
    data = null;
  }

  if (response.statusCode < 200 || response.statusCode >= 300 || !data?.ok) {
    const description = data?.description
      ? `Telegram 傳送失敗：${data.description}`
      : `Telegram 傳送失敗：狀態碼 ${response.statusCode}`;
    throw new Error(description);
  }

  return { sent: true as const, messageId: data.result?.message_id ?? null };
}
