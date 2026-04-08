import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTelegramPdf } from "@/lib/telegram";

export async function POST(_request: NextRequest) {
  try {
    const latestArchive = await prisma.contractPdfArchive.findFirst({
      orderBy: { generatedAt: "desc" },
      include: {
        contractCase: true
      }
    });

    if (!latestArchive?.pdfPath || !latestArchive.contractCase) {
      return NextResponse.json({ ok: false, error: "找不到可測試的 PDF。" }, { status: 404 });
    }

    const telegramResult = await sendTelegramPdf({
      pdfPath: latestArchive.pdfPath,
      fileName: `contract-${latestArchive.contractCase.contractNo}.pdf`,
      caption: `測試傳送：契約 ${latestArchive.contractCase.contractNo}`
    });

    return NextResponse.json({
      ok: true,
      sent: telegramResult.sent,
      messageId: telegramResult.messageId ?? null,
      reason: telegramResult.sent ? null : telegramResult.reason,
      contractNo: latestArchive.contractCase.contractNo
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram 測試傳送失敗。";
    return NextResponse.json(
      { ok: false, error: message, detail: message },
      { status: 400 }
    );
  }
}
