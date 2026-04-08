import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import * as fontkit from "fontkit";
import { ContractCase, ContractSignature, BorrowerSnapshot } from "@prisma/client";
import { ContractSnapshot } from "./types";

type GeneratePdfArgs = {
  contract: ContractCase & {
    signature: ContractSignature | null;
    borrowerSnapshot: BorrowerSnapshot | null;
  };
  snapshot: ContractSnapshot;
  signaturePngPath: string;
  outputPath: string;
};

type FrozenDocument = {
  title?: string;
  contractNo?: string;
  specialTerms?: string;
  courtJurisdiction?: string;
  sections?: Array<{
    title: string;
    paragraphs: string[];
  }>;
};

function parseFrozenDocument(value: string | null | undefined): FrozenDocument | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as FrozenDocument;
  } catch {
    return null;
  }
}

function wrapText(text: string, maxChars: number) {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function findCjkFontPath() {
  const candidates = [
    "C:\\Windows\\Fonts\\NotoSansTC-VF.ttf",
    "C:\\Windows\\Fonts\\NotoSansHK-VF.ttf",
    "C:\\Windows\\Fonts\\simsunb.ttf",
    "C:\\Windows\\Fonts\\msjh.ttf",
    "C:\\Windows\\Fonts\\msjh.ttc",
    "C:\\Windows\\Fonts\\msjhbd.ttc",
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\simsun.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue searching
    }
  }
  return null;
}

function drawFooter(page: any, pageNo: number, totalPages: number, contractNo: string, font: any) {
  page.drawLine({ start: { x: 42, y: 34 }, end: { x: 553, y: 34 }, thickness: 0.6, color: rgb(0.83, 0.85, 0.89) });
  page.drawText(`契約編號 ${contractNo}`, {
    x: 42,
    y: 18,
    size: 8.5,
    font,
    color: rgb(0.42, 0.46, 0.54)
  });
  page.drawText(`第 ${pageNo} / ${totalPages} 頁`, {
    x: 488,
    y: 18,
    size: 8.5,
    font,
    color: rgb(0.42, 0.46, 0.54)
  });
}

export async function generateContractPdf({ contract, snapshot, signaturePngPath, outputPath }: GeneratePdfArgs) {
  const pdf = await PDFDocument.create();
  const fontPath = await findCjkFontPath();
  let regular: any;
  let bold: any;

  if (fontPath) {
    pdf.registerFontkit(fontkit as any);
    const fontBytes = await fs.readFile(fontPath);
    regular = await pdf.embedFont(fontBytes);
    bold = regular;
  } else {
    pdf.registerFontkit(fontkit as any);
    const fallbackFont = await fs.readFile(path.join(process.cwd(), "assets", "fonts", "NotoSansTC-VF.ttf")).catch(async () => {
      const fontPathCandidate = "C:\Windows\Fonts\msjh.ttc";
      return fs.readFile(fontPathCandidate);
    });
    regular = await pdf.embedFont(fallbackFont);
    bold = regular;
  }

  const frozenDocument = parseFrozenDocument(contract.clauseSnapshotJson);
  const document = frozenDocument ?? { title: "車主委託放租契約", sections: [] };

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 42;
  const bodySize = 10.4;
  const sectionTitleSize = 12.2;
  const lineGap = 15;
  const usableWidth = pageWidth - margin * 2;
  const addPage = () => pdf.addPage([pageWidth, pageHeight]);

  let page = addPage();
  let cursorY = pageHeight - margin;

  const ensureSpace = (needed = lineGap * 2) => {
    if (cursorY - needed < margin + 24) {
      page = addPage();
      cursorY = pageHeight - margin;
    }
  };

  const drawLine = (text: string, options: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) => {
    const size = options.size ?? bodySize;
    const font = options.bold ? bold : regular;
    const color = options.color ? rgb(options.color[0], options.color[1], options.color[2]) : rgb(0.09, 0.11, 0.16);
    page.drawText(text, { x: margin, y: cursorY, size, font, color });
    cursorY -= lineGap;
  };

  const drawCenteredLine = (text: string, size = bodySize, color: [number, number, number] = [0.09, 0.11, 0.16]) => {
    const font = bold;
    const width = font.widthOfTextAtSize(text, size);
    const x = Math.max(margin, pageWidth / 2 - width / 2);
    page.drawText(text, { x, y: cursorY, size, font, color: rgb(color[0], color[1], color[2]) });
    cursorY -= lineGap;
  };

  const drawWrappedParagraph = (text: string, size = bodySize) => {
    const approxChars = Math.max(30, Math.floor(usableWidth / (size * 0.52)));
    for (const line of wrapText(text, approxChars)) {
      ensureSpace();
      page.drawText(line, { x: margin, y: cursorY, size, font: regular, color: rgb(0.09, 0.11, 0.16) });
      cursorY -= lineGap;
    }
    cursorY -= 4;
  };

  const drawBullet = (label: string, value: string) => drawWrappedParagraph(`• ${label}：${value}`);

  // Cover page
  const coverTitle = "車主委託放租契約";
  const coverTitleSize = 24;
  const coverTitleWidth = bold.widthOfTextAtSize(coverTitle, coverTitleSize);
  page.drawText(coverTitle, {
    x: pageWidth / 2 - coverTitleWidth / 2,
    y: cursorY,
    size: coverTitleSize,
    font: bold,
    color: rgb(0.09, 0.15, 0.3)
  });
  cursorY -= 30;
  const coverSub = "最終封存版本";
  const coverSubWidth = bold.widthOfTextAtSize(coverSub, 12);
  page.drawText(coverSub, {
    x: pageWidth / 2 - coverSubWidth / 2,
    y: cursorY,
    size: 12,
    font: bold,
    color: rgb(0.29, 0.33, 0.4)
  });
  cursorY -= 28;

  drawLine(`契約編號：${contract.contractNo}`, { bold: true });
  drawLine(`狀態：${contract.status}`);
  drawLine(`簽署完成時間：${contract.signedAt ? format(contract.signedAt, "yyyy/MM/dd HH:mm:ss", { locale: zhTW }) : "未完成"}`);
  drawLine(`封存日期：${format(new Date(), "yyyy/MM/dd HH:mm:ss", { locale: zhTW })}`);
  cursorY -= 10;

  drawCenteredLine("一、契約摘要", 13, [0.09, 0.15, 0.3]);
  drawBullet("甲方（委託人）", `${snapshot.lender.name}（${snapshot.lender.id}）`);
  drawBullet("乙方（受託人）", `${snapshot.borrowerHint.name ?? contract.borrowerSnapshot?.fullName ?? "待定"}（${snapshot.borrowerHint.phone}）`);
  drawBullet("車輛", `${snapshot.vehicle.plate} / ${snapshot.vehicle.model} / ${snapshot.vehicle.color} / ${snapshot.vehicle.year}`);
  drawBullet("委託期間", `${format(new Date(snapshot.schedule.borrowStartAt), "yyyy/MM/dd HH:mm", { locale: zhTW })} 至 ${format(new Date(snapshot.schedule.borrowEndAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}`);
  drawBullet("逾期未還責任", "依契約與實際損失處理");
  if (snapshot.terms.specialTerms) drawBullet("特殊約定", snapshot.terms.specialTerms);
  drawBullet("管轄法院", snapshot.terms.courtJurisdiction);

  // Contract body pages
  for (const section of document.sections ?? []) {
    ensureSpace(lineGap * 4);
    drawCenteredLine(section.title, sectionTitleSize, [0.09, 0.15, 0.3]);
    for (const paragraph of section.paragraphs) {
      drawWrappedParagraph(paragraph);
    }
    cursorY -= 4;
  }

  // 證據摘要頁
  ensureSpace(180);
  drawCenteredLine("二、簽署紀錄摘要頁", 13, [0.09, 0.15, 0.3]);
  drawBullet("簽署環境來源", contract.ipAddress ?? "未記錄");
  drawBullet("裝置資訊", contract.userAgent ?? "未記錄");
  drawBullet("定位狀態", contract.gpsStatus ?? "未記錄");
  drawBullet(
    "定位資料",
    `${contract.gpsLatitude ?? "未取得"} / ${contract.gpsLongitude ?? "未取得"} / ${contract.gpsAccuracy ?? "未取得"}`
  );
  drawBullet("定位時間", contract.gpsCapturedAt ? format(contract.gpsCapturedAt, "yyyy/MM/dd HH:mm:ss", { locale: zhTW }) : "未記錄");
  drawBullet("一次性驗證碼", contract.otpVerifiedAt ? "已完成" : "未完成");
  drawBullet("驗證送出", contract.otpSentAt ? format(contract.otpSentAt, "yyyy/MM/dd HH:mm:ss", { locale: zhTW }) : "未記錄");
  drawBullet("簽名圖", contract.signature?.signaturePath ? "已封存" : "未封存");
  drawBullet("PDF SHA-256 Hash", contract.pdfHash ?? "待生成並回存系統封存紀錄");

  const signatureBytes = await fs.readFile(signaturePngPath);
  const signatureImage = await pdf.embedPng(signatureBytes);
  ensureSpace(180);
  drawCenteredLine("三、親簽圖檔", 13, [0.09, 0.15, 0.3]);
  page.drawRectangle({ x: margin, y: cursorY - 120, width: 260, height: 118, borderWidth: 0.8, borderColor: rgb(0.83, 0.85, 0.89), color: rgb(1, 1, 1) });
  page.drawImage(signatureImage, {
    x: margin + 10,
    y: cursorY - 105,
    width: 240,
    height: 90
  });
  cursorY -= 130;
  drawWrappedParagraph("乙方親簽已由 HTML 簽署頁完成，並於完成後由 server 端生成最終 PDF 封存版本。");
  drawWrappedParagraph("本檔案所載條款、簽署紀錄與快照內容均為簽署當下封存資料，不得以後續編修覆蓋原始紀錄。");

  const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.png');
  try {
    const logoBytes = await fs.readFile(logoPath);
    const logoImage = await pdf.embedPng(logoBytes);
    const logoWidth = 128;
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
    page.drawImage(logoImage, {
      x: pageWidth / 2 - logoWidth / 2,
      y: pageHeight - margin - 8 - logoHeight,
      width: logoWidth,
      height: logoHeight
    });
  } catch {
    // logo is optional; continue without it if unavailable
  }

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => drawFooter(currentPage, index + 1, pages.length, contract.contractNo, regular));

  const bytes = await pdf.save();
  await ensureDir(outputPath);
  await fs.writeFile(outputPath, bytes);
  return bytes;
}




