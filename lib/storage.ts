import path from "path";
import fs from "fs/promises";
import { env } from "./env";

export const storageRoot = path.resolve(process.cwd(), env.STORAGE_DIR);
export const uploadsRoot = path.join(storageRoot, "uploads");
export const contractsRoot = path.join(storageRoot, "contracts");
export const pdfRoot = path.join(storageRoot, "pdfs");
export const signatureRoot = path.join(storageRoot, "signatures");

export async function ensureStorage() {
  await Promise.all([
    fs.mkdir(storageRoot, { recursive: true }),
    fs.mkdir(uploadsRoot, { recursive: true }),
    fs.mkdir(contractsRoot, { recursive: true }),
    fs.mkdir(pdfRoot, { recursive: true }),
    fs.mkdir(signatureRoot, { recursive: true })
  ]);
}

export function contractDir(contractNo: string) {
  return path.join(contractsRoot, contractNo);
}

export async function ensureContractDirs(contractNo: string) {
  const dir = contractDir(contractNo);
  await Promise.all([
    fs.mkdir(dir, { recursive: true }),
    fs.mkdir(path.join(dir, "documents"), { recursive: true }),
    fs.mkdir(path.join(dir, "pdf"), { recursive: true }),
    fs.mkdir(path.join(dir, "signature"), { recursive: true })
  ]);
  return dir;
}

export function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}
