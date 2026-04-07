import { NextRequest, NextResponse } from "next/server";
import { saveBorrowerDocuments } from "@/lib/contract-service";

type Params = { params: Promise<{ token: string }> };

type DocumentType = "id_front" | "license_front";

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const formData = await request.formData();
  const files: Array<{
    documentType: DocumentType;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }> = [];
  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  const maxSize = 10 * 1024 * 1024;

  for (const documentType of ["id_front", "license_front"] as const) {
    const file = formData.get(documentType);
    if (file instanceof File && file.size > 0) {
      if (!allowedMimeTypes.has(file.type)) {
        return NextResponse.json({ ok: false, error: "INVALID_FILE_TYPE" }, { status: 400 });
      }
      if (file.size > maxSize) {
        return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      files.push({
        documentType,
        fileName: file.name,
        mimeType: file.type,
        buffer
      });
    }
  }

  const uploadedTypes = new Set<DocumentType>(files.map((file) => file.documentType));
  const requiredTypes = ["id_front", "license_front"] as const;
  const missing = requiredTypes.filter((type) => !uploadedTypes.has(type));
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: "MISSING_REQUIRED_DOCUMENTS", missing }, { status: 400 });
  }

  try {
    await saveBorrowerDocuments(token, files);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DOCUMENT_UPLOAD_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
